# syntax=docker/dockerfile:1

FROM python:3.11-slim AS builder

WORKDIR /app

ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

FROM python:3.11-slim AS runner

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* \
  && rm -rf /wheels

COPY main.py config.py ./
COPY schemas/ ./schemas/
COPY services/ ./services/
COPY models/ ./models/
COPY training/ ./training/
COPY data/ ./data/

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
