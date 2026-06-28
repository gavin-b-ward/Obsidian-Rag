from fastapi import APIRouter

from ..errors import AppError, to_http_exception
from ..models.api import (
    ChangedEmbedRequest,
    ChangedIndexResponse,
    EmbedRequest,
    IndexResponse,
)
from ..services.rag import embed_changed_files as run_embed_changed_files
from ..services.rag import embed_vault as run_embed_vault

router = APIRouter(prefix="/v1/embed", tags=["embed"])


@router.post("/")
def embed_vault(request: EmbedRequest) -> IndexResponse:
    try:
        return IndexResponse.model_validate(
            run_embed_vault(request.path, request.collection_name)
        )
    except AppError as exc:
        raise to_http_exception(exc, "embedding") from exc


@router.post("/changed")
def embed_changed_files(request: ChangedEmbedRequest) -> ChangedIndexResponse:
    try:
        return ChangedIndexResponse.model_validate(
            run_embed_changed_files(request.collection_name)
        )
    except AppError as exc:
        raise to_http_exception(exc, "embedding") from exc
