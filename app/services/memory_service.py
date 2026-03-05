"""
Memory Service for Council Conversations

This module provides conversation memory management for Council chats.
It loads chat history from PostgreSQL and uses token-based compaction
to manage context limits - dropping oldest messages when exceeding
the token threshold.
"""

import logging
from typing import List
from uuid import UUID

from sqlalchemy import select

from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

from app.database import AsyncSessionLocal
from app.models import Message

log = logging.getLogger(__name__)

# Default token limit for conversation context
DEFAULT_MAX_TOKENS = 2000


class MemoryService:
    """Service for managing conversation memory with token-based compaction."""
    
    def __init__(self):
        pass
    
    async def _load_messages_from_db(self, chat_id: str) -> List[Message]:
        """Load all messages for a chat from the database."""
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Message)
                    .where(Message.chat_id == UUID(chat_id))
                    .order_by(Message.created_at)
                )
                messages = result.scalars().all()
                return list(messages)
        except Exception as e:
            log.error(f"Error loading messages for chat {chat_id}: {e}")
            return []
    
    def _convert_to_langchain_messages(self, messages: List[Message]) -> List[BaseMessage]:
        """Convert database messages to LangChain message objects."""
        langchain_messages = []
        for msg in messages:
            if msg.role == "user":
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                langchain_messages.append(AIMessage(content=msg.content))
        return langchain_messages
    
    def _format_messages_for_context(self, messages: List[BaseMessage]) -> str:
        """Format LangChain messages into a string for context."""
        lines = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                lines.append(f"User: {msg.content}")
            elif isinstance(msg, AIMessage):
                lines.append(f"Assistant: {msg.content}")
        return "\n".join(lines)
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count. ~4 chars per token for English text."""
        return len(text) // 4
    
    def _estimate_messages_tokens(self, messages: List[BaseMessage]) -> int:
        """Estimate total token count for a list of messages."""
        total = 0
        for msg in messages:
            # Add tokens for content + role prefix overhead (~10 tokens)
            total += self._estimate_tokens(msg.content) + 10
        return total
    
    def _compact_messages(
        self, 
        messages: List[BaseMessage], 
        max_tokens: int = 2000
    ) -> List[BaseMessage]:
        """
        Remove oldest messages until total tokens is under limit.
        
        Args:
            messages: List of messages to compact
            max_tokens: Maximum token count allowed
            
        Returns:
            Compacted list of messages
        """
        # Make a copy to avoid modifying original
        messages = list(messages)
        
        initial_tokens = self._estimate_messages_tokens(messages)
        
        while messages and self._estimate_messages_tokens(messages) > max_tokens:
            messages = messages[1:]  # Drop oldest message
        
        final_tokens = self._estimate_messages_tokens(messages)
        if initial_tokens != final_tokens:
            log.info(f"Compacted messages: {initial_tokens} -> {final_tokens} tokens")
        
        return messages
    
    async def get_conversation_context(
        self, 
        chat_id: str, 
        max_tokens: int = 2000
    ) -> str:
        """
        Get conversation context for a chat using token-based compaction.
        
        When conversation exceeds max_tokens, oldest messages are dropped
        until the context fits within the limit. This is deterministic and
        avoids hallucination issues from LLM summarization.
        
        Args:
            chat_id: The chat ID to load history for
            max_tokens: Maximum token count for context (default: 2000)
            
        Returns:
            Formatted conversation context string
        """
        # Load messages from database
        db_messages = await self._load_messages_from_db(chat_id)
        
        if not db_messages:
            log.info(f"No conversation history found for chat {chat_id}")
            return ""
        
        # Convert to LangChain messages
        messages = self._convert_to_langchain_messages(db_messages)
        
        if not messages:
            return ""
        
        original_count = len(messages)
        original_tokens = self._estimate_messages_tokens(messages)
        log.info(f"Loaded {original_count} messages (~{original_tokens} tokens) for chat {chat_id}")
        
        # Debug: Log the actual messages being loaded
        for i, msg in enumerate(messages):
            msg_type = "User" if isinstance(msg, HumanMessage) else "Assistant"
            log.debug(f"  Message {i}: [{msg_type}] {msg.content[:100]}...")
        
        # Compact messages if exceeding token limit
        messages = self._compact_messages(messages, max_tokens)
        
        if not messages:
            log.warning(f"All messages dropped during compaction for chat {chat_id}")
            return ""
        
        final_count = len(messages)
        if final_count < original_count:
            log.info(f"Compacted: kept {final_count}/{original_count} messages")
        
        # Format and return context
        context = self._format_messages_for_context(messages)
        return f"Previous conversation:\n{context}"
    
    async def get_message_count(self, chat_id: str) -> int:
        """Get the number of messages in a chat."""
        messages = await self._load_messages_from_db(chat_id)
        return len(messages)


# Singleton instance
memory_service = MemoryService()
