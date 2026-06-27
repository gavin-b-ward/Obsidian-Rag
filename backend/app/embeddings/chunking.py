from collections.abc import Sequence

from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import MarkdownNodeParser
from llama_index.core.schema import BaseNode, Document

from .config import embed_model


def create_chunk_pipeline() -> IngestionPipeline:
    return IngestionPipeline(
        transformations=[
            MarkdownNodeParser(),
            embed_model,
        ]
    )


def chunk_documents(
    documents: list[Document],
    pipeline: IngestionPipeline | None = None,
) -> Sequence[BaseNode]:
    active_pipeline = pipeline or create_chunk_pipeline()
    return active_pipeline.run(documents=documents)
