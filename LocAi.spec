# -*- mode: python ; coding: utf-8 -*-


from PyInstaller.utils.hooks import collect_submodules, copy_metadata

hidden_imports = ['uvicorn', 'fastapi', 'chromadb', 'pypdf', 'docx', 'markdown', 'onnxruntime', 'tokenizers']
hidden_imports += collect_submodules('chromadb')
hidden_imports += collect_submodules('uvicorn')
hidden_imports += collect_submodules('fastapi')
hidden_imports += collect_submodules('onnxruntime')
hidden_imports += collect_submodules('tokenizers')
hidden_imports += collect_submodules('opentelemetry')

all_datas = [('core', 'core'), ('gui', 'gui')]
all_datas += copy_metadata('chromadb')
all_datas += copy_metadata('fastapi')
all_datas += copy_metadata('uvicorn')
all_datas += copy_metadata('onnxruntime')
all_datas += copy_metadata('tokenizers')

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=all_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='LocAi',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
