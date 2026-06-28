from typing import Any


# Fetch all chats with the fields needed for the chat list view.
def get_chats() -> dict[str, Any]:
    raise NotImplementedError


# Fetch one chat record by id with its vault relationship fields.
def get_chat(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError


# Fetch all stored messages for a single chat.
def get_chat_messages(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError


# Create a new chat row tied to a vault.
def create_chat(payload: dict[str, Any]) -> dict[str, Any]:
    raise NotImplementedError


# Create a new message row for either the user or the app.
def create_message(chat_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    raise NotImplementedError


# Update the stored text for a partially streamed app message.
def update_message_text(message_id: int, message_text: str) -> dict[str, Any]:
    raise NotImplementedError


# Update the status for a stored app message.
def update_message_status(message_id: int, status: str) -> dict[str, Any]:
    raise NotImplementedError


# Update a chat timestamp after a new message or rename operation.
def touch_chat_updated_at(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError


# Rename a chat title.
def rename_chat(chat_id: int, chat_title: str) -> dict[str, Any]:
    raise NotImplementedError


# Delete a chat and rely on cascade behavior for child messages.
def delete_chat(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError
