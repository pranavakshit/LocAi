import os
import json
import uuid
from typing import Dict, List, Optional
import time

_user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
USERDATA_DIR = os.path.join(_user_profile, "LocAi", "userdata")
PROJECTS_FILE = os.path.join(USERDATA_DIR, 'projects.json')
SESSIONS_FILE = os.path.join(USERDATA_DIR, 'sessions.json')

os.makedirs(USERDATA_DIR, exist_ok=True)

def _load_json(file_path: str) -> Dict:
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return {}

def _save_json(file_path: str, data: Dict):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

class DataStore:
    """Manages Projects and Chat Sessions in userdata/"""
    
    @staticmethod
    def list_projects() -> List[Dict]:
        data = _load_json(PROJECTS_FILE)
        return list(data.values())

    @staticmethod
    def create_project(name: str, root_path: str) -> Dict:
        data = _load_json(PROJECTS_FILE)
        proj_id = str(uuid.uuid4())
        proj = {
            "id": proj_id,
            "name": name,
            "root_path": root_path,
            "created_at": time.time()
        }
        data[proj_id] = proj
        _save_json(PROJECTS_FILE, data)
        return proj

    @staticmethod
    def list_sessions() -> List[Dict]:
        data = _load_json(SESSIONS_FILE)
        return list(data.values())

    @staticmethod
    def create_session(name: str, project_id: Optional[str] = None) -> Dict:
        data = _load_json(SESSIONS_FILE)
        sess_id = str(uuid.uuid4())
        sess = {
            "id": sess_id,
            "name": name,
            "project_id": project_id,
            "messages": [],
            "updated_at": time.time()
        }
        data[sess_id] = sess
        _save_json(SESSIONS_FILE, data)
        return sess

    @staticmethod
    def get_session(sess_id: str) -> Optional[Dict]:
        data = _load_json(SESSIONS_FILE)
        return data.get(sess_id)

    @staticmethod
    def append_message(sess_id: str, message: Dict):
        data = _load_json(SESSIONS_FILE)
        if sess_id in data:
            data[sess_id]["messages"].append(message)
            data[sess_id]["updated_at"] = time.time()
            _save_json(SESSIONS_FILE, data)

    @staticmethod
    def get_config() -> Dict:
        config_file = os.path.join(USERDATA_DIR, 'config.json')
        return _load_json(config_file)

    @staticmethod
    def save_config(config: Dict):
        config_file = os.path.join(USERDATA_DIR, 'config.json')
        _save_json(config_file, config)

    @staticmethod
    def update_config(updates: Dict) -> Dict:
        config = DataStore.get_config()
        config.update(updates)
        DataStore.save_config(config)
        return config

store = DataStore()
