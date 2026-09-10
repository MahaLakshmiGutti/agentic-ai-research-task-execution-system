"""Launches the backend (FastAPI/uvicorn) and frontend (Vite dev server)
together. Run with: python main.py
Stop both with Ctrl+C.
"""

import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"

BACKEND_PORT = 8001
FRONTEND_PORT = 5173

IS_WINDOWS = sys.platform == "win32"


def backend_python() -> str:
    venv_python = BACKEND_DIR / ".venv" / ("Scripts/python.exe" if IS_WINDOWS else "bin/python")
    if venv_python.exists():
        return str(venv_python)
    print("[launcher] backend/.venv not found, falling back to the current Python interpreter.", flush=True)
    print(r"[launcher] Run: cd backend && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt", flush=True)
    return sys.executable


def stream_output(process: subprocess.Popen, tag: str) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        print(f"[{tag}] {line.rstrip()}", flush=True)


def spawn(args: list[str], cwd: Path) -> subprocess.Popen:
    # Spawn each server in its own process group/session so it can be torn
    # down as a whole tree on shutdown (npm/uvicorn each start child
    # processes that would otherwise survive a plain terminate()).
    kwargs = dict(
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )
    if IS_WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    return subprocess.Popen(args, **kwargs)


def stop(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    if IS_WINDOWS:
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        import signal

        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def main() -> int:
    if not (BACKEND_DIR / ".env").exists():
        print("[launcher] backend/.env not found. Copy backend/.env.example to backend/.env and set your API keys.", flush=True)

    npm = shutil.which("npm")
    if npm is None:
        print("[launcher] npm was not found on PATH. Install Node.js first.", flush=True)
        return 1

    if not (FRONTEND_DIR / "node_modules").exists():
        print("[launcher] frontend/node_modules not found, running npm install...", flush=True)
        subprocess.run([npm, "install"], cwd=FRONTEND_DIR, check=True)

    backend_proc = spawn(
        [
            backend_python(),
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "localhost",
            "--port",
            str(BACKEND_PORT),
        ],
        cwd=BACKEND_DIR,
    )
    frontend_proc = spawn(
        [npm, "run", "dev", "--", "--port", str(FRONTEND_PORT)],
        cwd=FRONTEND_DIR,
    )

    threads = [
        threading.Thread(target=stream_output, args=(backend_proc, "backend"), daemon=True),
        threading.Thread(target=stream_output, args=(frontend_proc, "frontend"), daemon=True),
    ]
    for t in threads:
        t.start()

    print(f"[launcher] backend:  http://localhost:{BACKEND_PORT}", flush=True)
    print(f"[launcher] frontend: http://localhost:{FRONTEND_PORT}", flush=True)
    print("[launcher] Press Ctrl+C to stop both.", flush=True)

    try:
        while True:
            backend_code = backend_proc.poll()
            frontend_code = frontend_proc.poll()
            if backend_code is not None:
                print(f"[launcher] backend exited with code {backend_code}, shutting down.", flush=True)
                break
            if frontend_code is not None:
                print(f"[launcher] frontend exited with code {frontend_code}, shutting down.", flush=True)
                break
            threading.Event().wait(0.5)
    except KeyboardInterrupt:
        print("\n[launcher] stopping...", flush=True)
    finally:
        stop(backend_proc)
        stop(frontend_proc)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
