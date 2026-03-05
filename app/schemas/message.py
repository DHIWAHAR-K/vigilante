from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class AgentResponseSchema(BaseModel):
    agent_name: str
    agent_model: str
    response: str
    response_time_ms: Optional[int] = None

    class Config:
        from_attributes = True


class DebateRound(BaseModel):
    responses: List[AgentResponseSchema]
    consensus: Optional[int] = None
    synthesis: Optional[str] = None


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime
    debate: Optional[List[DebateRound]] = None

    class Config:
        from_attributes = True


class MessageWithDebate(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime
    agent_responses: List[AgentResponseSchema] = []

    class Config:
        from_attributes = True
