import re
from dataclasses import dataclass


@dataclass
class Chunk:
    text: str
    start_char: int
    end_char: int


def chunk_text(text: str, max_chars: int = 1200, overlap: int = 150) -> list[Chunk]:
    # normalize whitespace
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return []

    chunks: list[Chunk] = []
    i = 0
    n = len(clean)

    while i < n:
        j = min(n, i + max_chars)
        # try to break on sentence-ish boundary
        boundary = clean.rfind(". ", i, j)
        if boundary != -1 and boundary > i + 200:
            j = boundary + 1

        chunk = clean[i:j].strip()
        if chunk:
            chunks.append(Chunk(text=chunk, start_char=i, end_char=j))

        if j >= n:
            break
        i = max(0, j - overlap)

    return chunks
