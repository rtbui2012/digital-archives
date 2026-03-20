import os
import sys
import time
import json
import logging
import uuid
from pathlib import Path
from qdrant_client.http.models import Filter, FieldCondition, MatchValue

# Setup paths to import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.parser import extract_pages_from_pdf
from app.chunking import chunk_text
from app.embedder import embed
from app.qdrant import get_client, get_collection

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DOCS_ROOT = os.getenv("DOCS_ROOT", "/docs")
DATA_DIR = os.getenv("DATA_DIR", "/app/data")
SYNC_INTERVAL = int(os.getenv("INDEX_SYNC_INTERVAL", 3600))
STATE_FILE = os.path.join(DATA_DIR, "state.json")

def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load state file: {e}")
    return {}

def save_state(state: dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def get_current_files() -> dict:
    current_files = {}
    docs_path = Path(DOCS_ROOT)
    logger.info(f"Looking for PDFs in {docs_path}")
    if not docs_path.exists():
        logger.warning(f"Docs path {DOCS_ROOT} does not exist.")
        return current_files

    IGNORE_DIRS = {".venv", "node_modules", ".git", "go", ".organizer"}
    
    for root, dirs, files in os.walk(docs_path):
        # Prevent os.walk from entering ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]

        for file_name in files:
            if file_name.lower().endswith(".pdf"):
                file_path = Path(root) / file_name
                rel_path = file_path.relative_to(docs_path).as_posix()
                try:
                    stat = file_path.stat()
                    current_files[rel_path] = {
                        "mtime": stat.st_mtime,
                        "size": stat.st_size
                    }
                except OSError as e:
                    logger.warning(f"Could not stat {file_path}: {e}")
    logger.info(f"Found {len(current_files)} PDF files")
    return current_files

def remove_from_qdrant(rel_path: str, client, collection: str):
    logger.info(f"Removing '{rel_path}' from Qdrant")
    client.delete(
        collection_name=collection,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="source",
                    match=MatchValue(value=rel_path)
                )
            ]
        )
    )

def index_to_qdrant(abs_path: Path, rel_path: str, client, collection: str):
    logger.info(f"Indexing '{rel_path}' to Qdrant")
    try:
        with open(abs_path, "rb") as f:
            data = f.read()
        
        pages_text = extract_pages_from_pdf(data)
        doc_id = str(uuid.uuid4())
        
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
                    "source": rel_path,
                }
                points.append((point_id, vector, payload))
        
        if points:
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
            logger.info(f"Successfully indexed {len(points)} chunks for '{rel_path}'")
        else:
            logger.warning(f"No extractable text found in '{rel_path}'")
            
    except Exception as e:
        logger.error(f"Error indexing '{rel_path}': {e}")
        raise e

def sync():
    logger.info("Starting sync cycle")
    state = load_state()
    current_files = get_current_files()
    
    client = get_client()
    collection = get_collection()
    docs_path = Path(DOCS_ROOT)
    
    logger.info(f"Checking for changes. Qdrant URL: {os.getenv('QDRANT_URL')}")
    changed = False
    
    # 1. Detect Deleted Files (in state, but not in current_files)
    deleted_files = set(state.keys()) - set(current_files.keys())
    for rel_path in deleted_files:
        remove_from_qdrant(rel_path, client, collection)
        del state[rel_path]
        changed = True
        
    # 2. Detect New or Modified Files
    for rel_path, info in current_files.items():
        is_new = rel_path not in state
        is_modified = not is_new and (
            state[rel_path]["mtime"] != info["mtime"] or 
            state[rel_path]["size"] != info["size"]
        )
        
        if is_new or is_modified:
            abs_path = docs_path / rel_path
            # If modified, remove old points first
            if is_modified:
                remove_from_qdrant(rel_path, client, collection)
                
            try:
                index_to_qdrant(abs_path, rel_path, client, collection)
                state[rel_path] = info
                changed = True
            except Exception:
                # Keep old state on failure to retry next time
                pass

    if changed:
        save_state(state)
        
    logger.info("Sync cycle completed")

def main():
    logger.info("Background indexer started")
    while True:
        try:
            sync()
        except Exception as e:
            logger.error(f"Error during sync cycle: {e}")
            import traceback
            traceback.print_exc()
            
        logger.info(f"Sleeping for {SYNC_INTERVAL} seconds...")
        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()
