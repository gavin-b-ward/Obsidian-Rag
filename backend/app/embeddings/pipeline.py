from llama_index.core.schema import BaseNode, Document

from .chunking import chunk_documents
from .documents import load_documents_from_paths, load_documents_from_vault
from .indexing import build_index_from_nodes
from .models import IndexBuildResult


def prepare_vault_chunks(path: str) -> tuple[list[Document], list[BaseNode]]:
    documents = load_documents_from_vault(path)
    nodes = list(chunk_documents(documents))
    return documents, nodes


def prepare_path_chunks(paths: list[str]) -> tuple[list[Document], list[BaseNode]]:
    documents = load_documents_from_paths(paths)
    nodes = list(chunk_documents(documents))
    return documents, nodes


def save_prepared_chunks(
    *,
    nodes: list[BaseNode],
    vault_path: str,
    collection_name: str | None = None,
    reset: bool = False,
    replace_paths: list[str] | None = None,
    documents_indexed: int | None = None,
) -> IndexBuildResult:
    return build_index_from_nodes(
        nodes,
        path=vault_path,
        collection_name=collection_name,
        reset=reset,
        replace_paths=replace_paths,
        documents_indexed=documents_indexed,
    )
