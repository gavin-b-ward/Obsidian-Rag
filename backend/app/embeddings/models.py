from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class IndexBuildResult:
    collection: str
    documents_indexed: int
    chunks_indexed: int


@dataclass(slots=True)
class RetrievalResult:
    collection: str
    results: list[dict[str, Any]]
