import sqlite3

from ..db.connection import get_connection
from ..errors import RepositoryError, SETTING_NOT_FOUND
from ..models.repository import SettingValueResult


def update_key_value(key: str, value: str) -> SettingValueResult:
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
                raise RepositoryError(SETTING_NOT_FOUND.format(key=key))

            return SettingValueResult(key=key, value=value)

    except sqlite3.OperationalError as e:
        raise RepositoryError(f"Database operation failed: {e}") from e

    except sqlite3.Error as e:
        raise RepositoryError(f"SQLite error: {e}") from e


def get_setting_value(key: str) -> SettingValueResult:
    try:
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
                raise RepositoryError(SETTING_NOT_FOUND.format(key=key))

            return SettingValueResult(key=key, value=row["value"])

    except sqlite3.OperationalError as e:
        raise RepositoryError(f"Database operation failed: {e}") from e

    except sqlite3.Error as e:
        raise RepositoryError(f"SQLite error: {e}") from e
