from fastapi import HTTPException

from .models.api import ErrorResponse


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
