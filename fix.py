import os

with open('ui/src/App.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('Nexus AI', 'LocAi')
c = c.replace('nexus/', 'locai/')
c = c.replace("useState('opus')", "useState('')")

with open('ui/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Done fixing")
