import sqlite3
from typing import List, Optional
from datetime import datetime
from core.models.conversation import Conversation, Message, Attachment, Artifact, ConversationIndexEntry
from core.services.conversation_service import IConversationRepository

class ConversationRepository(IConversationRepository):
    def __init__(self, db_path: str):
        self.db_path = db_path

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.row_factory = sqlite3.Row
        return conn

    def get_all(self) -> List[ConversationIndexEntry]:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT id, title, created_at, updated_at, project_id FROM conversations ORDER BY updated_at DESC")
            results = []
            for row in cursor:
                results.append(ConversationIndexEntry(
                    id=row["id"],
                    title=row["title"],
                    created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.utcnow(),
                    updated_at=datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else datetime.utcnow(),
                    project_id=row["project_id"]
                ))
            return results

    def get_by_id(self, conversation_id: str) -> Optional[Conversation]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
            if not row:
                return None
                
            metadata = ConversationIndexEntry(
                id=row["id"],
                title=row["title"],
                created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.utcnow(),
                updated_at=datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else datetime.utcnow(),
                project_id=row["project_id"]
            )
            
            conv = Conversation(metadata=metadata)
            
            # Fetch Messages
            msg_cursor = conn.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC", (conversation_id,))
            for m_row in msg_cursor:
                conv.messages.append(Message(
                    id=m_row["id"],
                    conversation_id=m_row["conversation_id"],
                    parent_id=m_row["parent_id"],
                    role=m_row["role"],
                    content=m_row["content"],
                    timestamp=datetime.fromisoformat(m_row["timestamp"]) if m_row["timestamp"] else datetime.utcnow(),
                    tokens=m_row["tokens"]
                ))
                
            # Fetch Attachments
            att_cursor = conn.execute(
                "SELECT a.* FROM attachments a JOIN messages m ON a.message_id = m.id WHERE m.conversation_id = ?", 
                (conversation_id,)
            )
            for a_row in att_cursor:
                conv.attachments.append(Attachment(**dict(a_row)))

            # Fetch Artifacts
            art_cursor = conn.execute(
                "SELECT a.* FROM artifacts a JOIN messages m ON a.message_id = m.id WHERE m.conversation_id = ?", 
                (conversation_id,)
            )
            for ar_row in art_cursor:
                conv.artifacts.append(Artifact(**dict(ar_row)))

            return conv

    def save(self, conversation: Conversation) -> None:
        with self._get_connection() as conn:
            # Upsert Conversation Metadata
            conn.execute("""
                INSERT INTO conversations (id, title, created_at, updated_at, project_id)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    updated_at=excluded.updated_at,
                    project_id=excluded.project_id
            """, (
                conversation.metadata.id,
                conversation.metadata.title,
                conversation.metadata.created_at.isoformat(),
                conversation.metadata.updated_at.isoformat(),
                conversation.metadata.project_id
            ))
            
            # Upsert Messages
            for msg in conversation.messages:
                conn.execute("""
                    INSERT INTO messages (id, conversation_id, parent_id, role, content, timestamp, tokens)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        content=excluded.content,
                        tokens=excluded.tokens
                """, (
                    msg.id, msg.conversation_id, msg.parent_id, msg.role, 
                    msg.content, msg.timestamp.isoformat(), msg.tokens
                ))
            
            # Upsert Attachments
            for att in conversation.attachments:
                conn.execute("""
                    INSERT INTO attachments (id, message_id, filename, mime_type, hash, storage_path)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO NOTHING
                """, (att.id, att.message_id, att.filename, att.mime_type, att.hash, att.storage_path))

            # Upsert Artifacts
            for art in conversation.artifacts:
                conn.execute("""
                    INSERT INTO artifacts (id, message_id, filename, storage_path, type)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO NOTHING
                """, (art.id, art.message_id, art.filename, art.storage_path, art.type))

    def delete(self, conversation_id: str) -> None:
        with self._get_connection() as conn:
            conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))

    def search(self, query: str) -> List[ConversationIndexEntry]:
        # Fast indexed FTS5 semantic/keyword search
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT DISTINCT c.id, c.title, c.created_at, c.updated_at, c.project_id 
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                LEFT JOIN messages_fts fts ON m.rowid = fts.rowid
                WHERE c.title LIKE ? OR messages_fts MATCH ?
                ORDER BY c.updated_at DESC
            """, (f"%{query}%", query))
            results = []
            for row in cursor:
                results.append(ConversationIndexEntry(
                    id=row["id"],
                    title=row["title"],
                    created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.utcnow(),
                    updated_at=datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else datetime.utcnow(),
                    project_id=row["project_id"]
                ))
            return results
