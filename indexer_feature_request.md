# [Feature]: Background Document Indexer

**Area**
backend

**Problem / Goal**
As a user, I want a background program that scans for new documents in the `DOCS_HOST_PREFIX` folder and indexes them into Qdrant, while also determining if any files have been deleted so it can remove them from the Qdrant index. This ensures the search index remains up-to-date automatically without manual intervention.

**Proposed solution**
- Create a new background container service in `docker-compose.yml` that mounts the `DOCS_HOST_PREFIX` folder (e.g., as `/docs`).
- The container runs a script that checks for new, modified, or deleted files.
- **Efficiency Requirement:** Avoid querying the entire Qdrant index with files on the local machine. Perhaps use Merkle Trees (Structural Hashing) to determine the delta.
- New or modified documents are embedded and inserted into Qdrant.
- Documents missing from the folder but present in the tracking state are deleted from Qdrant.
- Schedule this container to run the indexing logic every hour by default, using a scheduler (like a simple sleep loop, `cron`, or Docker-based scheduler).
- Make the schedule interval configurable via an environment variable (e.g., `INDEX_SYNC_INTERVAL`).
- It needs access to the `QDRANT_URL`.

**Acceptance criteria**
- [ ] Create an indexing script capable of parsing documents, generating embeddings, and updating Qdrant.
- [ ] Script detects and indexes new files found in the target directory that are not in Qdrant.
- [ ] Script detects and deletes entries in Qdrant for files that no longer exist in the directory.
- [ ] Add the background indexer as a new service in `docker-compose.yml`.
- [ ] Schedule the indexer to run every hour.
- [ ] Provide an environment variable to configure the sync interval.

**Out of scope / Non-goals**
- Do not make changes to the frontend UI.
- Do not modify the core Qdrant configuration or the existing backend API service logic.

**Priority**
P2 (normal)

**How to verify**
1) Start the stack using `docker-compose up -d --build`.
2) Place a new document in `C:\Users\rt_bu\Documents` (the `DOCS_HOST_PREFIX` path).
3) Check the logs of the new background container (`docker-compose logs -f <new-service>`) to verify the file is indexed.
4) Verify the file is searchable via the API.
5) Delete the document from the folder.
6) Wait for the next sync or trigger it manually, and check logs to verify it was removed from Qdrant.

**Agent run authorization**
- [x] I confirm this is ready for an automated agent to implement.
