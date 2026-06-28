import sqlite3

from ..db.connection import get_connection
from ..errors import RepositoryError
from ..models.repository import (
    CreateVaultResult,
    GetVaultResult,
    ListVaultsResult,
    TouchVaultIndexedAtResult,
    VaultRow,
)


def _serialize_vault(row: sqlite3.Row) -> VaultRow:
    return VaultRow(
        id=row["id"],
        name=row["name"],
        path=row["path"],
        created_at=row["created_at"],
        last_indexed_at=row["last_indexed_at"],
    )


def add_vault(name: str, path: str) -> CreateVaultResult:
    try:
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO vaults (name, path)
                VALUES (?, ?);
                """,
                (name, path),
            )

            vault_id = cursor.lastrowid

            conn.execute(
                """
                INSERT INTO settings (key, value) 
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value;
                """,
                ("current_vault", str(vault_id)),
            )

            conn.commit()

            return CreateVaultResult(vault_id=vault_id)

    except sqlite3.IntegrityError as exc:
        raise RepositoryError("A vault with this path already exists.") from exc

    except sqlite3.OperationalError as e:
        raise RepositoryError(f"Database operation failed: {e}") from e


def get_vault(vault_id: int) -> GetVaultResult:
    try:
        with get_connection() as conn:
            row = conn.execute(
                """
                SELECT id, name, path, created_at, last_indexed_at
                FROM vaults
                WHERE id = ?;
                """,
                (vault_id,),
            ).fetchone()

        if row is None:
            raise RepositoryError(f"No vault found with id: {vault_id}")

        return GetVaultResult(vault=_serialize_vault(row))

    except sqlite3.OperationalError as e:
        raise RepositoryError(f"Database operation failed: {e}") from e


def list_vaults() -> ListVaultsResult:
    try:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, name, path, created_at, last_indexed_at
                FROM vaults
                ORDER BY created_at DESC;
                """
            ).fetchall()

        return ListVaultsResult(vaults=[_serialize_vault(row) for row in rows])

    except sqlite3.OperationalError as e:
        raise RepositoryError(f"Database operation failed: {e}") from e


def touch_vault_indexed_at(path: str) -> TouchVaultIndexedAtResult:
    try:
        with get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE vaults
                SET last_indexed_at = CURRENT_TIMESTAMP
                WHERE path = ?;
                """,
                (path,),
            )
            conn.commit()

            return TouchVaultIndexedAtResult(updated=cursor.rowcount > 0)

    except sqlite3.OperationalError as e:
        raise RepositoryError(f"Database operation failed: {e}") from e
