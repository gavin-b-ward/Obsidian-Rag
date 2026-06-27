from pathlib import Path

import sqlite3

from .connection import get_connection

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def _has_column(conn: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table_name});").fetchall()
    return any(row[1] == column_name for row in rows)


def init_db() -> None:
    with get_connection() as conn:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema = f.read()

        conn.executescript(schema)

        if not _has_column(conn, "files", "modified_at"):
            conn.execute("ALTER TABLE files ADD COLUMN modified_at TEXT;")

        conn.execute(
            """
            UPDATE files
            SET modified_at = indexed_at
            WHERE modified_at IS NULL;
            """
        )

        conn.commit()
