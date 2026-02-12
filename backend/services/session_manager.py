"""
Session Manager — In-memory session/cache for IFC index data.
Supports TTL-based expiration and per-session state.
"""

import uuid
import time
import threading
from typing import Any, Optional


class SessionManager:
    """Manages session state for IFC data with TTL-based expiration."""

    def __init__(self, ttl_seconds: int = 3600):
        self._sessions: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()
        self.ttl = ttl_seconds

    def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        with self._lock:
            self._sessions[session_id] = {
                "created_at": time.time(),
                "ifc_index": None,
                "ifc_filename": None,
                "job_id": None,
                "job_status": "idle",
                "job_progress": 0,
                "job_message": "",
                "validation_results": None,
            }
        return session_id

    def get_session(self, session_id: str) -> Optional[dict[str, Any]]:
        self._cleanup_expired()
        with self._lock:
            return self._sessions.get(session_id)

    def update_session(self, session_id: str, **kwargs) -> bool:
        with self._lock:
            if session_id not in self._sessions:
                return False
            self._sessions[session_id].update(kwargs)
            return True

    def delete_session(self, session_id: str) -> bool:
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                return True
            return False

    def _cleanup_expired(self):
        now = time.time()
        with self._lock:
            expired = [
                sid for sid, data in self._sessions.items()
                if now - data["created_at"] > self.ttl
            ]
            for sid in expired:
                del self._sessions[sid]


# Global singleton
session_manager = SessionManager(ttl_seconds=3600)
