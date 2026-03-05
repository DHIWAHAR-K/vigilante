"""
Socket.IO Authentication Middleware

Handles authentication for Socket.IO connections using JWT tokens.
"""

import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import User
from app.core.security import decode_token

log = logging.getLogger(__name__)


async def authenticate_socketio(sid, environ, auth_data):
    """
    Authenticate Socket.IO connection using JWT token.
    
    This function is called when a client connects to Socket.IO.
    The token should be provided in the 'auth' field of the connection data.
    
    Args:
        sid: Socket session ID
        environ: WSGI environment dictionary
        auth_data: Authentication data from client (should contain 'token')
    
    Returns:
        bool: True if authenticated, False otherwise
    """
    try:
        # Extract token from auth data
        token = None
        if isinstance(auth_data, dict):
            token = auth_data.get("token")
        elif isinstance(auth_data, str):
            # Try to parse as JSON if it's a string
            import json
            try:
                auth_dict = json.loads(auth_data)
                token = auth_dict.get("token")
            except:
                token = auth_data
        
        if not token:
            # Anonymous guest connection — allowed, no user in session
            log.debug(f"No token for socket {sid}, allowing as guest")
            return True

        # Decode and validate token
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            log.warning(f"Invalid token for socket {sid}")
            return False

        # Guest token — valid JWT but no DB user
        if payload.get("role") == "guest":
            log.debug(f"Guest token for socket {sid}")
            return True

        # Get user from database
        user_id = payload.get("sub")
        if not user_id:
            log.warning(f"No user ID in token for socket {sid}")
            return False

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == UUID(user_id)))
            user = result.scalar_one_or_none()

            if not user:
                log.warning(f"User not found for socket {sid}")
                return False

            # Store user info in socket session
            # This will be available in event handlers via sio.get_session(sid)
            return True
            
    except Exception as e:
        log.error(f"Authentication error for socket {sid}: {e}")
        return False


async def get_user_from_socket(sid, sio) -> User | None:
    """
    Get the authenticated user for a Socket.IO session.
    
    Args:
        sid: Socket session ID
        sio: Socket.IO server instance
    
    Returns:
        User object or None if not authenticated
    """
    try:
        session = await sio.get_session(sid)
        user_id = session.get("user_id")
        if not user_id:
            return None
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == UUID(user_id)))
            return result.scalar_one_or_none()
    except Exception as e:
        log.error(f"Error getting user from socket {sid}: {e}")
        return None
