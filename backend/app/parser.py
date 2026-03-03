from pypdf import PdfReader
import io

def extract_pages_from_pdf(pdf_bytes: bytes) -> list[str]:
    """Extracts text from a PDF given its raw bytes, returning a list of strings (one per page)."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    
    pages_text: list[str] = []
    for p in reader.pages:
        pages_text.append((p.extract_text() or "").strip())
        
    return pages_text
