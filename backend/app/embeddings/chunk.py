import hashlib
import re
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import chromadb
from llama_index.core import SimpleDirectoryReader, Settings
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import MarkdownNodeParser
from llama_index.core.schema import BaseNode, Document
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.chroma import ChromaVectorStore

Settings.llm = Ollama(model="llama3.1:8b", request_timeout=300.0)

embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

Settings.embed_model = embed_model

BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_PATH = BASE_DIR / "data" / "chroma_db"
DEFAULT_COLLECTION = "obsidian_vault"


def _build_collection_name(path: str, collection_name: str | None = None) -> str:
    if collection_name:
        return collection_name

    path_hash = hashlib.sha1(path.encode("utf-8")).hexdigest()[:12]
    slug = re.sub(r"[^a-z0-9]+", "-", Path(path).name.lower()).strip("-")
    slug = slug or DEFAULT_COLLECTION

    return f"{slug}-{path_hash}"[:63]


def _get_collection(
    path: str | None = None,
    collection_name: str | None = None,
    create: bool = False,
    reset: bool = False,
) -> tuple[str, Any]:
    chroma_client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    resolved_name = _build_collection_name(path or DEFAULT_COLLECTION, collection_name)

    if create:
        if reset:
            try:
                chroma_client.delete_collection(name=resolved_name)
            except Exception:
                pass

        collection = chroma_client.get_or_create_collection(name=resolved_name)
    else:
        try:
            collection = chroma_client.get_collection(name=resolved_name)
        except Exception as exc:
            raise ValueError(
                f"No index found for collection '{resolved_name}'. Run /embed first."
            ) from exc

    return resolved_name, collection


# takes a path vault and generates chunks for each of the files under it
def generate_chunks_from_vault(path: str) -> tuple[list[Document], Sequence[BaseNode]]:
    documents = SimpleDirectoryReader(
        path, recursive=True, required_exts=[".md"]
    ).load_data()

    pipeline = IngestionPipeline(
        transformations=[
            MarkdownNodeParser(),
            embed_model,
        ]
    )

    nodes = pipeline.run(documents=documents)
    return documents, nodes


def generate_chunks_from_paths(
    paths: list[str],
) -> tuple[list[Document], Sequence[BaseNode]]:
    documents = SimpleDirectoryReader(
        input_files=[str(path) for path in paths],
        required_exts=[".md"],
    ).load_data()

    pipeline = IngestionPipeline(
        transformations=[
            MarkdownNodeParser(),
            embed_model,
        ]
    )

    nodes = pipeline.run(documents=documents)
    return documents, nodes




def load_chroma_index(
    path: str | None = None, collection_name: str | None = None
) -> tuple[str, Any]:
    resolved_name, chroma_collection = _get_collection(
        path=path,
        collection_name=collection_name,
        create=False,
    )

    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

    index = VectorStoreIndex.from_vector_store(vector_store=vector_store)

    return resolved_name, index




def retrieve_chunks(
    query: str,
    top_k: int = 5,
    path: str | None = None,
    collection_name: str | None = None,
) -> dict[str, Any]:
    resolved_name, index = load_chroma_index(path=path, collection_name=collection_name)

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


