import datetime
import platform
from core.context import ContextProvider

class SystemTimeProvider(ContextProvider):
    """
    Injects the current date, time, and operating system into the context.
    This gives the LLM temporal and spatial awareness.
    """
    def get_context(self, query: str) -> list[str]:
        now = datetime.datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
        os_info = platform.system() + " " + platform.release()
        return [f"SYSTEM AWARENESS:\nThe current local time is {now}. The user is operating on a {os_info} machine."]
