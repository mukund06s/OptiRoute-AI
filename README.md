# OptiRoute

**Predict. Reroute. Deliver.**

AI-powered multi-agent dynamic logistics and supply chain resilience platform.

## Monorepo Structure

```
optiroute/
├── backend/          # Node.js + Express + TypeScript API
├── frontend/         # Next.js 14 App Router dashboard
├── ml-service/       # Python FastAPI ML microservice
├── prisma/           # Database schema, migrations, seed
└── n8n-workflows/    # Automation workflow exports
```

## Prerequisites

- Node.js 20.x LTS
- Python 3.11.x
- Docker & Docker Compose
- PostgreSQL 15.x (via Docker or local)

## Quick Start

### 1. Environment Setup

```bash
cp backend/.env.example backend/.env
cp ml-service/.env.example ml-service/.env
cp frontend/.env.example frontend/.env.local
```

### 2. Start Infrastructure

```bash
docker-compose up -d postgres
```

### 3. Backend

```bash
cd backend
npm install
npm run dev
```

### 4. ML Service

```bash
cd ml-service
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 6. Full Stack (Docker)

```bash
docker-compose up --build
```

## Services

| Service     | URL                          | Port |
|-------------|------------------------------|------|
| Frontend    | http://localhost:3000        | 3000 |
| Backend API | http://localhost:5000/api    | 5000 |
| ML Service  | http://localhost:8000        | 8000 |
| PostgreSQL  | localhost:5432               | 5432 |
| n8n         | http://localhost:5678        | 5678 |

## Development Phases

See [PRD.md](./PRD.md) for the complete implementation blueprint and phase-wise build order.

## License

Proprietary — OptiRoute Project
