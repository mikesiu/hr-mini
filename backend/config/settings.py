import os
from pathlib import Path

# Database Configuration
USE_MYSQL = os.getenv("USE_MYSQL", "true").lower() == "true"

# MySQL Configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "hr_user")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "hr3234")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "hr_mini")
MYSQL_CHARSET = os.getenv("MYSQL_CHARSET", "utf8mb4")

# SQLite Configuration (fallback)
DB_PATH = Path(__file__).parent.parent.parent / "hr.db"

# Local backup staging area (fast local disk)
BACKUP_LOCAL_DIR = Path(os.getenv("BACKUP_LOCAL_DIR", r"D:\hr-mini\backups"))

# Google Drive (destination) – safe for backups, not for live DB
BACKUP_DRIVE_DIR = Path(os.getenv("BACKUP_DRIVE_DIR", r"G:\Shared drives\4.HR & Payroll\Backups"))

FILES_ROOT = Path(os.getenv("FILES_ROOT", r"D:\hr-mini\files"))  # store receipts locally (optional)

# Ensure local folders exist
BACKUP_LOCAL_DIR.mkdir(parents=True, exist_ok=True)
FILES_ROOT.mkdir(parents=True, exist_ok=True)
