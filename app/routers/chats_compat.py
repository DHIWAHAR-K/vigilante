"""
Open WebUI Compatibility Chat Endpoints

Provides compatibility endpoints for Open WebUI frontend chat operations.
Maps /api/v1/chats/* to our /api/chats/* endpoints.
"""

import logging
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, Chat, Message, AgentResponse
from app.schemas.chat import ChatCreate, ChatResponse, ChatListResponse
from app.core.deps import get_current_user

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/chats", tags=["chats-compat"])


class CreateChatRequest(BaseModel):
    chat: Optional[dict] = None
    folder_id: Optional[str] = None


@router.get("/")
async def get_chat_list_compat(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Optional[int] = Query(None),
    include_pinned: Optional[bool] = Query(False),
    include_folders: Optional[bool] = Query(False)
):
    """
    Open WebUI compatibility endpoint for getting chat list.
    Maps to GET /api/v1/chats/
    """
    PAGE_SIZE = 50

    query = (
        select(Chat)
        .where(Chat.user_id == current_user.id)
        .order_by(Chat.updated_at.desc())
        .distinct()
    )

    if page is not None:
        offset = (page - 1) * PAGE_SIZE
        query = query.limit(PAGE_SIZE).offset(offset)

    result = await db.execute(query)
    chats = result.scalars().all()

    # Transform to Open WebUI format and ensure uniqueness by ID
    seen_ids = set()
    chat_list = []
    for chat in chats:
        chat_id = str(chat.id)
        if chat_id not in seen_ids:
            seen_ids.add(chat_id)
            chat_list.append({
                "id": chat_id,
                "title": chat.title or "New Chat",
                "created_at": int(chat.created_at.timestamp()) if chat.created_at else None,
                "updated_at": int(chat.updated_at.timestamp()) if chat.updated_at else None,
                "user_id": str(current_user.id),
                "pinned": False,  # We don't have pinned support yet
                "archived": False,  # We don't have archived support yet
                "folder_id": None,  # We don't have folders yet
                "modelfile": None,
                "shared": False,
            })

    return chat_list


@router.get("/tags")
async def get_tags_compat(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get all tags (stub for compatibility).
    """
    # Return empty array for now - tags can be added later
    return []


@router.get("/all/tags")
async def get_all_tags_compat(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get all tags (Open WebUI compatibility).
    Maps to GET /api/v1/chats/all/tags
    """
    # Return empty array for now - tags can be added later
    return []


@router.get("/pinned")
async def get_pinned_chats_compat(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get pinned chats (stub for compatibility).
    """
    # Return empty array for now - pinned chats can be added later
    return []


@router.get("/{chat_id}/tags")
async def get_tags_by_id_compat(
    chat_id: str,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get tags for a specific chat (stub for compatibility).
    Maps to GET /api/v1/chats/{chat_id}/tags
    """
    # Return empty array for now - tags can be added later
    return []


@router.get("/{chat_id}/pinned")
async def get_chat_pinned_status_compat(
    chat_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Get pinned status for a specific chat.
    Maps to GET /api/v1/chats/{chat_id}/pinned
    """
    from uuid import UUID

    try:
        chat_uuid = UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat ID")

    result = await db.execute(
        select(Chat).where(Chat.id == chat_uuid, Chat.user_id == current_user.id)
    )
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    return {"pinned": getattr(chat, 'pinned', False)}


@router.post("/{chat_id}/pin")
async def toggle_chat_pinned_compat(
    chat_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Toggle pinned status for a specific chat.
    Maps to POST /api/v1/chats/{chat_id}/pin
    """
    from uuid import UUID

    try:
        chat_uuid = UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat ID")

    result = await db.execute(
        select(Chat).where(Chat.id == chat_uuid, Chat.user_id == current_user.id)
    )
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    current_pinned = getattr(chat, 'pinned', False)
    if hasattr(chat, 'pinned'):
        chat.pinned = not current_pinned
        await db.commit()
        await db.refresh(chat)

    return {"pinned": getattr(chat, 'pinned', not current_pinned)}


@router.get("/{chat_id}")
async def get_chat_by_id_compat(
    chat_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Get chat by ID (Open WebUI compatibility).
    Maps to GET /api/v1/chats/{chat_id}
    Returns chat in Open WebUI format with nested chat object.
    """
    from uuid import UUID
    
    try:
        chat_uuid = UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat ID")
    
    result = await db.execute(
        select(Chat)
        .where(Chat.id == chat_uuid, Chat.user_id == current_user.id)
        .options(selectinload(Chat.messages).selectinload(Message.agent_responses))
    )
    chat = result.scalar_one_or_none()
    
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    # Get messages ordered by creation time
    ordered_messages = sorted(chat.messages, key=lambda m: m.created_at if m.created_at else "")
    
    # Build messages list and history structure
    messages_list = []
    history_messages = {}
    parent_id = None
    
    for msg in ordered_messages:
        message_id = str(msg.id)
        message_obj = {
            "id": message_id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "parentId": parent_id,
            "childrenIds": [],
            "done": True,  # All loaded messages are done
        }
        
        # Add debate data if this is an assistant message with agent responses
        if msg.role == "assistant" and msg.agent_responses:
            debate_rounds = []
            agent_responses_list = []
            synthesis = None
            
            for ar in msg.agent_responses:
                agent_responses_list.append({
                    "agent_name": ar.agent_name,
                    "agent_model": ar.agent_model,
                    "response": ar.response,
                    "response_time_ms": ar.response_time_ms
                })
                if ar.agent_name == "Synthesizer":
                    synthesis = ar.response
            
            if agent_responses_list:
                debate_rounds.append({
                    "responses": agent_responses_list,
                    "synthesis": synthesis,
                    "consensus": 75  # TODO: Calculate actual consensus
                })
            
            message_obj["debate"] = debate_rounds
        
        messages_list.append(message_obj)
        history_messages[message_id] = message_obj
        
        # Update parent's childrenIds
        if parent_id:
            history_messages[parent_id]["childrenIds"].append(message_id)
        
        parent_id = message_id
    
    # Build Open WebUI format response
    return {
        "id": str(chat.id),
        "user_id": str(chat.user_id),
        "title": chat.title or "New Chat",
        "created_at": int(chat.created_at.timestamp()) if chat.created_at else None,
        "updated_at": int(chat.updated_at.timestamp()) if chat.updated_at else None,
        "chat": {
            "id": str(chat.id),
            "title": chat.title or "New Chat",
            "created_at": int(chat.created_at.timestamp()) if chat.created_at else None,
            "updated_at": int(chat.updated_at.timestamp()) if chat.updated_at else None,
            "messages": messages_list,
            "history": {
                "messages": history_messages,
                "currentId": parent_id  # Last message ID
            },
            "models": [],  # Empty for now - can be configured later
            "params": {},
            "files": []
        }
    }


@router.post("/new")
async def create_new_chat_compat(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: CreateChatRequest
):
    """
    Create a new chat (Open WebUI compatibility).
    Maps to POST /api/v1/chats/new
    Saves the chat and all messages from history/messages data.
    """
    from uuid import UUID as UUIDType
    
    chat_data = request.chat or {}
    title = chat_data.get("title") or "New Chat"
    
    new_chat = Chat(
        user_id=current_user.id,
        title=title
    )
    db.add(new_chat)
    await db.flush()  # Get the chat ID before adding messages
    
    # Extract messages from the incoming data
    # Frontend sends messages in 'messages' array (flat list in order)
    messages_data = chat_data.get("messages", [])
    
    # Save each message to the database
    for msg in messages_data:
        if not msg.get("role") or msg.get("content") is None:
            continue
            
        # Try to use the message ID from frontend, or generate new one
        msg_id = None
        if msg.get("id"):
            try:
                msg_id = UUIDType(msg["id"])
            except (ValueError, TypeError):
                msg_id = None
        
        new_message = Message(
            chat_id=new_chat.id,
            role=msg["role"],
            content=msg.get("content", "")
        )
        if msg_id:
            new_message.id = msg_id
            
        db.add(new_message)
    
    await db.commit()
    await db.refresh(new_chat)
    
    return {
        "id": str(new_chat.id),
        "title": new_chat.title,
        "created_at": int(new_chat.created_at.timestamp()) if new_chat.created_at else None,
        "updated_at": int(new_chat.updated_at.timestamp()) if new_chat.updated_at else None,
        "user_id": str(new_chat.user_id),
    }


class UpdateChatRequest(BaseModel):
    chat: Optional[dict] = None


@router.post("/{chat_id}")
async def update_chat_by_id_compat(
    chat_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: UpdateChatRequest
):
    """
    Update a chat by ID (Open WebUI compatibility).
    Maps to POST /api/v1/chats/{chat_id}
    Syncs messages from the incoming history/messages data.
    """
    from uuid import UUID as UUIDType
    from datetime import datetime, timezone

    try:
        chat_uuid = UUIDType(chat_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat ID")

    result = await db.execute(
        select(Chat).where(Chat.id == chat_uuid, Chat.user_id == current_user.id)
    )
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    chat_data = request.chat or {}

    # Update title if provided
    if "title" in chat_data:
        chat.title = chat_data["title"]

    # Sync messages from incoming data
    messages_data = chat_data.get("messages", [])
    
    if messages_data:
        # Get existing message IDs for this chat
        existing_result = await db.execute(
            select(Message).where(Message.chat_id == chat_uuid)
        )
        existing_messages = {str(m.id): m for m in existing_result.scalars().all()}
        
        incoming_ids = set()
        
        for msg in messages_data:
            if not msg.get("role") or msg.get("content") is None:
                continue
            
            msg_id_str = msg.get("id")
            msg_id = None
            
            if msg_id_str:
                try:
                    msg_id = UUIDType(msg_id_str)
                    incoming_ids.add(msg_id_str)
                except (ValueError, TypeError):
                    msg_id = None
            
            if msg_id_str and msg_id_str in existing_messages:
                # Update existing message if content changed
                existing_msg = existing_messages[msg_id_str]
                if existing_msg.content != msg.get("content", ""):
                    existing_msg.content = msg.get("content", "")
            else:
                # Create new message
                new_message = Message(
                    chat_id=chat_uuid,
                    role=msg["role"],
                    content=msg.get("content", "")
                )
                if msg_id:
                    new_message.id = msg_id
                db.add(new_message)

    chat.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(chat)

    return {
        "id": str(chat.id),
        "title": chat.title or "New Chat",
        "created_at": int(chat.created_at.timestamp()) if chat.created_at else None,
        "updated_at": int(chat.updated_at.timestamp()) if chat.updated_at else None,
        "user_id": str(current_user.id),
    }


@router.delete("/{chat_id}")
async def delete_chat_by_id_compat(
    chat_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Delete a chat by ID (Open WebUI compatibility).
    Maps to DELETE /api/v1/chats/{chat_id}
    """
    from uuid import UUID

    try:
        chat_uuid = UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat ID")

    result = await db.execute(
        select(Chat).where(Chat.id == chat_uuid, Chat.user_id == current_user.id)
    )
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    await db.delete(chat)
    await db.commit()

    return {"success": True}
