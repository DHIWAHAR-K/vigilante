import json
import logging
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from starlette.websockets import WebSocketState
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, AsyncSessionLocal
from app.models import User, Chat, Message, AgentResponse
from app.services.council_service import council_service
from app.core.security import decode_token

logger = logging.getLogger(__name__)
debate_router = APIRouter()


async def get_user_from_token(token: str, db: AsyncSession) -> User | None:
    """Validate token and return user."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    return result.scalar_one_or_none()


@debate_router.websocket("/ws/debate/{chat_id}")
async def debate_websocket(
    websocket: WebSocket,
    chat_id: str,
    token: str = Query(...)
):
    """WebSocket endpoint for real-time debate streaming."""
    await websocket.accept()

    # Authenticate
    async with AsyncSessionLocal() as db:
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.send_json({"type": "error", "message": "Unauthorized"})
            await websocket.close(code=4001)
            return

        # Verify chat belongs to user
        result = await db.execute(
            select(Chat).where(Chat.id == UUID(chat_id), Chat.user_id == user.id)
        )
        chat = result.scalar_one_or_none()
        if not chat:
            await websocket.send_json({"type": "error", "message": "Chat not found"})
            await websocket.close(code=4004)
            return

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            if data.get("type") == "question":
                question = data.get("content", "")
                if not question:
                    await websocket.send_json({"type": "error", "message": "Empty question"})
                    continue

                # Create user message in database
                async with AsyncSessionLocal() as db:
                    user_message = Message(
                        chat_id=UUID(chat_id),
                        role="user",
                        content=question
                    )
                    db.add(user_message)
                    await db.commit()
                    await db.refresh(user_message)

                    # Update chat title if it's the first message
                    result = await db.execute(
                        select(Chat).where(Chat.id == UUID(chat_id))
                    )
                    chat = result.scalar_one_or_none()
                    if chat and (chat.title == "New Chat" or not chat.title):
                        chat.title = question[:50] + ("..." if len(question) > 50 else "")
                        await db.commit()

                # Send acknowledgment
                await websocket.send_json({
                    "type": "message_received",
                    "message_id": str(user_message.id)
                })

                # Define send function for streaming with connection check
                async def send_message(msg: dict):
                    if websocket.client_state == WebSocketState.CONNECTED:
                        try:
                            await websocket.send_json(msg)
                        except Exception:
                            pass  # Connection closed, ignore

                # Run debate with streaming
                responses = await council_service.run_debate_streaming(
                    question,
                    send_message
                )

                # Save assistant message and agent responses to database
                async with AsyncSessionLocal() as db:
                    # Get synthesis as the main content
                    synthesis = next(
                        (r["response"] for r in responses if r["agent_name"] == "Synthesizer"),
                        "The council has deliberated."
                    )

                    assistant_message = Message(
                        chat_id=UUID(chat_id),
                        role="assistant",
                        content=synthesis
                    )
                    db.add(assistant_message)
                    await db.flush()

                    # Save all agent responses
                    for resp in responses:
                        agent_resp = AgentResponse(
                            message_id=assistant_message.id,
                            agent_name=resp["agent_name"],
                            agent_model=resp["agent_model"],
                            response=resp["response"],
                            response_time_ms=resp.get("response_time_ms")
                        )
                        db.add(agent_resp)

                    await db.commit()

                    # Send final message saved confirmation if still connected
                    if websocket.client_state == WebSocketState.CONNECTED:
                        try:
                            await websocket.send_json({
                                "type": "message_saved",
                                "message_id": str(assistant_message.id)
                            })
                        except Exception:
                            pass  # Connection already closed

    except WebSocketDisconnect:
        logger.debug("WebSocket disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        # Only try to send error if connection is still open
        if websocket.client_state == WebSocketState.CONNECTED:
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
                await websocket.close(code=4000)
            except Exception:
                pass  # Connection already closed
