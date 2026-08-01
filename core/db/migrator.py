import os
import json
from datetime import datetime
from typing import Dict, Any
from core.models.conversation import Conversation, Message, ConversationIndexEntry
from core.services.conversation_service import ConversationService
import uuid

_user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
USERDATA_DIR = os.path.join(_user_profile, "LocAi", "userdata")
SESSIONS_FILE = os.path.join(USERDATA_DIR, 'sessions.json')
LEGACY_BACKUP = os.path.join(USERDATA_DIR, 'sessions_legacy.json.bak')

class LegacyMigrator:
    def __init__(self, service: ConversationService):
        self.service = service

    def run(self):
        if not os.path.exists(SESSIONS_FILE):
            return
            
        print("Starting legacy sessions.json migration...")
        try:
            with open(SESSIONS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            for sess_id, sess_data in data.items():
                metadata = ConversationIndexEntry(
                    id=sess_id,
                    title=sess_data.get("name", "Legacy Conversation"),
                    created_at=datetime.fromtimestamp(sess_data.get("updated_at", 0)),
                    updated_at=datetime.fromtimestamp(sess_data.get("updated_at", 0)),
                    project_id=sess_data.get("project_id")
                )
                
                conv = Conversation(metadata=metadata)
                
                # Migrating messages
                parent_id = None
                for idx, msg in enumerate(sess_data.get("messages", [])):
                    msg_id = msg.get("id", str(uuid.uuid4()))
                    conv.messages.append(Message(
                        id=msg_id,
                        conversation_id=sess_id,
                        parent_id=parent_id,
                        role=msg.get("role", "user"),
                        content=msg.get("content", ""),
                        timestamp=datetime.utcnow(), 
                        tokens=msg.get("tokens")
                    ))
                    parent_id = msg_id # Linear branching for legacy data
                
                self.service.save_conversation(conv)
                
            # Rename legacy file to prevent re-migration
            os.rename(SESSIONS_FILE, LEGACY_BACKUP)
            print("Migration complete. Legacy file backed up to", LEGACY_BACKUP)
            
        except Exception as e:
            print(f"Migration failed: {e}")
