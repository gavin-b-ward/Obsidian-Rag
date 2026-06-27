# DB Folder

This folder contains low-level database infrastructure.

Put these kinds of items here:

- SQLite connection helpers.
- Schema bootstrap files.
- Migration helpers.
- Shared DB setup utilities.

Avoid putting these here:

- Resource-specific SQL APIs if they fit better in repositories.
- FastAPI route code.
- Embedding or retrieval logic.
