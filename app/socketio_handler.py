"""
Council Socket.IO Event Handlers

This module provides Socket.IO event handlers for real-time Council debates.
Can be used standalone or integrated with Open WebUI's socket infrastructure.
"""

import logging
from typing import Any, Dict
from uuid import UUID

from app.config import settings
from app.services.council_service import council_service
from app.services.memory_service import memory_service
from app.services.user_memory_service import user_memory_service
from app.services.document_service import document_service
from app.services.fact_extractor import extract_facts
from app.middleware.socketio_auth import get_user_from_socket
from app.middleware.rate_limiter import check_debate_rate_limit
from app.database import AsyncSessionLocal
from app.models import Chat
from app.core.security import decode_token
from sqlalchemy import select

log = logging.getLogger(__name__)


def register_council_events(sio):
    """
    Register Council-related Socket.IO events with the Open WebUI sio instance.

    Args:
        sio: The socketio.AsyncServer instance from Open WebUI
    """

    @sio.on("council:start")
    async def handle_council_start(sid, data):
        """
        Handle the start of a Council debate.

        Expected data:
            - message: str - The user's question
            - chat_id: str - The chat ID for persistence
            - token: str - JWT token for authentication (optional, can be in connection auth)
        """
        if not settings.COUNCIL_ENABLED:
            await sio.emit("council:error", {
                "message": "Council feature is disabled"
            }, room=sid)
            return

        message = data.get("message", "")
        chat_id = data.get("chat_id", "")
        selected_agents = data.get("selected_agents", None)  # list[str] | None
        rounds = max(1, min(3, int(data.get("rounds", 1))))  # 1-3 rounds
        
        if not message:
            await sio.emit("council:error", {
                "message": "No message provided"
            }, room=sid)
            return

        if not chat_id:
            await sio.emit("council:error", {
                "message": "No chat_id provided"
            }, room=sid)
            return

        # Validate selected_agents if provided
        if selected_agents is not None:
            valid_debate_ids = {a["id"] for a in settings.AGENTS if a["id"] != "synthesizer"}
            selected_agents = [a for a in selected_agents if a in valid_debate_ids]
            if len(selected_agents) == 0:
                await sio.emit("council:error", {
                    "chat_id": chat_id,
                    "message": "At least one debate agent must be selected"
                }, room=sid)
                return

        # Authenticate user (optional - can be done via connection auth)
        user = await get_user_from_socket(sid, sio)
        if user:
            # Verify chat belongs to user
            try:
                async with AsyncSessionLocal() as db:
                    result = await db.execute(
                        select(Chat).where(Chat.id == UUID(chat_id), Chat.user_id == user.id)
                    )
                    chat = result.scalar_one_or_none()
                    if not chat:
                        await sio.emit("council:error", {
                            "chat_id": chat_id,
                            "message": "Chat not found or access denied"
                        }, room=sid)
                        return
            except Exception as e:
                log.error(f"Error verifying chat ownership: {e}")
                await sio.emit("council:error", {
                    "chat_id": chat_id,
                    "message": "Error verifying chat access"
                }, room=sid)
                return

        # Rate limit: 10 debates per hour per user (or per session if unauthenticated)
        rate_limit_key = str(user.id) if user else sid
        if not check_debate_rate_limit(rate_limit_key):
            await sio.emit("council:error", {
                "chat_id": chat_id,
                "message": "Rate limit exceeded: maximum 10 debates per hour. Please wait before starting a new debate."
            }, room=sid)
            return

        log.info(f"Council debate started for chat {chat_id}: {message[:50]}...")

        # Generate title from the user's question (first 50 chars)
        if message:
            generated_title = message[:50] + ("..." if len(message) > 50 else "")
            
            # Update chat title in database if it's still "New Chat"
            try:
                async with AsyncSessionLocal() as db:
                    result = await db.execute(
                        select(Chat).where(Chat.id == UUID(chat_id))
                    )
                    chat = result.scalar_one_or_none()
                    if chat and (chat.title == "New Chat" or not chat.title):
                        chat.title = generated_title
                        await db.commit()
                        
                        # Emit title update to frontend
                        await sio.emit("council:title", {
                            "chat_id": chat_id,
                            "title": generated_title
                        }, room=sid)
                        log.info(f"Chat title updated to: {generated_title}")
            except Exception as e:
                log.error(f"Error updating chat title: {e}")

        # Note: User message is saved by the frontend via saveChatHandler
        # We only save the assistant response after debate completion

        # Map agent names to IDs for frontend compatibility
        agent_id_map = {agent["name"]: agent["id"] for agent in settings.AGENTS}

        # Define the callback to send messages via Socket.IO
        async def send_message(msg: dict):
            event_type = msg.get("type", "")
            agent_name = msg.get("agent_name", "")
            agent_id = agent_id_map.get(agent_name, agent_name.lower())

            if event_type == "agent_start":
                await sio.emit("council:agent_start", {
                    "chat_id": chat_id,
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "agent_model": msg.get("agent_model"),
                    "agent_color": msg.get("agent_color"),
                    "agent_role": msg.get("agent_role")
                }, room=sid)

            elif event_type == "agent_token":
                await sio.emit("council:agent_token", {
                    "chat_id": chat_id,
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "token": msg.get("token")
                }, room=sid)

            elif event_type == "agent_complete":
                await sio.emit("council:agent_complete", {
                    "chat_id": chat_id,
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "response": msg.get("response"),
                    "response_time_ms": msg.get("response_time_ms")
                }, room=sid)

            elif event_type == "round_start":
                await sio.emit("council:round_start", {
                    "chat_id": chat_id,
                    "round": msg.get("round"),
                    "total_rounds": msg.get("total_rounds"),
                    "follow_up": msg.get("follow_up", "")
                }, room=sid)

            elif event_type == "debate_complete":
                await sio.emit("council:complete", {
                    "chat_id": chat_id,
                    "responses": msg.get("responses"),
                    "synthesis": msg.get("synthesis"),
                    "consensus": msg.get("consensus", 75)
                }, room=sid)

        try:
            # Load conversation history for context (per-chat memory)
            # Skip for guest users — they have no DB chat, so no history
            conversation_history = ""
            if user:
                conversation_history = await memory_service.get_conversation_context(chat_id)
                if conversation_history:
                    log.info(f"Loaded conversation history for chat {chat_id}: {len(conversation_history)} chars")
                    log.debug(f"Conversation context preview: {conversation_history[:500]}...")
                else:
                    log.info(f"No conversation history for chat {chat_id} (new chat)")
            
            # Load cross-chat user memories (if user is authenticated)
            user_memories = ""
            if user:
                user_id_str = str(user.id)
                user_memories = await user_memory_service.get_user_memories(
                    user_id_str, 
                    query=message  # Use current message for relevant memory retrieval
                )
                if user_memories:
                    log.info(f"Loaded user memories for {user_id_str}: {len(user_memories)} chars")
            
            # Load document chunks for RAG (if any document uploaded for this chat)
            # Skip for guest users — they cannot upload documents
            document_context = ""
            if user:
                document_context = await document_service.retrieve_chunks(chat_id, message)
                if document_context:
                    log.info(f"Injecting document context for chat {chat_id}: {len(document_context)} chars")

            # Combine document context, user memories, and conversation history
            full_context = ""
            if document_context:
                full_context = document_context + "\n\n"
            if user_memories:
                full_context += user_memories + "\n\n"
            if conversation_history:
                full_context += conversation_history
            
            # Run the debate with streaming
            responses = await council_service.run_debate_streaming(
                message,
                send_message,
                conversation_history=full_context,
                rounds=rounds,
                selected_agents=selected_agents
            )
            log.info(f"Council debate completed for chat {chat_id}")
            # Note: Chat history (including assistant message) is saved by the frontend
            # via saveChatHandler after receiving the synthesis
            
            # Extract and store facts for cross-chat memory (if user is authenticated)
            # Only extract from user messages to avoid capturing agent identities
            if user:
                try:
                    user_id_str = str(user.id)
                    
                    # Extract facts from the user's message only
                    facts = extract_facts(message, user_id_str)
                    
                    # Store extracted facts
                    if facts:
                        stored = await user_memory_service.store_facts(user_id_str, facts)
                        log.info(f"Stored {stored} facts for user {user_id_str}")
                except Exception as e:
                    log.error(f"Error extracting/storing facts: {e}")

        except Exception as e:
            log.error(f"Council debate error: {e}", exc_info=True)
            await sio.emit("council:error", {
                "chat_id": chat_id,
                "message": str(e)
            }, room=sid)

    @sio.on("council:cancel")
    async def handle_council_cancel(sid, data):
        """
        Handle cancellation of an ongoing Council debate.

        Expected data:
            - chat_id: str - The chat ID to cancel
        """
        chat_id = data.get("chat_id", "")
        log.info(f"Council debate cancellation requested for chat {chat_id}")
        
        # Note: Actual cancellation would require tracking active debates
        # For now, just acknowledge the request
        await sio.emit("council:cancelled", {
            "chat_id": chat_id,
            "message": "Cancellation requested"
        }, room=sid)

    @sio.on("council:config")
    async def handle_council_config(sid, data):
        """
        Return the current Council configuration (agents, etc.)
        """
        await sio.emit("council:config", {
            "enabled": settings.COUNCIL_ENABLED,
            "agents": [
                {
                    "id": agent["id"],
                    "name": agent["name"],
                    "model": agent["model"],
                    "role": agent["role"],
                    "color": agent["color"]
                }
                for agent in settings.AGENTS
            ]
        }, room=sid)

    @sio.on("connect")
    async def handle_connect(sid, environ, auth):
        """Handle Socket.IO connection."""
        log.info(f"Socket.IO client connected: {sid}")
        # Store auth info if provided
        if auth and isinstance(auth, dict) and "token" in auth:
            try:
                payload = decode_token(auth["token"])
                if payload and "sub" in payload:
                    user_id = payload["sub"]
                    # Store user_id in session for later use
                    await sio.save_session(sid, {"user_id": user_id})
            except Exception as e:
                log.debug(f"Error storing auth in session: {e}")

    @sio.on("disconnect")
    async def handle_disconnect(sid):
        """Handle Socket.IO disconnection."""
        log.info(f"Socket.IO client disconnected: {sid}")

    @sio.on("heartbeat")
    async def handle_heartbeat(sid, data):
        """Handle heartbeat ping from client."""
        # Just acknowledge - keeps connection alive
        await sio.emit("heartbeat", {"status": "ok"}, room=sid)

    @sio.on("user-join")
    async def handle_user_join(sid, data):
        """Handle user-join event from Open WebUI frontend."""
        log.info(f"User-join event received from {sid}")
        # Extract token if provided
        if data and isinstance(data, dict) and "auth" in data:
            auth_data = data["auth"]
            if isinstance(auth_data, dict) and "token" in auth_data:
                try:
                    payload = decode_token(auth_data["token"])
                    if payload and "sub" in payload:
                        user_id = payload["sub"]
                        await sio.save_session(sid, {"user_id": user_id})
                        log.info(f"User {user_id} joined via Socket.IO")
                except Exception as e:
                    log.debug(f"Error processing user-join token: {e}")

    log.info("Council Socket.IO events registered")


def get_council_agents() -> list:
    """Get the list of configured Council agents."""
    return [
        {
            "id": agent["id"],
            "name": agent["name"],
            "model": agent["model"],
            "role": agent["role"],
            "color": agent["color"]
        }
        for agent in settings.AGENTS
    ]


def is_council_enabled() -> bool:
    """Check if Council feature is enabled."""
    return settings.COUNCIL_ENABLED
