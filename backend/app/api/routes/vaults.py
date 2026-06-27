import os
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import add_vault as create_vault_record

router = APIRouter(tags=["vaults"])


class ErrorResponse(BaseModel):
    error: str
    msg: str
    resource: str


class VaultRequest(BaseModel):
    name: str
    path: str


def _http_error(status_code: int, error: str, msg: str, resource: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail=ErrorResponse(
            error=error,
            msg=msg,
            resource=resource,
        ).model_dump(),
    )

@router.get("/vaults")
    def get_vaults() -> dict[str, Any]:



@router.post("/vaults")
def add_vault(vault: VaultRequest) -> dict[str, Any]:
    if not os.path.exists(vault.path):
        raise _http_error(400, "BAD_REQUEST", "Invalid Vault Path", "path")

    result = create_vault_record(vault.name, vault.path)

    if not result["ok"]:
        raise _http_error(500, "FAILED_INSERT", result["error"], "vault")

    return result
