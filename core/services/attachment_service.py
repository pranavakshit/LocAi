import os
import hashlib
import shutil
from typing import Optional
from core.models.conversation import Attachment
from core.services.conversation_service import ConversationService

_user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
USERDATA_DIR = os.path.join(_user_profile, "LocAi", "userdata")

class AttachmentService:
    def __init__(self, conversation_service: ConversationService):
        self.conv_service = conversation_service

    def save_attachment(self, conversation_id: str, message_id: str, file_path: str, mime_type: str = "application/octet-stream") -> Optional[Attachment]:
        if not os.path.exists(file_path):
            return None
            
        filename = os.path.basename(file_path)
        
        # Calculate hash
        sha256_hash = hashlib.sha256()
        with open(file_path,"rb") as f:
            for byte_block in iter(lambda: f.read(4096),b""):
                sha256_hash.update(byte_block)
        file_hash = sha256_hash.hexdigest()
        
        # Determine brain directory
        brain_dir = os.path.join(USERDATA_DIR, "conversations", conversation_id, "brain")
        os.makedirs(brain_dir, exist_ok=True)
        
        target_filename = f"{file_hash[:8]}_{filename}"
        target_path = os.path.join(brain_dir, target_filename)
        
        # Copy file if it doesn't exist
        if not os.path.exists(target_path):
            shutil.copy2(file_path, target_path)
            
        # Create attachment domain model
        attachment = Attachment(
            message_id=message_id,
            filename=filename,
            mime_type=mime_type,
            hash=file_hash,
            storage_path=target_path
        )
        
        self.conv_service.attach_file(conversation_id, attachment)
        return attachment
