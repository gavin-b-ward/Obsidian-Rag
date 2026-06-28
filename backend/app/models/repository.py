from typing import Literal

from pydantic import BaseModel


class VaultRow(BaseModel):
    id: int
    name: str
    path: str
    created_at: str | None = None
    last_indexed_at: str | None = None


class FileRow(BaseModel):
    id: int
    path: str
    content_hash: str
    modified_at: str | None = None
    indexed_at: str | None = None


class ChatRow(BaseModel):
    id: int
    vault_id: int
    chat_title: str
    created_at: str | None = None
    updated_at: str | None = None


class MessageRow(BaseModel):
    id: int
    chat_id: int
    role: str
    msg: str
    status: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class CreateVaultResult(BaseModel):
    ok: Literal[True] = True
    vault_id: int


class GetVaultResult(BaseModel):
    ok: Literal[True] = True
    vault: VaultRow


class ListVaultsResult(BaseModel):
    ok: Literal[True] = True
    vaults: list[VaultRow]


class TouchVaultIndexedAtResult(BaseModel):
    ok: Literal[True] = True
    updated: bool


class GetFilesForVaultResult(BaseModel):
    ok: Literal[True] = True
    files: list[FileRow]


class UpsertFileRecordResult(BaseModel):
    ok: Literal[True] = True
    path: str


class TouchFilesIndexedAtResult(BaseModel):
    ok: Literal[True] = True
    updated: int


class SettingValueResult(BaseModel):
    ok: Literal[True] = True
    key: str
    value: str


class GetChatsResult(BaseModel):
    ok: Literal[True] = True
    chats: list[ChatRow]


class GetChatResult(BaseModel):
    ok: Literal[True] = True
    chat: ChatRow


class GetChatMessagesResult(BaseModel):
    ok: Literal[True] = True
    messages: list[MessageRow]


class CreateChatResult(BaseModel):
    ok: Literal[True] = True
    chat: ChatRow


class CreateMessageResult(BaseModel):
    ok: Literal[True] = True
    message: MessageRow


class UpdateMessageTextResult(BaseModel):
    ok: Literal[True] = True
    message: MessageRow


class UpdateMessageStatusResult(BaseModel):
    ok: Literal[True] = True
    message: MessageRow


class TouchChatUpdatedAtResult(BaseModel):
    ok: Literal[True] = True
    chat: ChatRow


class RenameChatResult(BaseModel):
    ok: Literal[True] = True
    chat: ChatRow


class DeleteChatResult(BaseModel):
    ok: Literal[True] = True
    deleted: bool
