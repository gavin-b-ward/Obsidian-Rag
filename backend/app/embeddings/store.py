import hashlib
import re
from pathlib import Path
from typing import Any

import chromadb
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.schema import BaseNode
from llama_index.vector_stores.chroma import ChromaVectorStore

from .config import CHROMA_PATH 




# TODO: Break this up into seperate functions, one to create a collection, one to delete a collection, get existing
def get_collection(
    collection_name: str,
    path: str | None = None,
    *,
    create: bool = False,
    reset: bool = False,
) -> tuple[str, Any]:
    chroma_client = chromadb.PersistentClient(path=str(CHROMA_PATH))

    if create:
        if reset:
            try:
                chroma_client.delete_collection(name=collection_name)
            except Exception:
                pass

        collection = chroma_client.get_or_create_collection(name=collection_name)
        return collection_name, collection

    try:
        collection = chroma_client.get_collection(name=collection_name)
    except Exception as exc:
        raise ValueError(
            f"No index found for collection '{collection_name}'. Run /embed first."
        ) from exc

    return collection_name, collection


def get_vector_store(chroma_collection: Any) -> ChromaVectorStore:
    return ChromaVectorStore(chroma_collection=chroma_collection)


def create_storage_context(chroma_collection: Any) -> StorageContext:
    vector_store = get_vector_store(chroma_collection)
    return StorageContext.from_defaults(vector_store=vector_store)


def delete_existing_path_nodes(chroma_collection: Any, paths: list[str]) -> None:
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


def save_nodes_to_collection(
    collection_name: str,
    nodes: list[BaseNode] | Any,
    path: str,
    *,
    reset: bool = False,
    replace_paths: list[str] | None = None,
) -> tuple[str, VectorStoreIndex]:
    collection_name, chroma_collection = get_collection(
        path=path,
        collection_name=collection_name,
        create=True,
        reset=reset,
    )

    if replace_paths:
        delete_existing_path_nodes(chroma_collection, replace_paths)

    storage_context = create_storage_context(chroma_collection)
    index = VectorStoreIndex(nodes, storage_context=storage_context)
    return collection_name, index
