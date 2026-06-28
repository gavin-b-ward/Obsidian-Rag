from pathlib import Path
from typing import Any

from ..errors import ConflictError, RepositoryError, ValidationError
from ..repositories.vaults import add_vault as create_vault_record
from ..repositories.vaults import list_vaults as list_vault_records


def list_vaults() -> dict[str, Any]:
    result = list_vault_records()

    return {
        "ok": True,
        "vaults": [vault.model_dump() for vault in result.vaults],
    }


def add_vault(name: str, path: str) -> dict[str, Any]:
    if not Path(path).exists():
        raise ValidationError("Invalid vault path.")

    try:
        result = create_vault_record(name, path)
    except RepositoryError as exc:
        if "already exists" in str(exc).lower():
            raise ConflictError(str(exc)) from exc

        raise

    return result.model_dump()
