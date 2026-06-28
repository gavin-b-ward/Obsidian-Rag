from typing import Any


# Load chat summaries for the frontend chat list.
def get_chats() -> dict[str, Any]:
    raise NotImplementedError


# Load one chat with its metadata and full message list.
def get_chat(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError


# Create a chat, save the first user message, and coordinate the streamed app reply.
def create_chat(payload: dict[str, Any]) -> Any:
    raise NotImplementedError


# Save a new user message on an existing chat and coordinate the streamed app reply.
def add_message_to_chat(chat_id: int, payload: dict[str, Any]) -> Any:
    raise NotImplementedError


# Rename a chat and return the updated chat metadata.
def rename_chat(chat_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    raise NotImplementedError


# Delete a chat and all messages associated with it.
def delete_chat(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError
