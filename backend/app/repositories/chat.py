import sqlite3

from ..db.connection import get_connection
from ..errors import (
    CHAT_FOR_VAULT_NOT_FOUND,
    CHAT_NOT_FOUND,
    MESSAGE_NOT_FOUND,
    RepositoryError,
)
from ..models.repository import (
    ChatRow,
    CreateChatResult,
    CreateMessageResult,
    DeleteChatResult,
    GetChatDetailResult,
    GetChatMessagesResult,
    GetChatResult,
    GetChatsResult,
    MessageRow,
    RenameChatResult,
    TouchChatUpdatedAtResult,
    UpdateMessageStatusResult,
    UpdateMessageTextResult,
)


def _serialize_chat(row: sqlite3.Row) -> ChatRow:
    return ChatRow(
        id=row["id"],
        vault_id=row["vault_id"],
        chat_title=row["chat_title"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _serialize_message(row: sqlite3.Row) -> MessageRow:
    return MessageRow(
        id=row["id"],
        chat_id=row["chat_id"],
        role=row["role"],
        msg=row["msg"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _serialize_joined_chat(row: sqlite3.Row) -> ChatRow:
    return ChatRow(
        id=row["chat_id"],
        vault_id=row["chat_vault_id"],
        chat_title=row["chat_title"],
        created_at=row["chat_created_at"],
        updated_at=row["chat_updated_at"],
    )


def _serialize_joined_message(row: sqlite3.Row) -> MessageRow:
    return MessageRow(
        id=row["message_id"],
        chat_id=row["message_chat_id"],
        role=row["message_role"],
        msg=row["message_msg"],
        status=row["message_status"],
        created_at=row["message_created_at"],
        updated_at=row["message_updated_at"],
    )


# Fetch all chats with the fields needed for the chat list view.
def get_chats() -> GetChatsResult:
    try:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, vault_id, chat_title, created_at, updated_at
                FROM chats
                ORDER BY updated_at DESC, id DESC;
                """
            ).fetchall()

            return GetChatsResult(chats=[_serialize_chat(row) for row in rows])

    except sqlite3.OperationalError as exc:
        raise RepositoryError(f"Database operation failed: {exc}") from exc


# Fetch one chat record by id with its vault relationship fields.
def get_chat(chat_id: int) -> GetChatResult:
    try:
        with get_connection() as conn:
            row = conn.execute(
                """
                SELECT id, vault_id, chat_title, created_at, updated_at
                FROM chats
                WHERE id = ?;
                """,
                (chat_id,),
            ).fetchone()

            if row is None:
                raise RepositoryError(CHAT_NOT_FOUND.format(chat_id=chat_id))

            return GetChatResult(chat=_serialize_chat(row))

    except sqlite3.OperationalError as exc:
        raise RepositoryError(f"Database operation failed: {exc}") from exc


# Fetch one chat and all stored messages with a single joined query.
def get_chat_detail(chat_id: int) -> GetChatDetailResult:
    try:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT
                    chats.id AS chat_id,
                    chats.vault_id AS chat_vault_id,
                    chats.chat_title AS chat_title,
                    chats.created_at AS chat_created_at,
                    chats.updated_at AS chat_updated_at,
                    messages.id AS message_id,
                    messages.chat_id AS message_chat_id,
                    messages.role AS message_role,
                    messages.msg AS message_msg,
                    messages.status AS message_status,
                    messages.created_at AS message_created_at,
                    messages.updated_at AS message_updated_at
                FROM chats
                LEFT JOIN messages ON messages.chat_id = chats.id
                WHERE chats.id = ?
                ORDER BY messages.created_at DESC, messages.id DESC;
                """,
                (chat_id,),
            ).fetchall()

            if not rows:
                raise RepositoryError(CHAT_NOT_FOUND.format(chat_id=chat_id))

            chat = _serialize_joined_chat(rows[0])
            messages = [
                _serialize_joined_message(row)
                for row in rows
                if row["message_id"] is not None
            ]

            return GetChatDetailResult(chat=chat, messages=messages)

    except sqlite3.OperationalError as exc:
        raise RepositoryError(f"Database operation failed: {exc}") from exc


# Fetch all stored messages for a single chat.
def get_chat_messages(chat_id: int) -> GetChatMessagesResult:
    try:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, chat_id, role, msg, status, created_at, updated_at
                FROM messages
                WHERE chat_id = ?
                ORDER BY created_at DESC, id DESC;
                """,
                (chat_id,),
            ).fetchall()

            return GetChatMessagesResult(
                messages=[_serialize_message(row) for row in rows]
            )

    except sqlite3.OperationalError as exc:
        raise RepositoryError(f"Database operation failed: {exc}") from exc


# Create a new chat row tied to a vault.
def create_chat(vault_id: int, chat_title: str) -> CreateChatResult:
    try:
        with get_connection() as conn:
            row = conn.execute(
                """
                INSERT INTO chats (vault_id, chat_title)
                VALUES (?, ?)
                RETURNING id, vault_id, chat_title, created_at, updated_at;
                """,
                (vault_id, chat_title),
            ).fetchone()
            conn.commit()

            if row is None:
                raise RepositoryError("Could not create chat.")

            return CreateChatResult(chat=_serialize_chat(row))

    except sqlite3.IntegrityError as exc:
        raise RepositoryError(f"Could not create chat: {exc}") from exc
    except sqlite3.OperationalError as exc:
        raise RepositoryError(f"Database operation failed: {exc}") from exc


# Create a new message row for either the user or the app.
def create_message(
    chat_id: int, role: str, msg: str = "", status: str = "complete"
) -> CreateMessageResult:
    try:
        with get_connection() as conn:
            row = conn.execute(
                """
                INSERT INTO messages (chat_id, role, msg, status)
                VALUES (?, ?, ?, ?)
                RETURNING id, chat_id, role, msg, status, created_at, updated_at;
                """,
                (chat_id, role, msg, status),
            ).fetchone()
            conn.execute(
                """
                UPDATE chats
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """,
                (chat_id,),
            )
            conn.commit()

            if row is None:
                raise RepositoryError("Could not create message.")

            return CreateMessageResult(message=_serialize_message(row))

    except sqlite3.IntegrityError as exc:
        raise RepositoryError(f"Could not create message: {exc}") from exc
    except sqlite3.OperationalError as exc:
        raise RepositoryError(f"Database operation failed: {exc}") from exc


# Create a new message row only when the chat belongs to the expected vault.
def create_message_for_vault(
    chat_id: int,
    vault_id: int,
    role: str,
    msg: str = "",
    status: str = "complete",
) -> CreateMessageResult:
    try:
        with get_connection() as conn:
            row = conn.execute(
                """
                INSERT INTO messages (chat_id, role, msg, status)
                SELECT chats.id, ?, ?, ?
                FROM chats
                WHERE chats.id = ? AND chats.vault_id = ?
                RETURNING id, chat_id, role, msg, status, created_at, updated_at;
                """,
                (role, msg, status, chat_id, vault_id),
            ).fetchone()

            if row is None:
                raise RepositoryError(
                    CHAT_FOR_VAULT_NOT_FOUND.format(
                        chat_id=chat_id,
                        vault_id=vault_id,
                    )
                )

            conn.execute(
                """
                UPDATE chats
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """,
                (chat_id,),
            )
            conn.commit()

            return CreateMessageResult(message=_serialize_message(row))

    except sqlite3.IntegrityError as exc:
        raise RepositoryError(f"Could not create message: {exc}") from exc
    except sqlite3.OperationalError as exc:
        raise RepositoryError(f"Database operation failed: {exc}") from exc


# Update the stored text for a partially streamed app message.
def update_message_text(
    message_id: int, message_text: str, status: str = "complete"
) -> UpdateMessageTextResult:
    try:
        with get_connection() as conn:
            row = conn.execute(
                """
                UPDATE messages
                SET msg = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                RETURNING id, chat_id, role, msg, status, created_at, updated_at;
                """,
                (message_text, status, message_id),
            ).fetchone()
            if row is None:
                raise RepositoryError(MESSAGE_NOT_FOUND.format(message_id=message_id))

            conn.execute(
                """
                UPDATE chats
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = (
                    SELECT chat_id
                    FROM messages
                    WHERE id = ?
                );
                """,
                (message_id,),
            )
            conn.commit()

            return UpdateMessageTextResult(message=_serialize_message(row))

    except sqlite3.OperationalError as exc:
        raise RepositoryError(f"Database operation failed: {exc}") from exc


# Update the status for a stored app message.
def update_message_status(message_id: int, status: str) -> UpdateMessageStatusResult:
    raise NotImplementedError


# Update a chat timestamp after a new message or rename operation.
def touch_chat_updated_at(chat_id: int) -> TouchChatUpdatedAtResult:
    raise NotImplementedError


# Rename a chat title.
def rename_chat(chat_id: int, chat_title: str) -> RenameChatResult:
    raise NotImplementedError


# Delete a chat and rely on cascade behavior for child messages.
def delete_chat(chat_id: int) -> DeleteChatResult:
    raise NotImplementedError
