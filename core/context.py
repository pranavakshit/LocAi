import abc
from typing import List

class ContextProvider(abc.ABC):
    """
    Abstract base class for any module that can provide context for a user query.
    """
    @abc.abstractmethod
    def get_context(self, query: str, project_id: str = None) -> List[str]:
        pass

class ContextEngine:
    """
    Manages multiple context providers and aggregates their context.
    """
    def __init__(self):
        self.providers: List[ContextProvider] = []

    def register_provider(self, provider: ContextProvider):
        self.providers.append(provider)

    def gather_context(self, query: str, project_id: str = None) -> List[str]:
        aggregated_context = []
        for provider in self.providers:
            try:
                # We attempt to pass project_id to the provider.
                # In Python, we could check signature, but here we expect our providers to accept it.
                if hasattr(provider, 'get_context'):
                    import inspect
                    sig = inspect.signature(provider.get_context)
                    if 'project_id' in sig.parameters:
                        aggregated_context.extend(provider.get_context(query, project_id=project_id))
                    else:
                        aggregated_context.extend(provider.get_context(query))
            except Exception as e:
                import logging
                logging.error(f"Error gathering context from {type(provider).__name__}: {e}")
        return aggregated_context
