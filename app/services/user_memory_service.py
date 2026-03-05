"""
User Memory Service for Cross-Chat Memory

This module provides persistent cross-chat memory using ChromaDB vector store.
It stores user facts extracted from conversations and retrieves relevant
memories when starting new chats.
"""

import logging
import os
from typing import List, Dict, Optional
from uuid import uuid4

import chromadb
from chromadb.config import Settings

log = logging.getLogger(__name__)

# ChromaDB storage path
CHROMA_DB_PATH = os.environ.get("CHROMA_DB_PATH", "./chroma_db")

# Collection name for user memories
COLLECTION_NAME = "user_memories"

# Maximum memories to retrieve per query
MAX_MEMORIES_TO_RETRIEVE = 10


class UserMemoryService:
    """Service for managing cross-chat user memory with ChromaDB."""
    
    def __init__(self):
        """Initialize ChromaDB client and collection."""
        try:
            # Use persistent storage
            self.client = chromadb.PersistentClient(
                path=CHROMA_DB_PATH,
                settings=Settings(anonymized_telemetry=False)
            )
            
            # Get or create the user memories collection
            self.collection = self.client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"description": "Cross-chat user memories"}
            )
            
            log.info(f"ChromaDB initialized at {CHROMA_DB_PATH}")
            log.info(f"Collection '{COLLECTION_NAME}' has {self.collection.count()} documents")
        except Exception as e:
            log.error(f"Failed to initialize ChromaDB: {e}")
            self.client = None
            self.collection = None
    
    async def store_facts(self, user_id: str, facts: List[Dict]) -> int:
        """
        Store extracted facts in the vector database.
        
        Args:
            user_id: The user ID to associate facts with
            facts: List of fact dictionaries from fact_extractor
            
        Returns:
            Number of facts stored
        """
        if not self.collection or not facts:
            return 0
        
        stored_count = 0
        
        for fact in facts:
            try:
                # Create a document string that includes category for better retrieval
                document = f"{fact['category']}: {fact['value']}"
                
                # Generate a unique ID for this fact
                fact_id = f"{user_id}_{fact['category']}_{uuid4().hex[:8]}"
                
                # Check if this exact fact already exists for this user
                existing = self.collection.get(
                    where={
                        "$and": [
                            {"user_id": {"$eq": user_id}},
                            {"category": {"$eq": fact['category']}},
                            {"value": {"$eq": fact['value']}}
                        ]
                    }
                )
                
                if existing and existing['ids']:
                    log.debug(f"Fact already exists: {document}")
                    continue
                
                # Store the fact with metadata
                self.collection.add(
                    ids=[fact_id],
                    documents=[document],
                    metadatas=[{
                        "user_id": user_id,
                        "category": fact['category'],
                        "value": fact['value'],
                        "source_text": fact.get('source_text', ''),
                        "extracted_at": fact.get('extracted_at', ''),
                    }]
                )
                
                stored_count += 1
                log.info(f"Stored fact for user {user_id}: {document}")
                
            except Exception as e:
                log.error(f"Error storing fact: {e}")
                continue
        
        log.info(f"Stored {stored_count}/{len(facts)} facts for user {user_id}")
        return stored_count
    
    async def get_user_memories(
        self, 
        user_id: str, 
        query: Optional[str] = None,
        max_results: int = MAX_MEMORIES_TO_RETRIEVE
    ) -> str:
        """
        Retrieve relevant memories for a user.
        
        Args:
            user_id: The user ID to retrieve memories for
            query: Optional query to find relevant memories (uses semantic search)
            max_results: Maximum number of memories to retrieve
            
        Returns:
            Formatted string of user memories for injection into prompts
        """
        if not self.collection:
            return ""
        
        try:
            if query:
                # Semantic search for relevant memories
                results = self.collection.query(
                    query_texts=[query],
                    where={"user_id": {"$eq": user_id}},
                    n_results=max_results
                )
            else:
                # Get all memories for the user
                results = self.collection.get(
                    where={"user_id": {"$eq": user_id}},
                    limit=max_results
                )
            
            # Format the results
            if not results or not results.get('documents'):
                log.info(f"No memories found for user {user_id}")
                return ""
            
            # Handle different result formats from query vs get
            documents = results.get('documents', [])
            if documents and isinstance(documents[0], list):
                # Query returns nested list
                documents = documents[0]
            
            metadatas = results.get('metadatas', [])
            if metadatas and isinstance(metadatas[0], list):
                metadatas = metadatas[0]
            
            if not documents:
                return ""
            
            # Group by category for cleaner output
            categorized = {}
            for i, doc in enumerate(documents):
                if metadatas and i < len(metadatas):
                    category = metadatas[i].get('category', 'general')
                    value = metadatas[i].get('value', doc)
                else:
                    category = 'general'
                    value = doc
                
                if category not in categorized:
                    categorized[category] = []
                categorized[category].append(value)
            
            # Format as readable text
            lines = ["Known information about this user:"]
            for category, values in categorized.items():
                category_name = category.replace('_', ' ').title()
                for value in values:
                    lines.append(f"- {category_name}: {value}")
            
            memory_text = "\n".join(lines)
            log.info(f"Retrieved {len(documents)} memories for user {user_id}")
            
            return memory_text
            
        except Exception as e:
            log.error(f"Error retrieving memories for user {user_id}: {e}")
            return ""
    
    async def get_memory_count(self, user_id: str) -> int:
        """Get the number of stored memories for a user."""
        if not self.collection:
            return 0
        
        try:
            results = self.collection.get(
                where={"user_id": {"$eq": user_id}}
            )
            return len(results.get('ids', []))
        except Exception as e:
            log.error(f"Error getting memory count: {e}")
            return 0
    
    async def clear_user_memories(self, user_id: str) -> int:
        """
        Clear all memories for a specific user.
        
        Args:
            user_id: The user ID to clear memories for
            
        Returns:
            Number of memories deleted
        """
        if not self.collection:
            return 0
        
        try:
            # Get all IDs for this user
            results = self.collection.get(
                where={"user_id": {"$eq": user_id}}
            )
            
            ids_to_delete = results.get('ids', [])
            
            if ids_to_delete:
                self.collection.delete(ids=ids_to_delete)
                log.info(f"Cleared {len(ids_to_delete)} memories for user {user_id}")
            
            return len(ids_to_delete)
            
        except Exception as e:
            log.error(f"Error clearing memories for user {user_id}: {e}")
            return 0


# Singleton instance
user_memory_service = UserMemoryService()
