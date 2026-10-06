# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for HR Mini desktop app (onedir)."""
from __future__ import annotations

import os
from pathlib import Path

from PyInstaller.building.api import COLLECT, EXE, PYZ
from PyInstaller.building.build_main import Analysis
from PyInstaller.utils.hooks import collect_all, collect_submodules

ROOT = Path(SPECPATH).resolve()
BACKEND = ROOT / "backend"
FRONTEND_BUILD = ROOT / "frontend" / "build"

datas: list = []
binaries: list = []
hiddenimports: list = []

# Bundle the React production build inside the app folder.
if (FRONTEND_BUILD / "index.html").is_file():
    datas.append((str(FRONTEND_BUILD), os.path.join("frontend", "build")))
else:
    raise SystemExit(
        "frontend/build is missing. Run scripts/build_exe.bat (it builds the UI first)."
    )

for package in (
    "uvicorn",
    "fastapi",
    "starlette",
    "anyio",
    "sqlalchemy",
    "pydantic",
    "pydantic_core",
    "pymysql",
    "jose",
    "passlib",
    "multipart",
    "email_validator",
    "cryptography",
    "bcrypt",
    "pandas",
    "openpyxl",
    "dotenv",
):
    try:
        pkg_datas, pkg_binaries, pkg_hidden = collect_all(package)
        datas += pkg_datas
        binaries += pkg_binaries
        hiddenimports += pkg_hidden
    except Exception as exc:  # noqa: BLE001 - packaging should continue if optional
        print(f"Warning: collect_all({package}) failed: {exc}")

# Local application modules (imported dynamically / by string in places).
hiddenimports += collect_submodules("api")
hiddenimports += collect_submodules("models")
hiddenimports += collect_submodules("repos")
hiddenimports += collect_submodules("services")
hiddenimports += collect_submodules("config")
hiddenimports += collect_submodules("utils")
hiddenimports += [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "sqlalchemy.dialects.mysql",
    "sqlalchemy.dialects.sqlite",
    "pymysql",
    "app_paths",
    "schemas",
    "schemas_reports",
    "main",
    "run_desktop",
]

a = Analysis(
    [str(BACKEND / "run_desktop.py")],
    pathex=[str(BACKEND)],
    binaries=binaries,
    datas=datas,
    hiddenimports=sorted(set(hiddenimports)),
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
    [],
    exclude_binaries=True,
    name="HRMini",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,  # Keep console so MySQL / startup errors are visible
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="HRMini",
)
