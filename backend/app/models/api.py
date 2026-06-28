from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    msg: str
    resource: str


class ChatRequest(BaseModel):
    query: str
    top_k: int = 5
    path: str | None = None
    collection_name: str | None = None


class ChatSource(BaseModel):
    file_name: str | None = None
    file_path: str | None = None
    score: float | None = None


class ChatResponse(BaseModel):
    ok: bool = True
    answer: str
    sources: list[ChatSource]


class EmbedRequest(BaseModel):
    path: str
    collection_name: str | None = None


class ChangedEmbedRequest(BaseModel):
    collection_name: str | None = None


class IndexResponse(BaseModel):
    ok: bool = True
    collection: str
    documents_indexed: int
    chunks_indexed: int


class ChangedIndexResponse(BaseModel):
    ok: bool = True
    collection: str
    files_indexed: int
    new_files: int
    modified_files: int
    chunks_indexed: int


class VaultRequest(BaseModel):
    name: str
    path: str


class VaultRecord(BaseModel):
    id: int
    name: str
    path: str
    created_at: str | None = None
    last_indexed_at: str | None = None


class CreateVaultResponse(BaseModel):
    ok: bool = True
    vault_id: int


class VaultListResponse(BaseModel):
    ok: bool = True
    vaults: list[VaultRecord]
