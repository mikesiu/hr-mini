import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from datetime import datetime, timedelta
from pathlib import Path
import shutil
import sqlite3
import os, time
from typing import Callable

# Import paths from settings
from app.config.settings import DB_PATH, BACKUP_LOCAL_DIR, BACKUP_DRIVE_DIR

def retry(times: int, delay_sec: float, fn: Callable, *args, **kwargs):
    last_exc = None
    for _ in range(times):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            last_exc = e
            time.sleep(delay_sec)
    raise last_exc

# Retention policy (adjust as needed)
KEEP_LOCAL_DAYS = int(os.getenv("KEEP_LOCAL_DAYS", "14"))
KEEP_DRIVE_DAYS = int(os.getenv("KEEP_DRIVE_DAYS", "60"))

def sqlite_safe_backup(src: Path, dst: Path):
    """
    Make a consistent snapshot using SQLite's online backup API.
    Writes to a temporary file, closes all handles, then renames with retries.
    """
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix(dst.suffix + ".tmp")

    # Create snapshot to tmp
    src_conn = sqlite3.connect(str(src))
    dst_conn = sqlite3.connect(str(tmp))
    try:
        src_conn.backup(dst_conn)  # full, consistent backup
        dst_conn.commit()
    finally:
        # Be extra explicit about closing on Windows
        try:
            dst_conn.close()
        except Exception:
            pass
        try:
            src_conn.close()
        except Exception:
            pass

    # Ensure target not present
    if dst.exists():
        try:
            os.remove(dst)
        except PermissionError:
            # give AV/indexer time to release
            retry(10, 0.25, os.remove, dst)

    # Rename tmp -> final (with retries to beat AV/indexers)
    def _rename(a, b):
        os.replace(a, b)  # atomic overwrite on Windows
    retry(10, 0.25, _rename, tmp, dst)

def rotate(dirpath: Path, keep_days: int):
    cutoff = datetime.now() - timedelta(days=keep_days)
    for p in dirpath.glob("hr_*.db"):
        # hr_YYYYMMDD_HHMMSS.db
        try:
            ts = p.stem.split("_", 1)[1]  # YYYYMMDD_HHMMSS
            dt = datetime.strptime(ts, "%Y%m%d_%H%M%S")
            if dt < cutoff:
                p.unlink()
        except Exception:
            # Ignore files that don't match pattern
            pass

def main():
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    local_out = BACKUP_LOCAL_DIR / f"hr_{ts}.db"
    drive_out = BACKUP_DRIVE_DIR / f"hr_{ts}.db"

    # 1) Make a safe local snapshot
    sqlite_safe_backup(DB_PATH, local_out)
    print(f"[OK] Local backup: {local_out}")

    # 2) Copy local snapshot to Google Drive (metadata-preserving)
    drive_out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(local_out, drive_out)
    print(f"[OK] Drive backup: {drive_out}")

    # 3) Rotate old backups
    rotate(BACKUP_LOCAL_DIR, KEEP_LOCAL_DAYS)
    rotate(BACKUP_DRIVE_DIR, KEEP_DRIVE_DAYS)
    print("[OK] Rotation complete.")

if __name__ == "__main__":
    main()
