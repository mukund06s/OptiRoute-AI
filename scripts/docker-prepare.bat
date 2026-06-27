@echo off
setlocal
set ROOT=%~dp0..
set MODEL=%ROOT%\ml-service\models\risk_model.pkl

if not exist "%MODEL%" (
  echo [docker-prepare] ML model artifacts missing. Generating from training pipeline...
  pushd "%ROOT%\ml-service"
  python training\train_model.py
  popd
) else (
  echo [docker-prepare] ML model artifacts already present.
)

echo [docker-prepare] Ready for docker compose build.
