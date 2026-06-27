
import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from .connection import get_connection


def _serialize_vault(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "path": row["path"],
        "created_at": row["created_at"],
        "last_indexed_at": row["last_indexed_at"],
    }


def add_vault(name: str, path: str) -> dict[str, Any]:
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

            return {
                "ok": True,
                "vault_id": vault_id,
            }

    except sqlite3.IntegrityError:
        return {
            "ok": False,
            "error": "A vault with this path already exists.",
        }

    except sqlite3.OperationalError as e:
        return {
            "ok": False,
            "error": f"Database operation failed: {e}",
        }


def get_vault(vault_id: int) -> dict[str, Any]:
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
            return {"ok": False, "error": f"No vault found with id: {vault_id}"}

        return {"ok": True, "vault": _serialize_vault(row)}

    except sqlite3.OperationalError as e:
        return {"ok": False, "error": f"Database operation failed: {e}"}


def touch_vault_indexed_at(path: str) -> dict[str, Any]:
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

            return {
                "ok": True,
                "updated": cursor.rowcount > 0,
            }

    except sqlite3.OperationalError as e:
        return {
            "ok": False,
            "error": f"Database operation failed: {e}",
        }
