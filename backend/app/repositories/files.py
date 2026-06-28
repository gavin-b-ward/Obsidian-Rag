import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path

from ..db.connection import get_connection
from ..errors import RepositoryError
from ..models.repository import (
    FileRow,
    GetFilesForVaultResult,
    TouchFilesIndexedAtResult,
    UpsertFileRecordResult,
)


def _serialize_file(row: sqlite3.Row) -> FileRow:
    return FileRow(
        id=row["id"],
        path=row["path"],
        content_hash=row["content_hash"],
        modified_at=row["modified_at"],
        indexed_at=row["indexed_at"],
    )


def get_files_for_vault(vault_id: int) -> GetFilesForVaultResult:
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

        return GetFilesForVaultResult(files=[_serialize_file(row) for row in rows])

    except sqlite3.OperationalError as e:
        raise RepositoryError(f"Database operation failed: {e}") from e


def _hash_file(file_path: Path) -> str:
    digest = hashlib.sha256()
    with file_path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def upsert_file_record(
    vault_id: int, file_path: str, modified_at: datetime
) -> UpsertFileRecordResult:
    path_obj = Path(file_path)

    try:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO files (vault_id, path, content_hash, modified_at, indexed_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(vault_id, path) DO UPDATE SET
                    content_hash = excluded.content_hash,
                    modified_at = excluded.modified_at,
                    indexed_at = CURRENT_TIMESTAMP;
                """,
                (
                    vault_id,
                    file_path,
                    _hash_file(path_obj),
                    modified_at.strftime("%Y-%m-%d %H:%M:%S"),
                ),
            )
            conn.commit()

        return UpsertFileRecordResult(path=file_path)

    except sqlite3.OperationalError as e:
        raise RepositoryError(f"Database operation failed: {e}") from e


def touch_files_indexed_at(paths: list[str]) -> TouchFilesIndexedAtResult:
    if not paths:
        return TouchFilesIndexedAtResult(updated=0)

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

        return TouchFilesIndexedAtResult(updated=cursor.rowcount)

    except sqlite3.OperationalError as e:
        raise RepositoryError(f"Database operation failed: {e}") from e
