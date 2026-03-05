"""
Open WebUI Compatibility Auth Endpoints

Provides compatibility endpoints for Open WebUI frontend authentication.
"""

import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, AsyncSessionLocal
from app.models import User
from app.schemas.user import UserResponse, UserCreate, LoginRequest
from app.core.deps import get_optional_user, get_current_user
from app.core.security import (
    decode_token,
    create_access_token,
    create_refresh_token,
    create_guest_token,
    verify_password,
    get_password_hash,
)
from uuid import UUID, uuid4

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auths", tags=["auth-compat"])


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class SignUpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    profile_image_url: str | None = None


@router.post("/guest")
async def guest_session():
    """
    Create an anonymous guest session token (24-hour expiry, no DB user).
    Allows users to try the debate without creating an account.
    """
    session_id = str(uuid4())
    token = create_guest_token(session_id)
    return {
        "id": f"guest-{session_id}",
        "name": "Guest",
        "email": "",
        "role": "guest",
        "token": token,
        "permissions": {"chat": {"controls": True, "multiple_models": True}},
    }


@router.get("/")
async def get_session_user(
    request: Request,
    current_user: Annotated[Optional[User], Depends(get_optional_user)] = None,
):
    """
    Open WebUI compatibility endpoint for getting current session user.
    Maps to /api/v1/auths/
    Handles guest tokens without a DB lookup.
    """
    # Short-circuit for guest tokens
    raw_token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if raw_token:
        payload = decode_token(raw_token)
        if payload and payload.get("role") == "guest":
            return {
                "id": payload["sub"],
                "name": "Guest",
                "email": "",
                "role": "guest",
                "permissions": {"chat": {"controls": True, "multiple_models": True}},
            }

    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "avatar_url": current_user.avatar_url,
        "role": "user",  # Default role for compatibility
        "name": current_user.username,
        "permissions": {"chat": {"controls": True, "multiple_models": True}},
    }


@router.get("/admin/details")
async def get_admin_details(current_user: Annotated[User, Depends(get_current_user)]):
    """
    Admin details endpoint (stub for compatibility).
    """
    # For now, return empty admin details
    # Can be enhanced later if admin features are needed
    return {"admin_email": None, "show_admin_details": False}


@router.get("/admin/config")
async def get_admin_config(current_user: Annotated[User, Depends(get_current_user)]):
    """
    Admin config endpoint (stub for compatibility).
    """
    return {
        "SHOW_ADMIN_DETAILS": False,
        "ADMIN_EMAIL": None,
        "ENABLE_SIGNUP": True,
        "ENABLE_API_KEYS": False,
    }


@router.post("/signin")
async def signin(
    signin_data: SignInRequest, db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Open WebUI compatibility signin endpoint.
    Maps to /api/v1/auths/signin
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == signin_data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(signin_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(str(user.id))

    return {
        "id": str(user.id),
        "email": user.email,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "role": "user",
        "name": user.username,
        "token": token,
        "permissions": {"chat": {"controls": True, "multiple_models": True}},
    }


@router.post("/signup")
async def signup(
    signup_data: SignUpRequest, db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Open WebUI compatibility signup endpoint.
    Maps to /api/v1/auths/signup
    """
    # Check if email exists
    result = await db.execute(select(User).where(User.email == signup_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Check if username exists (use name as username)
    result = await db.execute(select(User).where(User.username == signup_data.name))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken"
        )

    # Create user
    user = User(
        email=signup_data.email,
        username=signup_data.name,
        password_hash=get_password_hash(signup_data.password),
        avatar_url=signup_data.profile_image_url,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))

    return {
        "id": str(user.id),
        "email": user.email,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "role": "user",
        "name": user.username,
        "token": token,
        "permissions": {"chat": {"controls": True, "multiple_models": True}},
    }


@router.get("/signup/enabled")
async def signup_enabled():
    """
    Check if signup is enabled (compatibility endpoint).
    """
    return {"enabled": True}


class TimezoneUpdateRequest(BaseModel):
    timezone: str


@router.post("/update/timezone")
async def update_timezone(
    timezone_data: TimezoneUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update user timezone (compatibility endpoint).
    Maps to POST /api/v1/auths/update/timezone
    """
    # For now, just return success - timezone can be stored in user settings later
    return {"status": "success", "timezone": timezone_data.timezone}
