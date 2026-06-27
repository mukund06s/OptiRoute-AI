#!/usr/bin/env sh
set -e

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
MODEL_FILE="$ROOT_DIR/ml-service/models/risk_model.pkl"

if [ ! -f "$MODEL_FILE" ]; then
  echo "[docker-prepare] ML model artifacts missing. Generating from training pipeline..."
  (
    cd "$ROOT_DIR/ml-service"
    python training/train_model.py
  )
else
  echo "[docker-prepare] ML model artifacts already present."
fi

echo "[docker-prepare] Ready for docker compose build."
