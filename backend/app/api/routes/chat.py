import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_setting_value, get_vault, touch_vault_indexed_at
from embeddings.chat import answer_with_context
from embeddings.embeddings import index_vault, retrieve_chunks

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    error: str
    msg: str
    resource: str


class ChatRequest(BaseModel):
    query: str
    top_k: int = 5
    path: str | None = None
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


def get_current_vault_path() -> str:
    current_vault = get_setting_value("current_vault")
    if not current_vault["ok"]:
        raise ValueError("No current vault is configured.")

    try:
        vault_id = int(current_vault["value"])
    except (TypeError, ValueError) as exc:
        raise ValueError("Current vault setting is invalid.") from exc

    vault_result = get_vault(vault_id)
    if not vault_result["ok"]:
        raise ValueError("Current vault record was not found.")

    return vault_result["vault"]["path"]


@router.post("/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    try:
        resolved_path = request.path or get_current_vault_path()
    except ValueError as exc:
        raise _http_error(400, "BAD_REQUEST", str(exc), "vault") from exc

    try:
        retrieved = retrieve_chunks(
            query=request.query,
            top_k=request.top_k,
            path=resolved_path,
            collection_name=request.collection_name,
        )
    except ValueError as exc:
        logger.info("Index missing for %s, building it now", resolved_path)
        try:
            index_vault(resolved_path, request.collection_name)
            touch_vault_indexed_at(resolved_path)
            retrieved = retrieve_chunks(
                query=request.query,
                top_k=request.top_k,
                path=resolved_path,
                collection_name=request.collection_name,
            )
        except Exception as index_exc:
            raise _http_error(400, "BAD_REQUEST", str(exc), "embedding") from index_exc

    answer = answer_with_context(
        query=request.query,
        chunks=retrieved["results"],
    )

    return {
        "ok": True,
        "answer": answer,
        "sources": [
            {
                "file_name": r["metadata"].get("file_name"),
                "file_path": r["metadata"].get("file_path"),
                "score": r["score"],
            }
            for r in retrieved["results"]
        ],
    }
