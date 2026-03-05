from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import traceback
import logging

from app.config import settings

log = logging.getLogger(__name__)
from app.database import init_db
from app.routers import auth_router, users_router, chats_router, council_router
from app.routers.documents import router as documents_router
from app.routers.config import router as config_router
from app.routers.auth_compat import router as auth_compat_router
from app.routers.chats_compat import router as chats_compat_router
from app.routers.users_compat import router as users_compat_router
from app.routers.tools_compat import router as tools_compat_router
from app.routers.folders_compat import router as folders_compat_router
from app.routers.tasks_compat import router as tasks_compat_router
from app.routers.functions_compat import router as functions_compat_router
from app.websockets import debate_router
from app.socketio_app import sio, socketio_app
from app.socketio_handler import register_council_events


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    # Register Socket.IO event handlers
    register_council_events(sio)
    yield
    # Shutdown


# Rate limiter (REST endpoints: 30 req/min per IP)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-agent debate platform built on Open WebUI where 5 AI models collaborate to answer questions",
    version="2.0.0",
    lifespan=lifespan
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Custom exception handler to ensure CORS headers on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all exceptions and ensure CORS headers are present."""
    log.error(f"Unhandled exception: {exc}")
    log.error(traceback.format_exc())
    
    # Get the origin from the request
    origin = request.headers.get("origin", "")
    
    # Build response with CORS headers
    response = JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )
    
    # Add CORS headers if origin is allowed
    if origin in settings.CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(chats_router, prefix="/api")
app.include_router(debate_router, prefix="/api")
app.include_router(council_router, prefix="/api/council", tags=["council"])
app.include_router(documents_router, prefix="/api", tags=["documents"])
# Open WebUI compatibility endpoints
app.include_router(config_router)
app.include_router(auth_compat_router)
app.include_router(chats_compat_router)
app.include_router(users_compat_router)
app.include_router(tools_compat_router)
app.include_router(folders_compat_router)
app.include_router(tasks_compat_router)
app.include_router(functions_compat_router)

# Mount Socket.IO app for real-time Council debates
app.mount("/socket.io", socketio_app)


@app.get("/")
async def root():
    return {"message": "Welcome to Council API", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
