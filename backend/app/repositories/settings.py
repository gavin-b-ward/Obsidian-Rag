import sqlite3
from typing import Any

from ..db.connection import get_connection

def update_key_value(key: str, value: str) -> dict[str, Any]:
    try:
        with get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE settings
                SET value = ?
                WHERE key = ?;
                """,
                (value, key),
            )

            conn.commit()

            if cursor.rowcount == 0:
                return {
                    "ok": False,
                    "error": f"No setting found with key: {key}",
                }

            return {
                "ok": True,
                "key": key,
                "value": value,
            }

    except sqlite3.OperationalError as e:
        return {
            "ok": False,
            "error": f"Database operation failed: {e}",
        }

    except sqlite3.Error as e:
        return {
            "ok": False,
            "error": f"SQLite error: {e}",
        }


def get_setting_value(key: str) -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM settings
            WHERE key = ?;
            """,
            (key,),
        ).fetchone()

        if row is None:
            return {
                "ok": False,
                "error": f"No setting found with key: {key}",
            }

        return {
            "ok": True,
            "key": key,
            "value": row["value"],
        }

