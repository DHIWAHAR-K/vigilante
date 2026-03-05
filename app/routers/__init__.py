from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.chats import router as chats_router
from app.routers.council import router as council_router

__all__ = ["auth_router", "users_router", "chats_router", "council_router"]
