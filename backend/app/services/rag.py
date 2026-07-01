import hashlib
import re
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import chromadb
from llama_index.core import Settings, SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import MarkdownNodeParser
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.chroma import ChromaVectorStore

from ..errors import (
    CURRENT_VAULT_NOT_CONFIGURED,
    CURRENT_VAULT_RECORD_NOT_FOUND,
    NotFoundError,
    RepositoryError,
    SETTING_NOT_FOUND,
    ValidationError,
    VAULT_NOT_FOUND,
)
from ..repositories.files import (
    get_files_for_vault,
    upsert_file_record,
)
from ..repositories.settings import get_setting_value
from ..repositories.vaults import get_vault, touch_vault_indexed_at

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CHROMA_PATH = BASE_DIR / "data" / "chroma_db"
DEFAULT_COLLECTION = "obsidian-vault"


@lru_cache(maxsize=1)
def _get_llm() -> Ollama:
    return Ollama(model="llama3.1:8b", request_timeout=300.0)


@lru_cache(maxsize=1)
def _get_embed_model() -> HuggingFaceEmbedding:
    return HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")


def _configure_models() -> None:
    Settings.llm = _get_llm()
    Settings.embed_model = _get_embed_model()


def _resolve_collection_name(path: str, collection_name: str | None = None) -> str:
    if collection_name:
        return collection_name

    path_hash = hashlib.sha1(path.encode("utf-8")).hexdigest()[:12]
    slug = re.sub(r"[^a-z0-9]+", "-", Path(path).name.lower()).strip("-")
    slug = slug or DEFAULT_COLLECTION
    return f"{slug}-{path_hash}"[:63]


def _get_collection(
    path: str | None = None,
    collection_name: str | None = None,
    *,
    create: bool = False,
    reset: bool = False,
) -> tuple[str, Any]:
    chroma_client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    resolved_name = _resolve_collection_name(path or DEFAULT_COLLECTION, collection_name)

    if create:
        if reset:
            try:
                chroma_client.delete_collection(name=resolved_name)
            except Exception:
                pass

        collection = chroma_client.get_or_create_collection(name=resolved_name)
        return resolved_name, collection

    try:
        collection = chroma_client.get_collection(name=resolved_name)
    except Exception as exc:
        raise NotFoundError(
            f"No index found for collection '{resolved_name}'. Run /embed first."
        ) from exc

    return resolved_name, collection


def _load_documents_from_vault(path: str):
    _configure_models()
    return SimpleDirectoryReader(
        path,
        recursive=True,
        required_exts=[".md"],
    ).load_data()


def _load_documents_from_paths(paths: list[str]):
    _configure_models()
    return SimpleDirectoryReader(
        input_files=paths,
        required_exts=[".md"],
    ).load_data()


def _upsert_documents_for_vault(vault_id: int, documents: list[Any]) -> None:
    for document in documents:
        file_path = document.metadata.get("file_path")
        if not file_path:
            continue

        path_obj = Path(file_path)
        modified_at = datetime.fromtimestamp(path_obj.stat().st_mtime, tz=timezone.utc)
        upsert_file_record(vault_id, str(path_obj.resolve()), modified_at)


def _chunk_documents(documents: list[Any]) -> list[Any]:
    _configure_models()
    pipeline = IngestionPipeline(
        transformations=[
            MarkdownNodeParser(),
            _get_embed_model(),
        ]
    )
    return list(pipeline.run(documents=documents))


def _delete_existing_path_nodes(chroma_collection: Any, paths: list[str]) -> None:
    if not paths:
        return

    rows = chroma_collection.get(include=["metadatas"])
    ids_to_delete = [
        node_id
        for node_id, metadata in zip(
            rows.get("ids", []), rows.get("metadatas", []), strict=False
        )
        if metadata and metadata.get("file_path") in paths
    ]

    if ids_to_delete:
        chroma_collection.delete(ids=ids_to_delete)


def _save_nodes(
    *,
    nodes: list[Any],
    path: str,
    collection_name: str | None = None,
    reset: bool = False,
    replace_paths: list[str] | None = None,
) -> str:
    resolved_name, chroma_collection = _get_collection(
        path=path,
        collection_name=collection_name,
        create=True,
        reset=reset,
    )

    if replace_paths:
        _delete_existing_path_nodes(chroma_collection, replace_paths)

    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    VectorStoreIndex(nodes, storage_context=storage_context)
    return resolved_name


def get_current_vault_path() -> str:
    try:
        current_vault = get_setting_value("current_vault")
    except RepositoryError as exc:
        if str(exc) == SETTING_NOT_FOUND.format(key="current_vault"):
            raise NotFoundError(CURRENT_VAULT_NOT_CONFIGURED) from exc

        raise

    try:
        vault_id = int(current_vault.value)
    except (TypeError, ValueError) as exc:
        raise ValidationError("Current vault setting is invalid.") from exc

    try:
        vault_result = get_vault(vault_id)
    except RepositoryError as exc:
        if str(exc) == VAULT_NOT_FOUND.format(vault_id=vault_id):
            raise NotFoundError(CURRENT_VAULT_RECORD_NOT_FOUND) from exc

        raise

    return vault_result.vault.path


def _get_current_vault_record() -> dict[str, Any]:
    try:
        current_vault = get_setting_value("current_vault")
    except RepositoryError as exc:
        if str(exc) == SETTING_NOT_FOUND.format(key="current_vault"):
            raise NotFoundError(CURRENT_VAULT_NOT_CONFIGURED) from exc

        raise

    try:
        vault_id = int(current_vault.value)
    except (TypeError, ValueError) as exc:
        raise ValidationError("Current vault setting is invalid.") from exc

    try:
        vault_result = get_vault(vault_id)
    except RepositoryError as exc:
        if str(exc) == VAULT_NOT_FOUND.format(vault_id=vault_id):
            raise NotFoundError(CURRENT_VAULT_RECORD_NOT_FOUND) from exc

        raise

    return {
        "id": vault_id,
        "path": vault_result.vault.path,
    }


def _find_changed_files(
    vault_id: int, vault_path: str
) -> tuple[list[tuple[str, datetime]], int, int]:
    file_records_result = get_files_for_vault(vault_id)

    indexed_files = {row.path: row for row in file_records_result.files}
    top_level_folder = Path(vault_path)
    if not top_level_folder.exists():
        raise ValidationError("Current vault path does not exist.")

    files_to_index: list[tuple[str, datetime]] = []
    new_files_count = 0
    modified_files_count = 0

    for file_path in top_level_folder.rglob("*"):
        if not file_path.is_file() or file_path.suffix.lower() != ".md":
            continue

        resolved_path = str(file_path.resolve())
        modified_at = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
        file_record = indexed_files.get(resolved_path)

        should_index = False
        if file_record is None:
            should_index = True
            new_files_count += 1
        else:
            indexed_at = file_record.indexed_at
            if indexed_at is None:
                should_index = True
                modified_files_count += 1
            else:
                indexed_at_dt = datetime.strptime(indexed_at, "%Y-%m-%d %H:%M:%S").replace(
                    tzinfo=timezone.utc
                )
                if modified_at > indexed_at_dt:
                    should_index = True
                    modified_files_count += 1

        if not should_index:
            continue

        files_to_index.append((resolved_path, modified_at))

    return files_to_index, new_files_count, modified_files_count


def _get_indexed_file_paths(path: str | None = None) -> list[str]:
    current_vault = _get_current_vault_record()
    resolved_path = path or current_vault["path"]

    if resolved_path != current_vault["path"]:
        return sorted(
            str(file_path.resolve())
            for file_path in Path(resolved_path).rglob("*.md")
            if file_path.is_file()
        )

    file_rows = get_files_for_vault(current_vault["id"]).files
    if file_rows:
        return sorted(row.path for row in file_rows)

    return sorted(
        str(file_path.resolve())
        for file_path in Path(resolved_path).rglob("*.md")
        if file_path.is_file()
    )


def _answer_index_status_query(query: str, path: str | None = None) -> str | None:
    normalized_query = re.sub(r"\s+", " ", query.strip().lower())
    asks_for_count = bool(
        re.search(r"how many .*?(notes|files).*(indexed|index)", normalized_query)
        or re.search(r"(indexed|index).*(how many|number of).*(notes|files)", normalized_query)
    )
    asks_for_list = bool(
        re.search(r"(which|what|list|show).*(notes|files).*(indexed|index)", normalized_query)
        or re.search(r"(indexed|index).*(notes|files).*(which|what|list|show)", normalized_query)
    )

    if not asks_for_count and not asks_for_list:
        return None

    indexed_paths = _get_indexed_file_paths(path)
    note_names = [Path(file_path).name for file_path in indexed_paths]
    count_line = f"You have {len(note_names)} notes indexed."

    if not asks_for_list:
        return count_line

    if not note_names:
        return f"{count_line}\n\nNo indexed note names are available yet."

    note_list = "\n".join(f"- {note_name}" for note_name in note_names)
    return f"{count_line}\n\nIndexed notes:\n{note_list}"


def embed_vault(path: str, collection_name: str | None = None) -> dict[str, Any]:
    path_obj = Path(path)
    if not path_obj.exists():
        raise ValidationError("Invalid vault path.")

    documents = _load_documents_from_vault(str(path_obj))
    nodes = _chunk_documents(documents)
    resolved_name = _save_nodes(
        nodes=nodes,
        path=str(path_obj),
        collection_name=collection_name,
        reset=True,
    )
    try:
        current_vault = _get_current_vault_record()
    except NotFoundError:
        current_vault = None

    if current_vault and current_vault["path"] == str(path_obj):
        _upsert_documents_for_vault(current_vault["id"], documents)

    touch_vault_indexed_at(str(path_obj))

    return {
        "ok": True,
        "collection": resolved_name,
        "documents_indexed": len(documents),
        "chunks_indexed": len(nodes),
    }


def embed_changed_files(collection_name: str | None = None) -> dict[str, Any]:
    current_vault = _get_current_vault_record()
    vault_id = current_vault["id"]
    vault_path = current_vault["path"]
    files_to_index, new_files_count, modified_files_count = _find_changed_files(
        vault_id, vault_path
    )

    if not files_to_index:
        total_files_indexed = len(get_files_for_vault(vault_id).files)
        return {
            "ok": True,
            "collection": _resolve_collection_name(vault_path, collection_name),
            "files_indexed": 0,
            "total_files_indexed": total_files_indexed,
            "new_files": 0,
            "modified_files": 0,
            "chunks_indexed": 0,
        }

    file_paths = [file_path for file_path, _ in files_to_index]
    documents = _load_documents_from_paths(file_paths)
    nodes = _chunk_documents(documents)
    resolved_name = _save_nodes(
        nodes=nodes,
        path=vault_path,
        collection_name=collection_name,
        replace_paths=file_paths,
    )

    for file_path, modified_at in files_to_index:
        upsert_file_record(vault_id, file_path, modified_at)

    touch_vault_indexed_at(vault_path)
    total_files_indexed = len(get_files_for_vault(vault_id).files)

    return {
        "ok": True,
        "collection": resolved_name,
        "files_indexed": len(file_paths),
        "total_files_indexed": total_files_indexed,
        "new_files": new_files_count,
        "modified_files": modified_files_count,
        "chunks_indexed": len(nodes),
    }


def retrieve_chunks(
    query: str,
    top_k: int = 5,
    path: str | None = None,
    collection_name: str | None = None,
) -> dict[str, Any]:
    _configure_models()
    resolved_name, chroma_collection = _get_collection(
        path=path,
        collection_name=collection_name,
        create=False,
    )
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
    retriever = index.as_retriever(similarity_top_k=top_k)
    results = retriever.retrieve(query)

    return {
        "collection": resolved_name,
        "results": [
            {
                "score": node.score,
                "text": node.text,
                "metadata": node.metadata,
            }
            for node in results
        ],
    }


def answer_with_context(query: str, chunks: list[dict[str, Any]]) -> str:
    prompt = _build_answer_prompt(query=query, chunks=chunks)
    response = _get_llm().complete(prompt)
    return str(response)


def _build_answer_prompt(query: str, chunks: list[dict[str, Any]]) -> str:
    context = "\n\n---\n\n".join(
        f"Source: {chunk['metadata'].get('file_name')}\n\n{chunk['text']}"
        for chunk in chunks
    )

    return f"""
You are a helpful assistant answering questions using the user's Obsidian notes.

Use only the context below. If the answer is not in the context, say you don't know based on the notes.

Context:
{context}

Question:
{query}

Answer:
"""


def stream_chat(
    query: str,
    top_k: int = 5,
    path: str | None = None,
    collection_name: str | None = None,
):
    resolved_path = path or get_current_vault_path()
    direct_answer = _answer_index_status_query(query, resolved_path)
    if direct_answer is not None:
        yield direct_answer
        return

    try:
        retrieved = retrieve_chunks(
            query=query,
            top_k=top_k,
            path=resolved_path,
            collection_name=collection_name,
        )
    except NotFoundError:
        embed_vault(resolved_path, collection_name)
        retrieved = retrieve_chunks(
            query=query,
            top_k=top_k,
            path=resolved_path,
            collection_name=collection_name,
        )

    prompt = _build_answer_prompt(query=query, chunks=retrieved["results"])
    llm = _get_llm()

    if not hasattr(llm, "stream_complete"):
        yield str(llm.complete(prompt))
        return

    streamed_text = ""
    for chunk in llm.stream_complete(prompt):
        delta = getattr(chunk, "delta", None)
        if delta is None:
            next_text = str(getattr(chunk, "text", ""))
            if next_text.startswith(streamed_text):
                delta = next_text[len(streamed_text) :]
                streamed_text = next_text
            else:
                delta = next_text
                streamed_text += next_text
        else:
            streamed_text += delta

        if delta:
            yield delta


def chat(
    query: str,
    top_k: int = 5,
    path: str | None = None,
    collection_name: str | None = None,
) -> dict[str, Any]:
    resolved_path = path or get_current_vault_path()
    direct_answer = _answer_index_status_query(query, resolved_path)
    if direct_answer is not None:
        return {
            "ok": True,
            "answer": direct_answer,
            "sources": [],
        }

    try:
        retrieved = retrieve_chunks(
            query=query,
            top_k=top_k,
            path=resolved_path,
            collection_name=collection_name,
        )
    except NotFoundError:
        embed_vault(resolved_path, collection_name)
        retrieved = retrieve_chunks(
            query=query,
            top_k=top_k,
            path=resolved_path,
            collection_name=collection_name,
        )

    return {
        "ok": True,
        "answer": answer_with_context(query=query, chunks=retrieved["results"]),
        "sources": [
            {
                "file_name": result["metadata"].get("file_name"),
                "file_path": result["metadata"].get("file_path"),
                "score": result["score"],
            }
            for result in retrieved["results"]
        ],
    }
