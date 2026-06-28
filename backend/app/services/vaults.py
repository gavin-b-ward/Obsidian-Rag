from pathlib import Path
from typing import Any

from ..repositories.vaults import add_vault as create_vault_record
from ..repositories.vaults import list_vaults as list_vault_records


def list_vaults() -> dict[str, Any]:
    result = list_vault_records()
    if not result["ok"]:
        raise RuntimeError(result["error"])

    return {
        "ok": True,
        "vaults": result["vaults"],
    }


def add_vault(name: str, path: str) -> dict[str, Any]:
    if not Path(path).exists():
        raise ValueError("Invalid Vault Path")

    result = create_vault_record(name, path)
    if not result["ok"]:
        raise ValueError(result["error"])

    return result
