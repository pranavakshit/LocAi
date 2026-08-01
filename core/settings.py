import os
import json
import uuid
from typing import Dict, List, Optional
import time

_user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
USERDATA_DIR = os.path.join(_user_profile, "LocAi", "userdata")
PROJECTS_FILE = os.path.join(USERDATA_DIR, 'projects.json')
CONFIG_FILE = os.path.join(USERDATA_DIR, 'config.json')

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

class SettingsManager:
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
    def get_config() -> Dict:
        return _load_json(CONFIG_FILE)

    @staticmethod
    def save_config(config: Dict):
        _save_json(CONFIG_FILE, config)

    @staticmethod
    def update_config(updates: Dict) -> Dict:
        config = SettingsManager.get_config()
        config.update(updates)
        SettingsManager.save_config(config)
        return config

settings = SettingsManager()
