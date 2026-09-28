"""
MySQL backup for HR Mini.

Creates a mysqldump snapshot locally, optionally copies it to Google Drive
(when that folder is available), then keeps only the newest N working-day
backups (Mon-Fri).

Usage:
  python scripts/backup_now.py
  python scripts/backup_now.py --force          # allow weekend run
  python scripts/backup_now.py --skip-drive     # local only
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Callable, List

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from config.settings import (  # noqa: E402
    BACKUP_DRIVE_DIR,
    BACKUP_LOCAL_DIR,
    MYSQL_DATABASE,
    MYSQL_HOST,
    MYSQL_PASSWORD,
    MYSQL_PORT,
    MYSQL_USER,
)

# Keep the newest N weekday backups (Mon-Fri). Default: 5 working days.
KEEP_WORKING_DAYS = int(os.getenv("KEEP_WORKING_DAYS", "5"))
BACKUP_PREFIX = "hr_mini_"
BACKUP_GLOB = f"{BACKUP_PREFIX}*.sql"


def retry(times: int, delay_sec: float, fn: Callable, *args, **kwargs):
    last_exc = None
    for _ in range(times):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            last_exc = e
            time.sleep(delay_sec)
    raise last_exc


def find_mysqldump() -> Path:
    """Locate mysqldump.exe on Windows PATH or common install folders."""
    which = shutil.which("mysqldump")
    if which:
        return Path(which)

    # Prefer server bin over Workbench when both exist
    program_files = Path(r"C:\Program Files\MySQL")
    if program_files.exists():
        server_dumps = sorted(
            program_files.glob("MySQL Server *\\bin\\mysqldump.exe"),
            reverse=True,
        )
        if server_dumps:
            return server_dumps[0]
        workbench = list(program_files.glob("MySQL Workbench *\\mysqldump.exe"))
        if workbench:
            return workbench[0]

    candidates = [
        Path(r"C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysqldump.exe"),
        Path(r"C:\xampp\mysql\bin\mysqldump.exe"),
    ]
    for path in candidates:
        if path.exists():
            return path

    raise FileNotFoundError(
        "mysqldump not found. Install MySQL client tools or add mysqldump.exe to PATH."
    )


def is_working_day(dt: datetime | None = None) -> bool:
    dt = dt or datetime.now()
    return dt.weekday() < 5  # Mon=0 ... Fri=4


def list_backup_files(dirpath: Path) -> List[Path]:
    if not dirpath.exists():
        return []
    files = [p for p in dirpath.glob(BACKUP_GLOB) if p.is_file()]
    # Newest first by filename timestamp (hr_mini_YYYYMMDD_HHMMSS.sql)
    return sorted(files, key=lambda p: p.name, reverse=True)


def parse_backup_datetime(path: Path) -> datetime | None:
    # hr_mini_YYYYMMDD_HHMMSS.sql
    stem = path.stem  # hr_mini_YYYYMMDD_HHMMSS
    parts = stem.split("_")
    if len(parts) < 3:
        return None
    try:
        return datetime.strptime(f"{parts[-2]}_{parts[-1]}", "%Y%m%d_%H%M%S")
    except ValueError:
        return None


def rotate_working_day_backups(dirpath: Path, keep: int) -> int:
    """
    Keep the newest backup for each of the last `keep` working days (Mon-Fri).
    Extra same-day backups and weekend files are purged.
    """
    removed = 0
    files = list_backup_files(dirpath)  # newest first
    kept_days: set[str] = set()

    for path in files:
        dt = parse_backup_datetime(path)
        if dt is None:
            continue
        if not is_working_day(dt):
            try:
                path.unlink()
                removed += 1
                print(f"[purge] weekend backup removed: {path.name}")
            except OSError as exc:
                print(f"[warn] could not remove {path}: {exc}")
            continue

        day_key = dt.strftime("%Y%m%d")
        if day_key not in kept_days and len(kept_days) < keep:
            kept_days.add(day_key)
            continue

        # Same day as an already-kept newer file, or beyond retention window
        reason = "same-day extra" if day_key in kept_days else "oldest working day"
        try:
            path.unlink()
            removed += 1
            print(f"[purge] {reason} backup removed: {path.name}")
        except OSError as exc:
            print(f"[warn] could not remove {path}: {exc}")

    return removed


def mysql_dump(dst: Path) -> None:
    mysqldump = find_mysqldump()
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix(dst.suffix + ".tmp")

    # Avoid leaving password visible in process list where possible via env
    env = os.environ.copy()
    env["MYSQL_PWD"] = MYSQL_PASSWORD

    cmd = [
        str(mysqldump),
        f"--host={MYSQL_HOST}",
        f"--port={MYSQL_PORT}",
        f"--user={MYSQL_USER}",
        "--single-transaction",
        "--routines",
        "--triggers",
        "--events",
        "--hex-blob",
        "--default-character-set=utf8mb4",
        "--result-file=" + str(tmp),
        MYSQL_DATABASE,
    ]

    print(f"[info] Using mysqldump: {mysqldump}")
    print(f"[info] Dumping database `{MYSQL_DATABASE}` ...")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        if tmp.exists():
            tmp.unlink(missing_ok=True)
        err = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(f"mysqldump failed (exit {result.returncode}): {err}")

    if not tmp.exists() or tmp.stat().st_size == 0:
        raise RuntimeError("mysqldump produced an empty backup file")

    if dst.exists():
        retry(10, 0.25, os.remove, dst)

    def _rename(a: Path, b: Path):
        os.replace(a, b)

    retry(10, 0.25, _rename, tmp, dst)


def copy_to_drive(local_file: Path, drive_dir: Path) -> Path | None:
    if not drive_dir.exists():
        print(f"[skip] Google Drive path not available: {drive_dir}")
        print("       Local backup is still valid. Mount Drive (or set BACKUP_DRIVE_DIR) for auto-copy.")
        return None

    try:
        drive_dir.mkdir(parents=True, exist_ok=True)
        drive_out = drive_dir / local_file.name
        shutil.copy2(local_file, drive_out)
        return drive_out
    except OSError as exc:
        print(f"[warn] Could not copy to Google Drive ({drive_dir}): {exc}")
        print("       Local backup succeeded; Drive copy can be done later if needed.")
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="HR Mini MySQL backup (5 working-day retention)")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Run even on Saturday/Sunday (weekend files are purged by default)",
    )
    parser.add_argument(
        "--skip-drive",
        action="store_true",
        help="Skip Google Drive copy even if BACKUP_DRIVE_DIR is available",
    )
    args = parser.parse_args()

    now = datetime.now()
    if not args.force and not is_working_day(now):
        print("[skip] Today is not a working day (Mon-Fri). Use --force to override.")
        return 0

    ts = now.strftime("%Y%m%d_%H%M%S")
    local_out = BACKUP_LOCAL_DIR / f"{BACKUP_PREFIX}{ts}.sql"

    print(f"[info] Local backup folder: {BACKUP_LOCAL_DIR}")
    print(f"[info] Drive backup folder: {BACKUP_DRIVE_DIR}")
    print(f"[info] Retention: newest {KEEP_WORKING_DAYS} working-day backups")

    # 1) Local MySQL dump
    mysql_dump(local_out)
    size_mb = local_out.stat().st_size / (1024 * 1024)
    print(f"[OK] Local backup: {local_out} ({size_mb:.2f} MB)")

    # 2) Optional Drive copy (automatic when Drive path is mounted)
    if args.skip_drive:
        print("[skip] Drive copy disabled (--skip-drive)")
    else:
        drive_out = copy_to_drive(local_out, BACKUP_DRIVE_DIR)
        if drive_out:
            print(f"[OK] Drive backup: {drive_out}")

    # 3) Rotate to keep only N newest working-day backups
    removed_local = rotate_working_day_backups(BACKUP_LOCAL_DIR, KEEP_WORKING_DAYS)
    removed_drive = 0
    if BACKUP_DRIVE_DIR.exists() and not args.skip_drive:
        removed_drive = rotate_working_day_backups(BACKUP_DRIVE_DIR, KEEP_WORKING_DAYS)
    print(f"[OK] Rotation complete (removed local={removed_local}, drive={removed_drive}).")

    remaining = list_backup_files(BACKUP_LOCAL_DIR)[:KEEP_WORKING_DAYS]
    print("[info] Current local working-day backups:")
    for p in remaining:
        print(f"       - {p.name}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        raise SystemExit(1)
