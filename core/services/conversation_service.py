from typing import List, Optional, Protocol
from core.models.conversation import Conversation, Message, Attachment, Artifact, ConversationIndexEntry

class IConversationRepository(Protocol):
    """Abstract interface for the storage layer (to be implemented in Phase 3)."""
    def get_all(self) -> List[ConversationIndexEntry]: ...
    def get_by_id(self, conversation_id: str) -> Optional[Conversation]: ...
    def save(self, conversation: Conversation) -> None: ...
    def delete(self, conversation_id: str) -> None: ...
    def search(self, query: str) -> List[ConversationIndexEntry]: ...

class ConversationService:
    """
    The Runtime Conversation Service.
    Acts as the sole interface for the Runtime to manage conversations.
    """
    def __init__(self, repository: IConversationRepository):
        self.repo = repository

    def create_conversation(self, title: str = "New Conversation", project_id: Optional[str] = None) -> Conversation:
        metadata = ConversationIndexEntry(title=title, project_id=project_id)
        conv = Conversation(metadata=metadata)
        self.repo.save(conv)
        return conv

    def load_conversation(self, conversation_id: str) -> Optional[Conversation]:
        return self.repo.get_by_id(conversation_id)

    def save_conversation(self, conversation: Conversation) -> None:
        self.repo.save(conversation)

    def append_message(self, conversation_id: str, message: Message) -> None:
        conv = self.load_conversation(conversation_id)
        if conv:
            conv.messages.append(message)
            self.repo.save(conv)

    def rename_conversation(self, conversation_id: str, new_title: str) -> None:
        conv = self.load_conversation(conversation_id)
        if conv:
            conv.metadata.title = new_title
            self.repo.save(conv)

    def delete_conversation(self, conversation_id: str) -> None:
        self.repo.delete(conversation_id)

    def archive_conversation(self, conversation_id: str) -> None:
        pass

    def pin_conversation(self, conversation_id: str) -> None:
        pass

    def search_conversation(self, query: str) -> List[ConversationIndexEntry]:
        return self.repo.search(query)

    def generate_title(self, conversation_id: str) -> str:
        new_title = "Generated Title"
        self.rename_conversation(conversation_id, new_title)
        return new_title

    def attach_file(self, conversation_id: str, attachment: Attachment) -> None:
        conv = self.load_conversation(conversation_id)
        if conv:
            conv.attachments.append(attachment)
            self.repo.save(conv)

    def attach_artifact(self, conversation_id: str, artifact: Artifact) -> None:
        conv = self.load_conversation(conversation_id)
        if conv:
            conv.artifacts.append(artifact)
            self.repo.save(conv)

    def export_conversation(self, conversation_id: str, format: str = "json") -> str:
        conv = self.load_conversation(conversation_id)
        if conv and format == "json":
            return conv.model_dump_json()
        return ""

    def import_conversation(self, data: str, format: str = "json") -> Optional[Conversation]:
        if format == "json":
            conv = Conversation.model_validate_json(data)
            self.repo.save(conv)
            return conv
        return None
