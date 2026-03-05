"""
Document Upload Router for RAG

POST /api/documents/upload  — upload PDF/TXT/MD, chunk+store in ChromaDB
DELETE /api/documents/{chat_id}  — remove all chunks for a chat
"""

import logging
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.deps import get_current_user
from app.models import User
from app.services.document_service import document_service

log = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    chat_id: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a document, chunk it, and store chunks in ChromaDB for RAG."""
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content_bytes = await file.read()
    if len(content_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large (max 10 MB)"
        )

    result = await document_service.store_document(
        chat_id=chat_id,
        filename=filename,
        content_bytes=content_bytes,
        user_id=str(current_user.id)
    )

    if result.get("chunks_stored", 0) == 0 and result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result["error"]
        )

    return result


@router.delete("/{chat_id}")
async def delete_documents(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove all document chunks for a given chat."""
    deleted = await document_service.delete_chat_documents(chat_id)
    return {"chat_id": chat_id, "chunks_deleted": deleted}
