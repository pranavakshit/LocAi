from typing import Callable, Dict, List
from collections import defaultdict
import threading

# Standard Platform Events
EVENT_CHAT_STARTED = "CHAT_STARTED"
EVENT_TOKEN_GENERATED = "TOKEN_GENERATED"
EVENT_STATUS_UPDATE = "STATUS_UPDATE"
EVENT_CHAT_FINISHED = "CHAT_FINISHED"

class EventBus:
    """
    Central Pub/Sub Event Bus for LocAi.
    Uses the Singleton pattern to ensure all subsystems share the same bus.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(EventBus, cls).__new__(cls)
                cls._instance._subscribers = defaultdict(list)
        return cls._instance

    def subscribe(self, event_type: str, callback: Callable):
        """Register a callback for a specific event type."""
        self._subscribers[event_type].append(callback)

    def unsubscribe(self, event_type: str, callback: Callable):
        """Remove a callback for a specific event type."""
        if callback in self._subscribers[event_type]:
            self._subscribers[event_type].remove(callback)

    def emit(self, event_type: str, payload: dict = None):
        """
        Emit an event to all subscribers. 
        Callbacks are executed in separate threads to prevent blocking the emitter.
        """
        if payload is None:
            payload = {}
        
        for callback in self._subscribers.get(event_type, []):
            threading.Thread(target=self._run_callback, args=(callback, payload), daemon=True).start()

    def _run_callback(self, callback, payload):
        try:
            callback(payload)
        except Exception as e:
            import logging
            logging.error(f"EventBus callback error: {e}")

# Global singleton instance
event_bus = EventBus()
