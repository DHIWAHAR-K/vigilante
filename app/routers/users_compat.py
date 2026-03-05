"""
Open WebUI Compatibility User Endpoints

Provides compatibility endpoints for Open WebUI frontend user operations.
"""

import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.models import User

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/users", tags=["users-compat"])


class UserSettingsUpdate(BaseModel):
    ui: Optional[dict] = None


@router.get("/user/settings")
async def get_user_settings(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get user settings (Open WebUI compatibility).
    Maps to GET /api/v1/users/user/settings
    """
    # Return default settings structure
    return {
        "ui": {
            "textScale": 1.0,
            "theme": "dark",
            "language": "en-US"
        }
    }


@router.post("/user/settings/update")
async def update_user_settings(
    current_user: Annotated[User, Depends(get_current_user)],
    settings: UserSettingsUpdate
):
    """
    Update user settings (stub for compatibility).
    Maps to POST /api/v1/users/user/settings/update
    """
    # For now, just return success
    # Settings can be persisted later if needed
    return {
        "ui": settings.ui or {}
    }
