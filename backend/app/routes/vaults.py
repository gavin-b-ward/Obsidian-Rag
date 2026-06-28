from fastapi import APIRouter

from ..errors import AppError, to_http_exception
from ..models.api import (
    CreateVaultResponse,
    VaultListResponse,
    VaultRequest,
)
from ..services.vaults import add_vault as create_vault
from ..services.vaults import list_vaults as load_vaults

router = APIRouter(prefix="/v1/vaults", tags=["vaults"])


@router.get("/", response_model=VaultListResponse)
def get_vaults() -> VaultListResponse:
    try:
        return VaultListResponse.model_validate(load_vaults())
    except AppError as exc:
        raise to_http_exception(exc, "vault") from exc


@router.post("/", response_model=CreateVaultResponse)
def add_vault(vault: VaultRequest) -> CreateVaultResponse:
    try:
        result = create_vault(vault.name, vault.path)
        return CreateVaultResponse.model_validate(result)
    except AppError as exc:
        raise to_http_exception(exc, "vault") from exc
