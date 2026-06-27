from __future__ import annotations

import argparse
import hashlib
from datetime import UTC, datetime
from pathlib import Path

import chromadb

from db import init_db
from db.connection import get_connection

BASE_DIR = Path(__file__).resolve().parent
CHROMA_PATH = BASE_DIR / "data" / "chroma_db"


def _format_timestamp(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, tz=UTC).strftime("%Y-%m-%d %H:%M:%S")


def _hash_file(file_path: Path) -> str:
    digest = hashlib.sha256()
    with file_path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _discover_indexed_files(
    vault_path: Path, collection_name: str | None
) -> list[Path]:
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    collections = (
        [client.get_collection(collection_name)]
        if collection_name
        else [
            client.get_collection(collection.name)
            for collection in client.list_collections()
        ]
    )

    indexed_files: set[Path] = set()
    vault_root = vault_path.resolve()

    for collection in collections:
        total = collection.count()
        if total == 0:
            continue

        rows = collection.get(limit=total, include=["metadatas"])
        for metadata in rows.get("metadatas", []):
            if not metadata:
                continue

            raw_path = metadata.get("file_path")
            if not raw_path:
                continue

            file_path = Path(raw_path).resolve()
            if file_path.suffix != ".md":
                continue

            if vault_root == file_path or vault_root in file_path.parents:
                indexed_files.add(file_path)

    return sorted(indexed_files)


def _ensure_vault(conn, vault_path: str, vault_name: str) -> int:
    row = conn.execute(
        "SELECT id FROM vaults WHERE path = ?;",
        (vault_path,),
    ).fetchone()
    if row is not None:
        vault_id = row[0]
    else:
        cursor = conn.execute(
            "INSERT INTO vaults (name, path, last_indexed_at) VALUES (?, ?, CURRENT_TIMESTAMP);",
            (vault_name, vault_path),
        )
        vault_id = cursor.lastrowid

    conn.execute(
        """
        INSERT INTO settings (key, value)
        VALUES ('current_vault', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value;
        """,
        (str(vault_id),),
    )
    conn.execute(
        "UPDATE vaults SET last_indexed_at = CURRENT_TIMESTAMP WHERE id = ?;",
        (vault_id,),
    )
    return vault_id


def backfill(
    vault_path: Path, collection_name: str | None = None
) -> dict[str, int | str]:
    init_db()

    resolved_vault_path = vault_path.resolve()
    indexed_files = _discover_indexed_files(resolved_vault_path, collection_name)
    if not indexed_files:
        raise ValueError(f"No indexed markdown files found for {resolved_vault_path}")

    with get_connection() as conn:
        vault_id = _ensure_vault(
            conn, str(resolved_vault_path), resolved_vault_path.name
        )

        rows = []
        for file_path in indexed_files:
            if not file_path.exists():
                continue
            rows.append(
                (
                    vault_id,
                    str(file_path),
                    _hash_file(file_path),
                    _format_timestamp(file_path.stat().st_mtime),
                )
            )

        conn.executemany(
            """
            INSERT INTO files (vault_id, path, content_hash, modified_at, indexed_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(vault_id, path) DO UPDATE SET
                content_hash = excluded.content_hash,
                modified_at = excluded.modified_at,
                indexed_at = CURRENT_TIMESTAMP;
            """,
            rows,
        )
        conn.commit()

    return {
        "vault_id": vault_id,
        "vault_path": str(resolved_vault_path),
        "files_written": len(rows),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Backfill indexed Obsidian vault files into the app database."
    )
    parser.add_argument("vault_path", help="Absolute or relative path to the vault")
    parser.add_argument(
        "--collection",
        dest="collection_name",
        help="Optional Chroma collection name to read from",
    )
    args = parser.parse_args()

    result = backfill(Path(args.vault_path), args.collection_name)
    print(
        f"Backfilled {result['files_written']} files for vault {result['vault_id']} "
        f"({result['vault_path']})"
    )


if __name__ == "__main__":
    main()
