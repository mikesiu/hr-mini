"""
Desktop entry point for HR Mini.

Starts FastAPI (API + React build) and opens the default browser.
Used by the packaged HRMini.exe and by scripts/start_hr_mini.bat.
"""
from __future__ import annotations

import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

# Ensure backend package imports work in both source and frozen modes.
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))


def _browser_host(bind_host: str) -> str:
    if bind_host in ("0.0.0.0", "::", ""):
        return "127.0.0.1"
    return bind_host


def _wait_then_open(url: str, health_url: str, timeout_sec: float = 45.0) -> None:
    import urllib.error
    import urllib.request

    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(health_url, timeout=1.5) as resp:
                if 200 <= getattr(resp, "status", 200) < 500:
                    webbrowser.open(url)
                    return
        except (urllib.error.URLError, TimeoutError, OSError):
            time.sleep(0.4)
    # Still open even if health check never succeeded (user can see console errors).
    webbrowser.open(url)


def main() -> None:
    host = os.getenv("HR_MINI_HOST", "127.0.0.1")
    port = int(os.getenv("HR_MINI_PORT", "8888"))
    open_browser = os.getenv("HR_MINI_OPEN_BROWSER", "1").lower() not in ("0", "false", "no")

    browser_host = _browser_host(host)
    app_url = f"http://{browser_host}:{port}/"
    health_url = f"http://{browser_host}:{port}/api/health"

    print("=" * 56)
    print("  HR Mini")
    print(f"  Opening: {app_url}")
    print("  Keep this window open while using the app.")
    print("  Press Ctrl+C to stop.")
    print("=" * 56)

    if open_browser:
        threading.Thread(
            target=_wait_then_open,
            args=(app_url, health_url),
            daemon=True,
        ).start()

    import uvicorn
    from main import app

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
