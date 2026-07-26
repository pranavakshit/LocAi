import os
import re

def read_file(path: str) -> str:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}"

def write_file(path: str, content: str) -> str:
    try:
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content.strip())
        return f"Successfully wrote to {path}"
    except Exception as e:
        return f"Error writing file: {e}"

def list_dir(path: str) -> str:
    try:
        if not os.path.isdir(path):
            return f"Error: {path} is not a directory."
        items = os.listdir(path)
        return "\n".join(items) if items else "Directory is empty."
    except Exception as e:
        return f"Error listing directory: {e}"

AVAILABLE_TOOLS = {
    "read_file": read_file,
    "write_file": write_file,
    "list_dir": list_dir
}

AGENT_SYSTEM_PROMPT = """You are LocAi, a powerful autonomous coding agent. 
You are working inside a Project Workspace. You have access to tools to read and write files directly to the user's hard drive.

To use a tool, output a single XML block like this:
<call:tool_name>
  <arg1>value</arg1>
  <arg2>value</arg2>
</call:tool_name>

Available tools:
- read_file (Args: <path>)
- write_file (Args: <path>, <content>)
- list_dir (Args: <path>)

You must wait for the system to respond with <response:tool_name> before continuing. 
ALWAYS USE TOOLS ONE AT A TIME."""

def execute_tool(tool_name: str, args: dict) -> str:
    if tool_name not in AVAILABLE_TOOLS:
        return f"Error: Unknown tool {tool_name}"
    
    try:
        if tool_name == "read_file":
            return read_file(args.get("path", ""))
        elif tool_name == "write_file":
            return write_file(args.get("path", ""), args.get("content", ""))
        elif tool_name == "list_dir":
            return list_dir(args.get("path", ""))
    except Exception as e:
        return str(e)
    return "Error: Invalid arguments."

def parse_tool_call(text: str) -> tuple[str, dict]:
    """Returns (tool_name, args_dict) or (None, None)"""
    call_match = re.search(r'<call:([^>]+)>(.*?)</call:\1>', text, re.DOTALL)
    if not call_match:
        return None, None
        
    tool_name = call_match.group(1)
    args_text = call_match.group(2)
    
    args = {}
    arg_matches = re.finditer(r'<([^>]+)>(.*?)</\1>', args_text, re.DOTALL)
    for m in arg_matches:
        args[m.group(1)] = m.group(2)
        
    return tool_name, args
