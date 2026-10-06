"""Resolve resource paths for development and frozen (PyInstaller) runs."""
from __future__ import annotations

import sys
from pathlib import Path


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"))


def resource_root() -> Path:
    """Bundled read-only resources (frontend build, etc.)."""
    if is_frozen():
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent.parent


def backend_root() -> Path:
    if is_frozen():
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent


def frontend_build_dir() -> Path:
    """Prefer a build next to the .exe, then the bundled copy, then repo frontend/build."""
    candidates: list[Path] = []
    if is_frozen():
        candidates.append(Path(sys.executable).resolve().parent / "frontend" / "build")
        candidates.append(resource_root() / "frontend" / "build")
    else:
        candidates.append(resource_root() / "frontend" / "build")
        candidates.append(backend_root().parent / "frontend" / "build")

    for path in candidates:
        if (path / "index.html").is_file():
            return path
    return candidates[0]
