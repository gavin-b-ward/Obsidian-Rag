from fastapi import APIRouter, HTTPException

from ..models.api import (
    CreateVaultResponse,
    ErrorResponse,
    VaultListResponse,
    VaultRequest,
)
from ..services.vaults import add_vault as create_vault
from ..services.vaults import list_vaults as load_vaults

router = APIRouter(prefix="/v1/vaults", tags=["vaults"])


def _http_error(status_code: int, error: str, msg: str, resource: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail=ErrorResponse(
            error=error,
            msg=msg,
            resource=resource,
        ).model_dump(),
    )


@router.get("/", response_model=VaultListResponse)
def get_vaults() -> VaultListResponse:
    try:
        return VaultListResponse.model_validate(load_vaults())
    except RuntimeError as exc:
        raise _http_error(500, "LOAD_FAILED", str(exc), "vault") from exc


@router.post("/", response_model=CreateVaultResponse)
def add_vault(vault: VaultRequest) -> CreateVaultResponse:
    try:
        result = create_vault(vault.name, vault.path)
        return CreateVaultResponse.model_validate(result)
    except ValueError as exc:
        raise _http_error(400, "BAD_REQUEST", str(exc), "vault") from exc
