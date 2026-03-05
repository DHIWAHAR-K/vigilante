"""
Open WebUI Compatibility Config Endpoint

Provides a minimal /api/config endpoint compatible with Open WebUI frontend.
"""

import logging
from fastapi import APIRouter, Request
from typing import Optional

from app.config import settings
from app.core.security import decode_token
from app.database import AsyncSessionLocal
from app.models import User
from sqlalchemy import select
from uuid import UUID

log = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/config")
async def get_app_config(request: Request):
    """
    Open WebUI compatibility endpoint for frontend configuration.
    
    Returns minimal config to allow frontend to load.
    """
    user = None
    token = None

    # Try to get token from Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split("Bearer ")[1]
    
    # Try to get token from cookies
    if not token and "token" in request.cookies:
        token = request.cookies.get("token")

    # Decode token and get user if available
    if token:
        try:
            payload = decode_token(token)
            if payload and "sub" in payload:
                user_id = payload["sub"]
                async with AsyncSessionLocal() as db:
                    result = await db.execute(select(User).where(User.id == UUID(user_id)))
                    user = result.scalar_one_or_none()
        except Exception as e:
            log.debug(f"Error decoding token: {e}")

    # Count users for onboarding check
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        user_count = len(result.scalars().all())
    
    onboarding = user_count == 0

    # Return minimal config compatible with Open WebUI frontend
    config = {
        "status": True,
        "name": settings.APP_NAME,
        "version": "2.0.0",
        "default_locale": "en-US",
        "oauth": {
            "providers": {}
        },
        "features": {
            "auth": True,
            "auth_trusted_header": False,
            "enable_signup_password_confirmation": True,
            "enable_ldap": False,
            "enable_api_keys": False,
            "enable_signup": True,
            "enable_login_form": True,
            "enable_websocket": True,
            "enable_version_update_check": False,
            "enable_public_active_users_count": False,
            "enable_direct_connections": False,
            "enable_community_sharing": False,
            "enable_message_rating": False,
            "enable_folders": False,
            "enable_channels": False,
            "enable_memories": False,
            "enable_notes": False,
            "enable_user_webhooks": False,
            "enable_user_status": False,
        },
    }

    # Add onboarding flag if no users exist
    if onboarding:
        config["onboarding"] = True

    # Add user-specific config if authenticated
    if user:
        config["metadata"] = {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
            }
        }

    return config


@router.get("/api/version")
async def get_version():
    """
    Version endpoint for compatibility with Open WebUI frontend.
    """
    return {
        "version": "2.0.0",
        "deployment_id": None
    }


@router.get("/api/v1/configs/banners")
async def get_banners():
    """
    Get banners (stub for compatibility).
    """
    return []


@router.get("/api/models")
async def get_models():
    """
    Get models (stub for compatibility).
    Returns empty list - models can be configured later.
    """
    return {
        "data": []
    }
