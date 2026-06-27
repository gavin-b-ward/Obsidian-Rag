from llama_index.core import VectorStoreIndex

from .models import RetrievalResult
from .store import get_collection, get_vector_store


def load_index(
    path: str | None = None,
    collection_name: str | None = None,
) -> tuple[str, VectorStoreIndex]:
    resolved_name, chroma_collection = get_collection(
        path=path,
        collection_name=collection_name,
        create=False,
    )
    vector_store = get_vector_store(chroma_collection)
    index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
    return resolved_name, index


def retrieve_chunks(
    query: str,
    top_k: int = 5,
    path: str | None = None,
    collection_name: str | None = None,
) -> RetrievalResult:
    resolved_name, index = load_index(path=path, collection_name=collection_name)
    retriever = index.as_retriever(similarity_top_k=top_k)
    results = retriever.retrieve(query)
    return RetrievalResult(
        collection=resolved_name,
        results=[
            {
                "score": node.score,
                "text": node.text,
                "metadata": node.metadata,
            }
            for node in results
        ],
    )
