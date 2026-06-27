"""CI validation for OptiRoute ML service (imports, model artifacts, startup)."""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import httpx


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(root))
    model_path = root / "models" / "risk_model.pkl"

    if not model_path.exists():
        print("[CI] Missing trained model artifact: models/risk_model.pkl", file=sys.stderr)
        return 1

    print("[CI] Import validation...")
    import main as app_main  # noqa: F401
    from config import settings  # noqa: F401
    from services.predictor import PredictionService  # noqa: F401

    print("[CI] FastAPI startup validation...")
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8765",
        ],
        cwd=str(root),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        for _ in range(45):
            try:
                response = httpx.get("http://127.0.0.1:8765/health", timeout=2.0)
                if response.status_code == 200:
                    payload = response.json()
                    if payload.get("status") != "ok":
                        print(f"[CI] Unexpected health payload: {payload}", file=sys.stderr)
                        return 1
                    print("[CI] ML health endpoint validated")
                    return 0
            except httpx.HTTPError:
                time.sleep(2)

        print("[CI] ML service failed to become healthy in time", file=sys.stderr)
        if process.stdout:
            print(process.stdout.read(), file=sys.stderr)
        return 1
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    raise SystemExit(main())
