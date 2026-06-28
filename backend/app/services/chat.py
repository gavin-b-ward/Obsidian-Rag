from importlib import metadata
import json
from collections.abc import Iterator
from os import stat
from typing import Any

from ..errors import RepositoryError, ValidationError
from ..models.api import ChatResponseMetadata
from ..repositories.chat import (
    create_chat as create_chat_record,
    create_message as create_message_record,
    update_message_text,
)
from .rag import stream_chat as stream_chat_response


def _sse_event(event: str, data: str) -> str:
    safe_data = data.replace("\n", "\ndata: ")
    return f"event: {event}\ndata: {safe_data}\n\n"


def _json_event(event: str, payload: dict[str, object]) -> str:
    return _sse_event(event, json.dumps(payload, separators=(",", ":")))


def _derive_chat_title(message: str, max_length: int = 80) -> str:
    title = " ".join(message.strip().split())
    if not title:
        raise ValidationError("Message cannot be empty.")

    if len(title) <= max_length:
        return title

    return f"{title[: max_length - 3].rstrip()}..."


# Load chat summaries for the frontend chat list.
def get_chats() -> dict[str, Any]:
    raise NotImplementedError


# Load one chat with its metadata and full message list.
def get_chat(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError


def event_stream(message_text: str, vault_path: str, metadata: dict[str, Any]) -> Iterator[str]:
    yield _sse_event("chat_created", json.dumps(metadata))

    full_response = ""
    msg_id = metadata.get("msg_id")

    if msg_id is None:
        raise ValueError("metadata missing msg_id")

    try:
        assistant_message_id = int(msg_id)
    except (TypeError, ValueError) as exc:
        raise TypeError("msg_id must be convertible to int") from exc
    

    try:
        for delta in stream_chat_response(message_text, path=vault_path):
            full_response += delta
            yield _json_event(
                "assistant_message_delta",
                {
                    "msg_id": assistant_message_id,
                    "delta": delta,
                },
            )

        update_message_text(assistant_message_id, full_response, status="complete")
        yield _json_event(
            "assistant_message_completed",
            {"msg_id": assistant_message_id},
        )
    except Exception as exc:
        try:
            update_message_text(assistant_message_id, full_response, status="failed")
        except RepositoryError:
            pass

        yield _json_event(
            "assistant_message_failed",
            {
                "msg_id": assistant_message_id,
                "error": str(exc),
            },
        )

# Create a chat, save the first user message, and coordinate the streamed app reply.
def create_chat(vault_id: int, message_text: str, vault_path: str) -> Iterator[str]:
    chat_title = _derive_chat_title(message_text)
    chat_result = create_chat_record(vault_id, chat_title)
    chat_row = chat_result.chat

    create_message_record(
        chat_row.id,
        role="user",
        msg=message_text,
        status="complete",
    )
    assistant_message = create_message_record(
        chat_row.id,
        role="app",
        msg="",
        status="streaming",
    ).message

    metadata = {
            "vault_id": vault_id,
            "chat_id":chat_row.id,
            "chat_title": chat_row.chat_title,
            "msg_id": assistant_message.id,
    }


    return event_stream(message_text, vault_path, metadata)


# Save a new user message on an existing chat and coordinate the streamed app reply.
def add_message_to_chat(chat_id: int, vault_id: int, vault_path: str, msg: str) -> Any:
    create_message_record(
        chat_id=chat_id, 
        role="user", 
        msg=msg,
        status="complete",
    )

    assistant_message = create_message_record(
        chat_id,
        role="app",
        msg="",
        status="streaming",
    ).message

    metadata = {
        "vault_id": vault_id,
        "chat_id":chat_id,
        "msg_id": assistant_message.id,
    }

    return event_stream(msg, vault_path, metadata)



# Rename a chat and return the updated chat metadata.
def rename_chat(chat_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    raise NotImplementedError


# Delete a chat and all messages associated with it.
def delete_chat(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError
