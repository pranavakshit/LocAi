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

    def gather_context(self, query: str, project_id: str = None, web_search: bool = False) -> List[str]:
        aggregated_context = []
        for provider in self.providers:
            try:
                # We attempt to pass optional args to the provider.
                if hasattr(provider, 'get_context'):
                    import inspect
                    sig = inspect.signature(provider.get_context)
                    kwargs = {}
                    if 'project_id' in sig.parameters:
                        kwargs['project_id'] = project_id
                    if 'web_search' in sig.parameters:
                        kwargs['web_search'] = web_search
                    aggregated_context.extend(provider.get_context(query, **kwargs))
            except Exception as e:
                import logging
                logging.error(f"Error gathering context from {type(provider).__name__}: {e}")
        return aggregated_context
