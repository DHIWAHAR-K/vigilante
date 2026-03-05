"""
Council REST API Router

Provides HTTP endpoints for Council configuration and management.
The actual debate streaming happens over Socket.IO.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.core.deps import get_current_user
from app.database import AsyncSessionLocal
from app.models import User
from app.models.agent_vote import AgentVote
from app.models.message import Message

log = logging.getLogger(__name__)
router = APIRouter()


# Pydantic models for responses
class AgentInfo(BaseModel):
    id: str
    name: str
    model: str
    role: str
    color: str


class CouncilConfigResponse(BaseModel):
    enabled: bool
    agents: List[AgentInfo]


class CouncilToggleRequest(BaseModel):
    enabled: bool


class CouncilToggleResponse(BaseModel):
    enabled: bool
    message: str


class AgentUpdateRequest(BaseModel):
    model: Optional[str] = None
    system_prompt: Optional[str] = None


@router.get("/config", response_model=CouncilConfigResponse)
async def get_council_config():
    """
    Get the current Council configuration.

    Returns:
        - enabled: Whether Council mode is enabled
        - agents: List of configured agents with their details
    """
    agents = [
        AgentInfo(
            id=agent["id"],
            name=agent["name"],
            model=agent["model"],
            role=agent["role"],
            color=agent["color"]
        )
        for agent in settings.AGENTS
    ]

    return CouncilConfigResponse(
        enabled=settings.COUNCIL_ENABLED,
        agents=agents
    )


@router.get("/agents", response_model=List[AgentInfo])
async def get_council_agents():
    """
    Get all configured Council agents.

    Returns a list of agents with their id, name, model, role, and color.
    """
    return [
        AgentInfo(
            id=agent["id"],
            name=agent["name"],
            model=agent["model"],
            role=agent["role"],
            color=agent["color"]
        )
        for agent in settings.AGENTS
    ]


@router.get("/agents/{agent_id}", response_model=AgentInfo)
async def get_council_agent(agent_id: str):
    """
    Get a specific Council agent by ID.

    Args:
        agent_id: The agent's ID (sage, scholar, pragmatist, creative, synthesizer)

    Returns the agent's configuration.
    """
    agent = next(
        (a for a in settings.AGENTS if a["id"] == agent_id),
        None
    )

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_id}' not found"
        )

    return AgentInfo(
        id=agent["id"],
        name=agent["name"],
        model=agent["model"],
        role=agent["role"],
        color=agent["color"]
    )


@router.post("/toggle", response_model=CouncilToggleResponse)
async def toggle_council(request: CouncilToggleRequest):
    """
    Enable or disable Council mode.

    Note: This is a runtime toggle. For persistent changes,
    update the environment variable COUNCIL_ENABLED.

    Args:
        enabled: Whether to enable Council mode

    Returns confirmation of the new state.
    """
    # Note: This changes the runtime setting but doesn't persist
    # In production, you'd want to store this in a database
    settings.COUNCIL_ENABLED = request.enabled

    state = "enabled" if request.enabled else "disabled"
    log.info(f"Council mode {state}")

    return CouncilToggleResponse(
        enabled=settings.COUNCIL_ENABLED,
        message=f"Council mode {state}"
    )


class RatingRequest(BaseModel):
    message_id: str
    agent_name: str
    rating: int = Field(..., ge=1, le=5)


@router.post("/ratings")
async def submit_rating(
    req: RatingRequest,
    current_user: User = Depends(get_current_user)
):
    """Submit or update a 1-5 star rating for an agent's response."""
    try:
        msg_id = UUID(req.message_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid message_id")

    async with AsyncSessionLocal() as db:
        # Upsert: update if exists, insert otherwise
        stmt = (
            pg_insert(AgentVote)
            .values(
                message_id=msg_id,
                agent_name=req.agent_name,
                user_id=current_user.id,
                rating=req.rating
            )
            .on_conflict_do_update(
                constraint="uq_agent_vote",
                set_={"rating": req.rating}
            )
        )
        await db.execute(stmt)
        await db.commit()

    return {"message_id": req.message_id, "agent_name": req.agent_name, "rating": req.rating}


@router.get("/ratings/{chat_id}")
async def get_ratings(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all agent ratings for the most recent debate message in a chat."""
    try:
        c_id = UUID(chat_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat_id")

    async with AsyncSessionLocal() as db:
        # Get the latest assistant message in this chat
        msg_result = await db.execute(
            select(Message)
            .where(and_(Message.chat_id == c_id, Message.role == "assistant"))
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        message = msg_result.scalar_one_or_none()
        if not message:
            return {}

        # Get all votes for this message by the current user
        votes_result = await db.execute(
            select(AgentVote).where(
                and_(AgentVote.message_id == message.id, AgentVote.user_id == current_user.id)
            )
        )
        votes = votes_result.scalars().all()

    return {v.agent_name: v.rating for v in votes}


@router.get("/status")
async def get_council_status():
    """
    Get the current status of the Council service.

    Returns:
        - enabled: Whether Council is enabled
        - agent_count: Number of configured agents
        - ollama_url: The configured Ollama URL
    """
    return {
        "enabled": settings.COUNCIL_ENABLED,
        "agent_count": len(settings.AGENTS),
        "ollama_url": settings.OLLAMA_BASE_URL,
        "agents": [
            {
                "id": agent["id"],
                "name": agent["name"],
                "model": agent["model"]
            }
            for agent in settings.AGENTS
        ]
    }
