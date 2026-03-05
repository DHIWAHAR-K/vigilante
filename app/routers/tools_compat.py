"""
Open WebUI Compatibility Tools Endpoints

Provides compatibility endpoints for Open WebUI frontend tools operations.
"""

import logging
from typing import Annotated
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models import User

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/tools", tags=["tools-compat"])


@router.get("")
async def get_tools(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get tools (stub for compatibility).
    Maps to GET /api/v1/tools
    """
    # Return empty array for now - tools can be added later
    return []
