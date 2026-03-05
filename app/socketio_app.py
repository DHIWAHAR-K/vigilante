"""
Socket.IO ASGI Application for Council Backend

This module creates and configures the Socket.IO server instance
that will be mounted alongside FastAPI for real-time Council debates.
"""

import logging
import socketio
from app.config import settings

log = logging.getLogger(__name__)

# Create Socket.IO server with async support
sio = socketio.AsyncServer(
    cors_allowed_origins=settings.CORS_ORIGINS,
    async_mode='asgi',
    logger=settings.DEBUG,
    engineio_logger=settings.DEBUG,
    ping_timeout=60,
    ping_interval=25
)

# Create ASGI app wrapper
socketio_app = socketio.ASGIApp(sio, socketio_path="/socket.io")

log.info("Socket.IO server initialized")
