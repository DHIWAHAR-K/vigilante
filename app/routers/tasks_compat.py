"""
Open WebUI Compatibility Tasks Endpoints

Provides compatibility endpoints for Open WebUI frontend tasks operations.
"""

import logging
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID

from app.core.deps import get_current_user
from app.models import User

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tasks", tags=["tasks-compat"])


@router.get("/chat/{chat_id}")
async def get_task_ids_by_chat_id(
    chat_id: str,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get task IDs for a chat (stub for compatibility).
    Maps to GET /api/tasks/chat/{chat_id}
    """
    try:
        chat_uuid = UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat ID")
    
    # Return empty task_ids for now - tasks can be added later
    return {"task_ids": []}
