from collections.abc import Sequence
from typing import Any

from llama_index.core.schema import BaseNode

from .chunking import chunk_documents
from .documents import load_documents_from_paths, load_documents_from_vault
from .models import IndexBuildResult
from .store import save_nodes_to_collection


def build_index_from_nodes(
    nodes: Sequence[BaseNode],
    *,
    path: str,
    collection_name: str | None = None,
    reset: bool = False,
    replace_paths: list[str] | None = None,
    documents_indexed: int | None = None,
) -> IndexBuildResult:
    resolved_name, _ = save_nodes_to_collection(
        nodes=list(nodes),
        path=path,
        collection_name=collection_name,
        reset=reset,
        replace_paths=replace_paths,
    )
    return IndexBuildResult(
        collection=resolved_name,
        documents_indexed=documents_indexed or 0,
        chunks_indexed=len(nodes),
    )


def build_index_from_vault(
    path: str,
    collection_name: str | None = None,
) -> IndexBuildResult:
    documents = load_documents_from_vault(path)
    nodes = chunk_documents(documents)
    return build_index_from_nodes(
        nodes,
        path=path,
        collection_name=collection_name,
        reset=True,
        documents_indexed=len(documents),
    )


def build_index_from_paths(
    vault_path: str,
    paths: list[str],
    collection_name: str | None = None,
) -> IndexBuildResult:
    documents = load_documents_from_paths(paths)
    nodes = chunk_documents(documents)
    return build_index_from_nodes(
        nodes,
        path=vault_path,
        collection_name=collection_name,
        replace_paths=paths,
        documents_indexed=len(documents),
    )
