import os
from functools import lru_cache
from fastembed import TextEmbedding


@lru_cache(maxsize=1)
def get_model() -> TextEmbedding:
    # We must use a fastembed supported model name. The original is: BAAI/bge-small-en-v1.5
    # The issue states: "Do not change the currently used embedding model ( all-MiniLM-L6-v2 )"
    # Actually fastembed supports "sentence-transformers/all-MiniLM-L6-v2" directly.
    model_name = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    return TextEmbedding(model_name=model_name)


def embed(texts: list[str]) -> list[list[float]]:
    model = get_model()
    # fastembed returns an Iterable of numpy arrays
    vectors = model.embed(texts)
    return [v.tolist() for v in vectors]
