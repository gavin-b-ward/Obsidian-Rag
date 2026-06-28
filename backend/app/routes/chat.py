from typing import Any

from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse

from ..errors import (
    AppError,
    CURRENT_VAULT_NOT_CONFIGURED,
    NotFoundError,
    RepositoryError,
    REQUESTED_VAULT_NOT_FOUND,
    SETTING_NOT_FOUND,
    ValidationError,
    VAULT_NOT_FOUND,
    to_http_exception,
)
from ..models.api import ChatRequest, MsgRequest
from ..repositories.settings import get_setting_value
from ..repositories.vaults import get_vault
from ..services.chat import create_chat as create_chat_service, add_message_to_chat as create_message_service

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
def create_chat(chat_request: ChatRequest = Body(...)) -> StreamingResponse:
    try:
        message_text = chat_request.msg.strip()
        if not message_text:
            raise ValidationError("Message cannot be empty.")

        try:
            current_vault = get_setting_value("current_vault")
        except RepositoryError as exc:
            if str(exc) == SETTING_NOT_FOUND.format(key="current_vault"):
                raise NotFoundError(CURRENT_VAULT_NOT_CONFIGURED) from exc

            raise

        try:
            current_vault_id = int(current_vault.value)
        except (TypeError, ValueError) as exc:
            raise ValidationError("Current vault setting is invalid.") from exc

        if chat_request.vault_id != current_vault_id:
            raise ValidationError("Requested vault does not match the current vault.")

        try:
            vault = get_vault(chat_request.vault_id)
        except RepositoryError as exc:
            if str(exc) == VAULT_NOT_FOUND.format(vault_id=chat_request.vault_id):
                raise NotFoundError(REQUESTED_VAULT_NOT_FOUND) from exc

            raise

        stream = create_chat_service(
            vault_id=chat_request.vault_id,
            message_text=message_text,
            vault_path=vault.vault.path,
        )
    except AppError as exc:
        raise to_http_exception(exc, "chat") from exc

    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# Add a new user message to an existing chat and stream the app response.
@router.post("/{chat_id}")
def add_message_to_chat(chat_id: int, msg_request: MsgRequest = Body(...)) -> Any:
    try:
        message_text = msg_request.msg.strip()
        if not message_text:
            raise ValidationError("Message cannot be empty.")

        try:
            current_vault = get_setting_value("current_vault")
        except RepositoryError as exc:
            if str(exc) == SETTING_NOT_FOUND.format(key="current_vault"):
                raise NotFoundError(CURRENT_VAULT_NOT_CONFIGURED) from exc
            raise

        try:
            current_vault_id = int(current_vault.value)
        except (TypeError, ValueError) as exc:
            raise ValidationError("Current vault setting is invalid.") from exc

        if msg_request.vault_id != current_vault_id:
            raise ValidationError("Requested vault does not match the current vault.")

        try:
            vault = get_vault(msg_request.vault_id)
        except RepositoryError as exc:
            if str(exc) == VAULT_NOT_FOUND.format(vault_id=msg_request.vault_id):
                raise NotFoundError(REQUESTED_VAULT_NOT_FOUND) from exc

            raise

        stream = create_message_service(
                chat_id, 
                current_vault_id,
                vault.vault.path,
                message_text
        )

    except AppError as exc:
        raise to_http_exception(exc, "chat") from exc

    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
    raise NotImplementedError


# Rename an existing chat and return the updated chat metadata.
@router.patch("/{chat_id}")
def rename_chat(chat_id: int, payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    raise NotImplementedError


# Delete a chat and all of its stored messages.
@router.delete("/{chat_id}")
def delete_chat(chat_id: int) -> dict[str, Any]:
    raise NotImplementedError
