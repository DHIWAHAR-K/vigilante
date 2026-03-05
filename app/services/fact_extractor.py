"""
Fact Extractor for Cross-Chat Memory

This module provides rule-based fact extraction from conversation text
using regex patterns. Extracted facts are stored for cross-chat memory.
"""

import re
import logging
from typing import List, Dict
from datetime import datetime

log = logging.getLogger(__name__)

# Regex patterns for extracting different types of facts
# Each pattern captures the relevant information in group 1
PATTERNS = {
    "name": [
        # Capture full names with 1-4 parts (first, middle, last, etc.)
        r"(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})",
        r"(?:name's|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})",
    ],
    "preference": [
        r"(?:i prefer|i like|i love|i enjoy)\s+(.+?)(?:\.|,|$)",
        r"(?:i hate|i dislike|i don't like)\s+(.+?)(?:\.|,|$)",
        r"(?:my favorite|my favourite)\s+(?:\w+\s+)?(?:is|are)\s+(.+?)(?:\.|,|$)",
    ],
    "occupation": [
        r"(?:i work as|i'm a|i am a|my job is|i work at)\s+(.+?)(?:\.|,|$)",
        r"(?:i'm an?|i am an?)\s+(engineer|developer|designer|manager|student|teacher|doctor|lawyer|writer|artist|scientist|researcher)(?:\s|\.|\,|$)",
    ],
    "project": [
        r"(?:working on|building|creating|developing|making)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\.|,|$)",
        r"(?:my project|my app|my application|my website)\s+(?:is\s+)?(?:called\s+)?(.+?)(?:\.|,|$)",
    ],
    "location": [
        r"(?:i live in|i'm from|i am from|i'm based in|located in)\s+(.+?)(?:\.|,|$)",
        r"(?:i'm in|i am in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\.|,|$)",
    ],
    "tech_stack": [
        r"(?:i use|i'm using|i work with|i code in|i program in)\s+(.+?)(?:\.|,|$)",
        r"(?:my stack|my tech stack|my tools)\s+(?:is|are|includes?)\s+(.+?)(?:\.|,|$)",
    ],
    "interest": [
        r"(?:i'm interested in|interested in|curious about|learning about)\s+(.+?)(?:\.|,|$)",
        r"(?:i want to learn|i'm learning|i am learning)\s+(.+?)(?:\.|,|$)",
    ],
    "expertise": [
        r"(?:i'm an expert in|expert in|i specialize in|i'm good at|i am good at)\s+(.+?)(?:\.|,|$)",
        r"(?:i have experience with|experienced with|familiar with)\s+(.+?)(?:\.|,|$)",
    ],
}


def extract_facts(text: str, user_id: str) -> List[Dict]:
    """
    Extract facts from text using rule-based pattern matching.
    
    Args:
        text: The text to extract facts from (conversation or synthesis)
        user_id: The user ID to associate facts with
        
    Returns:
        List of fact dictionaries with category, value, and metadata
    """
    facts = []
    text_lower = text.lower()
    
    for category, patterns in PATTERNS.items():
        for pattern in patterns:
            # Use case-insensitive matching
            matches = re.finditer(pattern, text, re.IGNORECASE)
            
            for match in matches:
                value = match.group(1).strip()
                
                # Skip very short or very long matches (likely false positives)
                if len(value) < 2 or len(value) > 100:
                    continue
                
                # Clean up the value
                value = _clean_value(value)
                
                if value:
                    fact = {
                        "user_id": user_id,
                        "category": category,
                        "value": value,
                        "source_text": match.group(0)[:100],  # Store context
                        "extracted_at": datetime.utcnow().isoformat(),
                    }
                    
                    # Avoid duplicates within same extraction
                    if not _is_duplicate(fact, facts):
                        facts.append(fact)
                        log.info(f"Extracted fact: [{category}] {value}")
    
    log.info(f"Extracted {len(facts)} facts for user {user_id}")
    return facts


def _clean_value(value: str) -> str:
    """Clean up extracted value."""
    # Remove trailing punctuation
    value = value.rstrip(".,;:!?")
    
    # Remove common filler words at the end
    filler_endings = [" and", " or", " but", " so", " that", " which"]
    for filler in filler_endings:
        if value.lower().endswith(filler):
            value = value[:-len(filler)]
    
    # Capitalize properly for names
    value = value.strip()
    
    return value


def _is_duplicate(new_fact: Dict, existing_facts: List[Dict]) -> bool:
    """Check if a fact is a duplicate of an existing one."""
    for existing in existing_facts:
        if (existing["category"] == new_fact["category"] and 
            existing["value"].lower() == new_fact["value"].lower()):
            return True
    return False


def extract_facts_from_messages(messages: List[Dict], user_id: str) -> List[Dict]:
    """
    Extract facts from a list of message dictionaries.
    
    Args:
        messages: List of message dicts with 'role' and 'content' keys
        user_id: The user ID to associate facts with
        
    Returns:
        List of extracted facts
    """
    all_facts = []
    
    for msg in messages:
        # Only extract from user messages (facts about the user)
        if msg.get("role") == "user":
            facts = extract_facts(msg.get("content", ""), user_id)
            all_facts.extend(facts)
    
    # Deduplicate across all messages
    unique_facts = []
    for fact in all_facts:
        if not _is_duplicate(fact, unique_facts):
            unique_facts.append(fact)
    
    return unique_facts
