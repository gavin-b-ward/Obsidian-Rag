# Services Folder

This folder contains application and business logic.

Put these kinds of items here:

- Workflows that coordinate repositories and embeddings.
- Logic for current vault resolution.
- Reindexing decisions.
- Chat orchestration.
- Embed orchestration.

Avoid putting these here:

- FastAPI `HTTPException` handling.
- Raw SQL statements.
- Low-level database connection code.
