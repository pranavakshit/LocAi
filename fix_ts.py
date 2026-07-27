import re

with open('ui/src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def remove_block(start_pattern, end_pattern=None):
    start_idx = -1
    for i, line in enumerate(lines):
        if re.search(start_pattern, line):
            start_idx = i
            break
    if start_idx == -1: return
    
    if end_pattern is None:
        end_idx = start_idx
    else:
        end_idx = -1
        for i in range(start_idx, len(lines)):
            if re.search(end_pattern, lines[i]):
                end_idx = i
                break
    
    if end_idx != -1:
        del lines[start_idx:end_idx+1]

remove_block(r'^const FILE_TREE = \[', r'^\]')
remove_block(r'^const HISTORY = \[', r'^\]')
remove_block(r'^function extColor', r'^}')
remove_block(r'^const PLAYGROUND_CODE = `', r'^`')
remove_block(r'^function Legend', r'^}')
remove_block(r'^const CURRENT_VERSION = ')
remove_block(r'const \[expandedFolders, setExpandedFolders\]', r'new Set')

# Fix pywebview typing
new_lines = []
for line in lines:
    new_lines.append(line)
    if "import" in line and "lucide-react" in line:
        new_lines.append("\ndeclare global {\n  interface Window {\n    pywebview?: any;\n  }\n}\n")

# Fix setInput
for i in range(len(new_lines)):
    if 'setInput(prev => prev +' in new_lines[i]:
        new_lines[i] = new_lines[i].replace('setInput(prev => prev +', 'setInput(input +')
        
    if 'Attach:' in new_lines[i] and '15' in new_lines[i+1]:
        # There are two Attach icons. We will remove the second one.
        pass

# Fix duplicate Attach icon
attach_count = 0
del_start = -1
del_end = -1
for i, line in enumerate(new_lines):
    if 'Attach: () => (' in line:
        attach_count += 1
        if attach_count == 2:
            del_start = i
            for j in range(i, len(new_lines)):
                if '),' in new_lines[j]:
                    del_end = j
                    break
            break

if del_start != -1:
    del new_lines[del_start:del_end+1]

with open('ui/src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed TS errors and warnings.")
