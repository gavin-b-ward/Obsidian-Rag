from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
import os
from pathlib import Path
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import (
    add_vault as create_vault_record,
    get_files_for_vault,
    get_setting_value,
    get_vault,
    init_db,
    touch_files_indexed_at,
    touch_vault_indexed_at,
    upsert_file_record,
)
from embeddings.chat import answer_with_context
from embeddings.embeddings import index_paths, index_vault, retrieve_chunks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    query: str
    top_k: int = 5
    path: str | None = None
    collection_name: str | None = None


class VaultRequest(BaseModel):
    name: str
    path: str


class ErrorResponse(BaseModel):
    error: str
    msg: str
    resource: str


class EmbedRequest(BaseModel):
    path: str
    collection_name: str | None = None


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5
    path: str | None = None
    collection_name: str | None = None


def get_current_vault_path() -> str:
    current_vault = get_setting_value("current_vault")
    if not current_vault["ok"]:
        raise ValueError("No current vault is configured.")

    try:
        vault_id = int(current_vault["value"])
    except (TypeError, ValueError) as exc:
        raise ValueError("Current vault setting is invalid.") from exc

    vault_result = get_vault(vault_id)
    if not vault_result["ok"]:
        raise ValueError("Current vault record was not found.")

    return vault_result["vault"]["path"]


def check_reindexing() -> tuple[str | None, list[str]]:
    current_vault = get_setting_value("current_vault")
    if not current_vault["ok"]:
        logger.info("Skipping reindex check: no current vault configured")
        return None, []

    try:
        vault_id = int(current_vault["value"])
    except (TypeError, ValueError):
        logger.warning("Skipping reindex check: invalid current_vault value")
        return None, []

    vault_result = get_vault(vault_id)
    if not vault_result["ok"]:
        logger.warning("Skipping reindex check: current vault record was not found")
        return None, []

    file_records_result = get_files_for_vault(vault_id)
    if not file_records_result["ok"]:
        logger.warning("Skipping reindex check: failed to load file records")
        return None, []

    indexed_files = {row["path"]: row for row in file_records_result["files"]}

    vault_path = vault_result["vault"]["path"]
    top_level_folder = Path(vault_path)
    if not top_level_folder.exists():
        logger.warning(
            "Skipping reindex check: vault path does not exist: %s", vault_path
        )
        return None, []

    logger.info("Checking vault for reindexing: %s", vault_path)

    files_to_reindex: list[str] = []
    new_files_count = 0
    modified_files_count = 0

    for file_path in top_level_folder.rglob("*"):
        if not file_path.is_file():
            continue

        if file_path.suffix.lower() != ".md":
            continue

        resolved_path = str(file_path.resolve())
        mod_time = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
        file_record = indexed_files.get(resolved_path)

        if file_record is None:
            insert_result = upsert_file_record(vault_id, resolved_path, mod_time)
            if insert_result["ok"]:
                files_to_reindex.append(resolved_path)
                new_files_count += 1
                logger.info("Queued new file for indexing: %s", resolved_path)
            else:
                logger.warning("Failed to add missing file record: %s", resolved_path)
            continue

        indexed_at = file_record.get("indexed_at")
        if indexed_at is None:
            files_to_reindex.append(resolved_path)
            modified_files_count += 1
            logger.info("Queued file with missing indexed_at: %s", resolved_path)
            continue

        indexed_at_dt = datetime.strptime(indexed_at, "%Y-%m-%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )
        if mod_time > indexed_at_dt:
            files_to_reindex.append(resolved_path)
            modified_files_count += 1
            logger.info("Queued modified file for reindexing: %s", resolved_path)

    logger.info(
        "Reindex check complete: %s files queued (%s new, %s modified)",
        len(files_to_reindex),
        new_files_count,
        modified_files_count,
    )

    return vault_path, files_to_reindex


def init_program() -> None:
    init_db()
    vault_path, files_to_reindex = check_reindexing()
    if not files_to_reindex:
        logger.info("No files need reindexing at startup")
        return

    if vault_path is None:
        logger.warning("Skipping startup reindex: vault path unavailable")
        return

    logger.info("Reindexing %s files at startup", len(files_to_reindex))

    result = index_paths(vault_path=vault_path, paths=files_to_reindex)
    touch_files_indexed_at(files_to_reindex)
    touch_vault_indexed_at(vault_path)
    logger.info(
        "Startup reindex complete: %s documents, %s chunks",
        result["documents_indexed"],
        result["chunks_indexed"],
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_program()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# @app.get("/vaults")
# def get_vaults(filter: str | None)


@app.post("/vaults")
def add_vault(vault: VaultRequest) -> dict[str, Any]:
    if not os.path.exists(vault.path):
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error="BAD_REQUEST",
                msg="Invalid Vault Path",
                resource="path",
            ).model_dump(),
        )

    res = create_vault_record(vault.name, vault.path)

    if not res["ok"]:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="FAILED_INSERT",
                msg=res["error"],
                resource="vault",
            ).model_dump(),
        )

    return res


# @app.delete("/vaults/{vault_id}"


@app.post("/embed")
def embed_vault(request: EmbedRequest) -> dict[str, Any]:
    if not os.path.exists(request.path):
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error="BAD_REQUEST",
                msg="Invalid Vault Path",
                resource="path",
            ).model_dump(),
        )

    try:
        res = index_vault(request.path, request.collection_name)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error="BAD_REQUEST",
                msg=str(exc),
                resource="embedding",
            ).model_dump(),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="EMBED_FAILED",
                msg=str(exc),
                resource="embedding",
            ).model_dump(),
        ) from exc

    touch_vault_indexed_at(request.path)

    return {
        "ok": True,
        **res,
    }


@app.post("/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    try:
        resolved_path = request.path or get_current_vault_path()
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error="BAD_REQUEST",
                msg=str(exc),
                resource="vault",
            ).model_dump(),
        ) from exc

    try:
        retrieved = retrieve_chunks(
            query=request.query,
            top_k=request.top_k,
            path=resolved_path,
            collection_name=request.collection_name,
        )
    except ValueError as exc:
        logger.info("Index missing for %s, building it now", resolved_path)
        try:
            index_vault(resolved_path, request.collection_name)
            touch_vault_indexed_at(resolved_path)
            retrieved = retrieve_chunks(
                query=request.query,
                top_k=request.top_k,
                path=resolved_path,
                collection_name=request.collection_name,
            )
        except Exception as index_exc:
            raise HTTPException(
                status_code=400,
                detail=ErrorResponse(
                    error="BAD_REQUEST",
                    msg=str(exc),
                    resource="embedding",
                ).model_dump(),
            ) from index_exc

    answer = answer_with_context(
        query=request.query,
        chunks=retrieved["results"],
    )

    return {
        "ok": True,
        "answer": answer,
        "sources": [
            {
                "file_name": r["metadata"].get("file_name"),
                "file_path": r["metadata"].get("file_path"),
                "score": r["score"],
            }
            for r in retrieved["results"]
        ],
    }
