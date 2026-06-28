from fastapi import HTTPException

from .models.api import ErrorResponse


SETTING_NOT_FOUND = "No setting found with key: {key}"
VAULT_NOT_FOUND = "No vault found with id: {vault_id}"
CHAT_NOT_FOUND = "No chat found with id: {chat_id}"
CHAT_FOR_VAULT_NOT_FOUND = "No chat found with id: {chat_id} for vault id: {vault_id}"
MESSAGE_NOT_FOUND = "No message found with id: {message_id}"
CURRENT_VAULT_NOT_CONFIGURED = "No current vault is configured."
REQUESTED_VAULT_NOT_FOUND = "Requested vault was not found."
CURRENT_VAULT_RECORD_NOT_FOUND = "Current vault record was not found."
REQUESTED_CHAT_FOR_VAULT_NOT_FOUND = "Requested chat was not found for the current vault."


class AppError(Exception):
    pass


class RepositoryError(AppError):
    pass


class NotFoundError(AppError):
    pass


class ConflictError(AppError):
    pass


class ValidationError(AppError):
    pass


def to_http_exception(exc: AppError, resource: str) -> HTTPException:
    status_code = 500
    error = "APP_ERROR"

    if isinstance(exc, RepositoryError):
        error = "REPOSITORY_ERROR"
    elif isinstance(exc, NotFoundError):
        status_code = 404
        error = "NOT_FOUND"
    elif isinstance(exc, ConflictError):
        status_code = 409
        error = "CONFLICT"
    elif isinstance(exc, ValidationError):
        status_code = 400
        error = "VALIDATION_ERROR"

    return HTTPException(
        status_code=status_code,
        detail=ErrorResponse(
            error=error,
            msg=str(exc),
            resource=resource,
        ).model_dump(),
    )
