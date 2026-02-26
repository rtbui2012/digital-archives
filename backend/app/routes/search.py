from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..embedder import embed
from ..qdrant import get_client, get_collection

router = APIRouter(tags=["search"]) 


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=10, ge=1, le=50)


class SearchHit(BaseModel):
    score: float
    id: str
    payload: dict


class SearchResponse(BaseModel):
    hits: list[SearchHit]


@router.post("/search", response_model=SearchResponse)
def search(req: SearchRequest):
    vector = embed([req.query])[0]
    client = get_client()
    res = client.search(
        collection_name=get_collection(),
        query_vector=vector,
        limit=req.limit,
        with_payload=True,
    )

    hits = [SearchHit(score=h.score, id=str(h.id), payload=h.payload or {}) for h in res]
    return SearchResponse(hits=hits)
