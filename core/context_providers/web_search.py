from core.context import ContextProvider

class WebSearchProvider(ContextProvider):
    """
    Silently fetches live internet results from DuckDuckGo if the user asks a question
    that requires up-to-date knowledge (detected via basic trigger keywords).
    """
    def get_context(self, query: str) -> list[str]:
        # Simple heuristic to determine if we should search the web
        triggers = ["search", "web", "latest", "news", "who won", "what is the current", "weather"]
        if not any(t in query.lower() for t in triggers):
            return []
            
        try:
            from ddgs import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=3))
                
            if not results:
                return []
                
            context = "LIVE WEB SEARCH RESULTS (Use these to answer the user):\n"
            for i, r in enumerate(results):
                context += f"Result {i+1} [{r.get('title', '')}]: {r.get('body', '')}\n"
            return [context]
        except Exception as e:
            import logging
            logging.error(f"WebSearchProvider error: {e}")
            return []
