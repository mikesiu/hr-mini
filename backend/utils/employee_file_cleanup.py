"""Safely remove employee-related files under FILES_ROOT after DB rows are gone."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable

from config.settings import FILES_ROOT

logger = logging.getLogger(__name__)


def _files_root_resolved() -> Path:
    return Path(FILES_ROOT).resolve()


def _is_file_under_root(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError:
        return False
    return path.resolve().is_file()


def safe_unlink_paths(raw_paths: Iterable[str | None]) -> tuple[int, list[str]]:
    """
    Unlink files that exist, are regular files, and lie under FILES_ROOT.
    Returns (removed_count, list of warning messages for paths skipped or failures).
    """
    root = _files_root_resolved()
    removed = 0
    warnings: list[str] = []
    for raw in raw_paths:
        if not raw or not str(raw).strip():
            continue
        p = Path(raw)
        try:
            resolved = p.resolve()
        except OSError as e:
            warnings.append(f"Could not resolve path {raw!r}: {e}")
            continue
        if not resolved.is_file():
            continue
        if not _is_file_under_root(resolved, root):
            warnings.append(f"Skipped unlink (outside FILES_ROOT): {resolved}")
            continue
        try:
            resolved.unlink()
            removed += 1
        except OSError as e:
            warnings.append(f"Failed to unlink {resolved}: {e}")
    for w in warnings:
        logger.warning(w)
    return removed, warnings
