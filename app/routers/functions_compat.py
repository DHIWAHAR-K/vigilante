"""
Open WebUI Compatibility Functions Endpoints

Provides compatibility endpoints for Open WebUI frontend functions operations.
"""

import logging
from typing import Annotated
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models import User

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/functions", tags=["functions-compat"])


@router.get("/")
async def get_functions(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get functions (stub for compatibility).
    Maps to GET /api/v1/functions/
    """
    # Return empty array for now - functions can be added later
    return []
