"""
Open WebUI Compatibility Folders Endpoints

Provides compatibility endpoints for Open WebUI frontend folders operations.
"""

import logging
from typing import Annotated
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models import User

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/folders", tags=["folders-compat"])


@router.get("/")
async def get_folders(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get folders (stub for compatibility).
    Maps to GET /api/v1/folders/
    """
    # Return empty array for now - folders can be added later
    return []
