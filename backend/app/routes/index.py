from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader
import uuid

from ..chunking import chunk_text
from ..embedder import embed
from ..qdrant import get_client, get_collection

router = APIRouter(tags=["index"]) 


class IndexResponse(BaseModel):
    document_id: str
    chunks_indexed: int


@router.post("/index/pdf", response_model=IndexResponse)
async def index_pdf(file: UploadFile = File(...)):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail=f"Expected PDF, got {file.content_type}")

    data = await file.read()
    reader = PdfReader(io_bytes := __import__("io").BytesIO(data))

    pages_text: list[str] = []
    for p in reader.pages:
        pages_text.append((p.extract_text() or "").strip())

    full_text = "\n\n".join(pages_text).strip()
    if not full_text:
        raise HTTPException(status_code=400, detail="No extractable text found in PDF")

    doc_id = str(uuid.uuid4())

    # chunk per page but keep page number in payload
    points = []
    for page_num, page_text in enumerate(pages_text, start=1):
        for idx, ch in enumerate(chunk_text(page_text)):
            point_id = str(uuid.uuid4())
            vector = embed([ch.text])[0]
            payload = {
                "document_id": doc_id,
                "page": page_num,
                "chunk": idx,
                "text": ch.text,
                "source": file.filename,
            }
            points.append((point_id, vector, payload))

    client = get_client()
    collection = get_collection()

    # upsert
    client.upsert(
        collection_name=collection,
        points=[
            {
                "id": pid,
                "vector": vec,
                "payload": pl,
            }
            for pid, vec, pl in points
        ],
    )

    return IndexResponse(document_id=doc_id, chunks_indexed=len(points))
