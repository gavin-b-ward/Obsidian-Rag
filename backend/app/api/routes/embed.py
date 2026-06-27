import os
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import touch_vault_indexed_at
from embeddings.embeddings import index_vault

router = APIRouter(tags=["embed"])


class ErrorResponse(BaseModel):
    error: str
    msg: str
    resource: str


class EmbedRequest(BaseModel):
    path: str
    collection_name: str | None = None


def _http_error(status_code: int, error: str, msg: str, resource: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail=ErrorResponse(
            error=error,
            msg=msg,
            resource=resource,
        ).model_dump(),
    )


@router.post("/embed")
def embed_vault(request: EmbedRequest) -> dict[str, Any]:
    if not os.path.exists(request.path):
        raise _http_error(400, "BAD_REQUEST", "Invalid Vault Path", "path")

    try:
        result = index_vault(request.path, request.collection_name)
    except ValueError as exc:
        raise _http_error(400, "BAD_REQUEST", str(exc), "embedding") from exc
    except Exception as exc:
        raise _http_error(500, "EMBED_FAILED", str(exc), "embedding") from exc

    touch_vault_indexed_at(request.path)

    return {
        "ok": True,
        **result,
    }
