# Digital Archives

Web UI + indexing pipeline for searching your Qdrant `documents` collection (localhost:6333) using vector search.

## Components
- **Backend**: FastAPI (Python) — PDF ingestion, chunking, embedding, Qdrant upsert, and search.
- **Frontend**: Next.js — clean search UI + result viewer.

## Quickstart (dev)
### 1) Backend
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
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
