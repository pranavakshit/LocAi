from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

def generate_uuid() -> str:
    return str(uuid.uuid4())

class ConversationIndexEntry(BaseModel):
    """Lightweight metadata for fast sidebar rendering and indexing."""
    id: str = Field(default_factory=generate_uuid)
    title: str = "New Conversation"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    project_id: Optional[str] = None

class Attachment(BaseModel):
    """User-uploaded file attached to a specific message."""
    id: str = Field(default_factory=generate_uuid)
    message_id: str
    filename: str
    mime_type: str
    hash: str
    storage_path: str

class Artifact(BaseModel):
    """AI-generated output file tied to a specific message."""
    id: str = Field(default_factory=generate_uuid)
    message_id: str
    filename: str
    storage_path: str
    type: str  # e.g., 'code', 'image', 'markdown'

class Message(BaseModel):
    """A single turn of conversation."""
    id: str = Field(default_factory=generate_uuid)
    conversation_id: str
    parent_id: Optional[str] = None  # Enables branching/regeneration trees
    role: str  # 'user', 'assistant', 'system'
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tokens: Optional[int] = None

class Conversation(BaseModel):
    """The aggregate root containing the full conversation state."""
    metadata: ConversationIndexEntry
    messages: List[Message] = Field(default_factory=list)
    attachments: List[Attachment] = Field(default_factory=list)
    artifacts: List[Artifact] = Field(default_factory=list)
