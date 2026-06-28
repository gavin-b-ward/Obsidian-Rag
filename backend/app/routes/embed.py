from fastapi import APIRouter, HTTPException

from ..models.api import (
    ChangedEmbedRequest,
    ChangedIndexResponse,
    EmbedRequest,
    ErrorResponse,
    IndexResponse,
)
from ..services.rag import embed_changed_files as run_embed_changed_files
from ..services.rag import embed_vault as run_embed_vault

router = APIRouter(prefix="/v1/embed", tags=["embed"])


def _http_error(status_code: int, error: str, msg: str, resource: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail=ErrorResponse(
            error=error,
            msg=msg,
            resource=resource,
        ).model_dump(),
    )


@router.post("/")
def embed_vault(request: EmbedRequest) -> IndexResponse:
    try:
        return IndexResponse.model_validate(
            run_embed_vault(request.path, request.collection_name)
        )
    except ValueError as exc:
        raise _http_error(400, "BAD_REQUEST", str(exc), "embedding") from exc
    except Exception as exc:
        raise _http_error(500, "EMBED_FAILED", str(exc), "embedding") from exc


@router.post("/changed")
def embed_changed_files(request: ChangedEmbedRequest) -> ChangedIndexResponse:
    try:
        return ChangedIndexResponse.model_validate(
            run_embed_changed_files(request.collection_name)
        )
    except ValueError as exc:
        raise _http_error(400, "BAD_REQUEST", str(exc), "embedding") from exc
    except Exception as exc:
        raise _http_error(500, "EMBED_FAILED", str(exc), "embedding") from exc
