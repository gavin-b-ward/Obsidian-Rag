# API Folder

This folder contains HTTP-facing code.

Put these kinds of items here:

- FastAPI routers.
- Route registration helpers.
- Request-to-service wiring.
- HTTP-specific error translation.
- API dependency helpers if you add them later.

Avoid putting these here:

- Raw SQL.
- Embedding logic.
- Business workflows that should live in services.
