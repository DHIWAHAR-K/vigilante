"""
Socket.IO in-memory rate limiter for Council debates.

Sliding window: tracks timestamps of recent `council:start` events per user.
Limit: 10 debates per hour per user_id.
"""

import time
import logging
from collections import defaultdict

log = logging.getLogger(__name__)

# Sliding window: user_id -> list of unix timestamps (float)
_debate_timestamps: dict[str, list[float]] = defaultdict(list)

WINDOW_SECONDS = 3600  # 1 hour
MAX_DEBATES_PER_WINDOW = 10


def check_debate_rate_limit(user_id: str) -> bool:
    """
    Check if the user is within the debate rate limit.

    Returns True if allowed, False if rate limited.
    Cleans up old timestamps automatically.
    """
    now = time.time()
    cutoff = now - WINDOW_SECONDS

    # Drop timestamps outside the sliding window
    _debate_timestamps[user_id] = [
        ts for ts in _debate_timestamps[user_id] if ts > cutoff
    ]

    if len(_debate_timestamps[user_id]) >= MAX_DEBATES_PER_WINDOW:
        log.warning(
            f"Rate limit exceeded for user {user_id}: "
            f"{len(_debate_timestamps[user_id])} debates in the last hour"
        )
        return False

    # Record this debate
    _debate_timestamps[user_id].append(now)
    return True


def remaining_debates(user_id: str) -> int:
    """Return how many debates remain in the current window."""
    now = time.time()
    cutoff = now - WINDOW_SECONDS
    recent = [ts for ts in _debate_timestamps[user_id] if ts > cutoff]
    return max(0, MAX_DEBATES_PER_WINDOW - len(recent))
