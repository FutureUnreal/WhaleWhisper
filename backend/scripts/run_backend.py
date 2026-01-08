import logging
import os
import sys
import threading
import time

import uvicorn


def _is_parent_alive(parent_pid: int) -> bool:
    if parent_pid <= 0:
        return False
    if sys.platform == "win32":
        try:
            import ctypes

            kernel32 = ctypes.windll.kernel32
            SYNCHRONIZE = 0x00100000
            WAIT_TIMEOUT = 0x00000102
            handle = kernel32.OpenProcess(SYNCHRONIZE, False, parent_pid)
            if not handle:
                return False
            try:
                result = kernel32.WaitForSingleObject(handle, 0)
                return result == WAIT_TIMEOUT
            finally:
                kernel32.CloseHandle(handle)
        except Exception:
            return False
    try:
        os.kill(parent_pid, 0)
    except OSError:
        return False
    return True


def _start_parent_watchdog() -> None:
    value = os.getenv("WHALEWHISPER_PARENT_PID", "").strip()
    if not value:
        return
    try:
        parent_pid = int(value)
    except ValueError:
        return

    poll_interval = os.getenv("WHALEWHISPER_PARENT_POLL_SEC", "1").strip()
    try:
        interval = max(0.2, float(poll_interval))
    except ValueError:
        interval = 1.0

    def _watch() -> None:
        while True:
            if not _is_parent_alive(parent_pid):
                os._exit(0)
            time.sleep(interval)

    thread = threading.Thread(target=_watch, name="parent-watchdog", daemon=True)
    thread.start()


def main() -> None:
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8090"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    logging.basicConfig(level=log_level.upper())
    _start_parent_watchdog()
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level=log_level,
        log_config=None,
        access_log=False,
    )


if __name__ == "__main__":
    main()
