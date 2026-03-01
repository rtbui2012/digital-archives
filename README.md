# Digital Archives

Web UI + indexing pipeline for searching your Qdrant `documents` collection (localhost:6333) using vector search.

## Components
- **Backend**: FastAPI (Python) — PDF ingestion, chunking, embedding, Qdrant upsert, and search.
- **Frontend**: Next.js — clean search UI + result viewer.

## Quickstart (dev)
### 1) Backend
```powershell
cd backend
uv venv
.\.venv\Scripts\activate
uv pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Quickstart (Docker)

> Run both services together with a single command. Qdrant must already be running separately (e.g. `docker run -p 6333:6333 qdrant/qdrant`).

```powershell
docker compose up --build
```

| URL | Service |
|-----|---------|
| http://localhost:12021 | Frontend (Next.js) |
| http://localhost:11021 | Backend (FastAPI) |

### When to re-run `--build`

Always pass `--build` after any of these changes so Docker picks them up:

- Edited source files (`app/`, `frontend/`, etc.)
- Changed `Dockerfile` or `docker-compose.yml`
- Added/removed Python or npm dependencies
- Changed build args (e.g. `NEXT_PUBLIC_API_BASE`)

Without `--build`, Docker reuses the cached image and your changes won't take effect.

### Environment variables (runtime, no rebuild needed)

The following are injected at runtime via `docker-compose.yml` and can be changed without rebuilding:

| Variable | Service | Purpose |
|----------|---------|---------|
| `QDRANT_URL` | backend | Qdrant host seen from inside the container |
| `DOCS_ROOT` | frontend | Path **inside the container** where documents are mounted |
| `DOCS_HOST_PREFIX` | frontend | Windows-side absolute path prefix to strip from indexed file paths |
