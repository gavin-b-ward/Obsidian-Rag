import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from .connection import get_connection


def get_files_for_vault(vault_id: int) -> dict[str, Any]:
    try:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, path, content_hash, modified_at, indexed_at
                FROM files
                WHERE vault_id = ?;
                """,
                (vault_id,),
            ).fetchall()

        return {
            "ok": True,
            "files": [dict(row) for row in rows],
        }

    except sqlite3.OperationalError as e:
        return {
            "ok": False,
            "error": f"Database operation failed: {e}",
        }


def _hash_file(file_path: Path) -> str:
    digest = hashlib.sha256()
    with file_path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def upsert_file_record(
    vault_id: int, file_path: str, modified_at: datetime
) -> dict[str, Any]:
    path_obj = Path(file_path)

    try:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO files (vault_id, path, content_hash, modified_at, indexed_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(vault_id, path) DO UPDATE SET
                    content_hash = excluded.content_hash,
                    modified_at = excluded.modified_at;
                """,
                (
                    vault_id,
                    file_path,
                    _hash_file(path_obj),
                    modified_at.strftime("%Y-%m-%d %H:%M:%S"),
                ),
            )
            conn.commit()

        return {
            "ok": True,
            "path": file_path,
        }

    except sqlite3.OperationalError as e:
        return {
            "ok": False,
            "error": f"Database operation failed: {e}",
        }


def touch_files_indexed_at(paths: list[str]) -> dict[str, Any]:
    if not paths:
        return {
            "ok": True,
            "updated": 0,
        }

    placeholders = ", ".join("?" for _ in paths)

    try:
        with get_connection() as conn:
            cursor = conn.execute(
                f"""
                UPDATE files
                SET indexed_at = CURRENT_TIMESTAMP
                WHERE path IN ({placeholders});
                """,
                tuple(paths),
            )
            conn.commit()

        return {
            "ok": True,
            "updated": cursor.rowcount,
        }

    except sqlite3.OperationalError as e:
        return {
            "ok": False,
            "error": f"Database operation failed: {e}",
        }


