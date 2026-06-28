from typing import Any

from fastapi import APIRouter, Body

router = APIRouter(prefix="/v1/chat", tags=["chat"])


# Return all chats for the sidebar view, including title, vault, and updated time.
@router.get("/")
def get_chats() -> dict[str, Any]:
    raise NotImplementedError


# Return one chat and its stored messages for the requested chat id.
@router.get("/{chat_id}")
def get_chat(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError


# Create a new chat with its first user message and stream the app response.
@router.post("/")
def create_chat(payload: dict[str, Any] = Body(...)) -> Any:
    raise NotImplementedError


# Add a new user message to an existing chat and stream the app response.
@router.post("/{chat_id}")
def add_message_to_chat(chat_id: int, payload: dict[str, Any] = Body(...)) -> Any:
    raise NotImplementedError


# Rename an existing chat and return the updated chat metadata.
@router.patch("/{chat_id}")
def rename_chat(chat_id: int, payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    raise NotImplementedError


# Delete a chat and all of its stored messages.
@router.delete("/{chat_id}")
def delete_chat(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError
