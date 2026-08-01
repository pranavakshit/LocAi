from core.events import event_bus, EVENT_CHAT_STARTED, EVENT_TOKEN_GENERATED, EVENT_CHAT_FINISHED
from core.providers import OllamaProvider
from core.context import ContextEngine
from core.context_providers.vector_store import VectorStoreContextProvider
from core.context_providers.system_time import SystemTimeProvider
from core.context_providers.web_search import WebSearchProvider

class ChatRouter:
    """
    Handles chat capabilities. Listens for chat events and routes them through
    context gathering and inference providers.
    """
    def __init__(self):
        self.inference_provider = OllamaProvider()
        
        # Setup Context Engine
        self.context_engine = ContextEngine()
        self.vector_store = VectorStoreContextProvider()
        self.context_engine.register_provider(self.vector_store)
        self.context_engine.register_provider(SystemTimeProvider())
        self.context_engine.register_provider(WebSearchProvider())

        # Subscribe to chat requests
        event_bus.subscribe(EVENT_CHAT_STARTED, self.handle_chat_request)

    def handle_chat_request(self, payload: dict):
        request_id = payload.get("request_id")
        messages = payload.get("messages", [])
        model = payload.get("model", "gemma4:e2b")

        try:
            # 1. Instant feedback for Context Gathering
            from core.events import EVENT_STATUS_UPDATE
            event_bus.emit(EVENT_STATUS_UPDATE, {"request_id": request_id, "status": "Gathering context..."})
            
            # 2. Gather Context
            user_query = messages[-1]["content"] if messages and messages[-1]["role"] == "user" else ""
            if user_query:
                context_results = self.context_engine.gather_context(user_query)
                if context_results:
                    context = "\n\n".join(context_results)
                    system_msg = f"You are LocAi. You have been provided with real-time system and internet context below. You MUST use this context to answer the user's question. Do NOT apologize or claim you cannot browse the internet, because the context below proves that you can.\n\n--- LOCAL CONTEXT ---\n{context}\n--------------------"
                    messages.insert(0, {"role": "system", "content": system_msg})
                    
            # 3. Handle Project Mode (Agent)
            is_project_mode = payload.get("project_id") is not None
            if is_project_mode:
                from core.tools import AGENT_SYSTEM_PROMPT
                messages.insert(0, {"role": "system", "content": AGENT_SYSTEM_PROMPT})

            # 4. Generate Tokens (ReAct Loop)
            max_iterations = 5
            event_bus.emit(EVENT_STATUS_UPDATE, {"request_id": request_id, "status": ""}) # Clear status before generation
            
            for i in range(max_iterations):
                full_response = ""
                for token in self.inference_provider.chat_stream(model, messages):
                    full_response += token
                    event_bus.emit(EVENT_TOKEN_GENERATED, {"request_id": request_id, "token": token})
                    
                messages.append({"role": "assistant", "content": full_response})
                
                if not is_project_mode:
                    break
                    
                from core.tools import parse_tool_call, execute_tool
                tool_name, args = parse_tool_call(full_response)
                
                if tool_name:
                    event_bus.emit(EVENT_STATUS_UPDATE, {"request_id": request_id, "status": f"Executing {tool_name}..."})
                    result = execute_tool(tool_name, args)
                    tool_response = f"<response:{tool_name}>\n{result}\n</response:{tool_name}>"
                    messages.append({"role": "user", "content": tool_response})
                    event_bus.emit(EVENT_STATUS_UPDATE, {"request_id": request_id, "status": "Thinking..."})
                else:
                    event_bus.emit(EVENT_STATUS_UPDATE, {"request_id": request_id, "status": ""})
                    break
                
        except Exception as e:
            import logging
            logging.error(f"ChatRouter Error: {e}")
            event_bus.emit(EVENT_TOKEN_GENERATED, {"request_id": request_id, "token": f"\n[Router Error] {e}\n"})
        finally:
            event_bus.emit(EVENT_CHAT_FINISHED, {"request_id": request_id})

# Initialize the singleton router so it binds to the bus
chat_router = ChatRouter()
