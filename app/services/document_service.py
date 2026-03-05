"""
Document Service for RAG (Retrieval-Augmented Generation)

Stores uploaded document chunks in ChromaDB collection "chat_documents".
Retrieves relevant chunks by semantic search to inject as context during debates.
"""

import io
import logging
import os
from typing import List
from uuid import uuid4

import chromadb
from chromadb.config import Settings

log = logging.getLogger(__name__)

CHROMA_DB_PATH = os.environ.get("CHROMA_DB_PATH", "./chroma_db")
COLLECTION_NAME = "chat_documents"

CHUNK_SIZE = 500
CHUNK_OVERLAP = 100
MAX_CHUNKS_TO_RETRIEVE = 3


def _chunk_text(text: str) -> List[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end])
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return [c.strip() for c in chunks if c.strip()]


def _extract_text(filename: str, content_bytes: bytes) -> str:
    """Extract plain text from PDF, TXT, or MD files."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(content_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(pages)
        except Exception as e:
            log.error(f"PDF extraction failed: {e}")
            return content_bytes.decode("utf-8", errors="replace")
    else:
        # TXT or MD: decode as UTF-8
        return content_bytes.decode("utf-8", errors="replace")


class DocumentService:
    def __init__(self):
        try:
            self.client = chromadb.PersistentClient(
                path=CHROMA_DB_PATH,
                settings=Settings(anonymized_telemetry=False)
            )
            self.collection = self.client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
            log.info(f"DocumentService initialized with ChromaDB at {CHROMA_DB_PATH}")
        except Exception as e:
            log.error(f"Failed to initialize DocumentService: {e}")
            self.client = None
            self.collection = None

    async def store_document(
        self,
        chat_id: str,
        filename: str,
        content_bytes: bytes,
        user_id: str
    ) -> dict:
        """Extract, chunk, and store document in ChromaDB. Returns summary dict."""
        if self.collection is None:
            return {"filename": filename, "chunks_stored": 0, "chat_id": chat_id, "error": "Storage unavailable"}

        # Delete any existing chunks for this chat before storing new ones
        await self.delete_chat_documents(chat_id)

        text = _extract_text(filename, content_bytes)
        if not text.strip():
            return {"filename": filename, "chunks_stored": 0, "chat_id": chat_id, "error": "No text extracted"}

        chunks = _chunk_text(text)
        if not chunks:
            return {"filename": filename, "chunks_stored": 0, "chat_id": chat_id}

        try:
            ids = [str(uuid4()) for _ in chunks]
            metadatas = [
                {
                    "chat_id": chat_id,
                    "user_id": user_id,
                    "filename": filename,
                    "chunk_index": i
                }
                for i in range(len(chunks))
            ]
            self.collection.add(documents=chunks, ids=ids, metadatas=metadatas)
            log.info(f"Stored {len(chunks)} chunks for chat {chat_id} from {filename}")
            return {"filename": filename, "chunks_stored": len(chunks), "chat_id": chat_id}
        except Exception as e:
            log.error(f"Error storing document chunks: {e}")
            return {"filename": filename, "chunks_stored": 0, "chat_id": chat_id, "error": str(e)}

    async def delete_chat_documents(self, chat_id: str) -> int:
        """Delete all document chunks for a given chat. Returns count deleted."""
        if self.collection is None:
            return 0
        try:
            results = self.collection.get(where={"chat_id": chat_id})
            ids = results.get("ids", [])
            if ids:
                self.collection.delete(ids=ids)
                log.info(f"Deleted {len(ids)} chunks for chat {chat_id}")
            return len(ids)
        except Exception as e:
            log.error(f"Error deleting document chunks for chat {chat_id}: {e}")
            return 0

    async def retrieve_chunks(self, chat_id: str, query: str) -> str:
        """
        Retrieve top-N relevant chunks for a query from a given chat's documents.
        Returns formatted string to prepend to debate context, or "" if no documents.
        """
        if self.collection is None:
            return ""
        try:
            count = self.collection.count()
            if count == 0:
                return ""

            results = self.collection.query(
                query_texts=[query],
                n_results=min(MAX_CHUNKS_TO_RETRIEVE, count),
                where={"chat_id": chat_id}
            )
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            if not docs:
                return ""

            filename = metas[0].get("filename", "uploaded document") if metas else "uploaded document"
            chunks_text = "\n\n".join(docs)
            context = f"Relevant excerpts from attached document ({filename}):\n{chunks_text}"
            log.info(f"Retrieved {len(docs)} document chunks for chat {chat_id}")
            return context
        except Exception as e:
            log.error(f"Error retrieving document chunks for chat {chat_id}: {e}")
            return ""


document_service = DocumentService()
