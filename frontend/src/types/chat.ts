export type AppTab = "focus" | "index";

export const modelIds = ["gpt4o", "claude", "llama"] as const;

export type ModelId = (typeof modelIds)[number];
export type MessageId = number | string;
export type MessageRole = "user" | "assistant";
export type BackendMessageRole = "user" | "app";
export type MessageStatus = "complete" | "streaming" | "failed";

export interface ModelOption {
  id: ModelId;
  label: string;
}

export interface VaultOption {
  id: number;
  label: string;
  indexedNotes: string;
  lastIndexed: string;
  retrievalHealth: string;
  recentSources: string[];
  path: string;
}

export interface ChatHistoryItem {
  id: number;
  label: string;
  faded: boolean;
  updatedAt: string | null;
  vaultId: number;
}

export interface ChatMessage {
  id: MessageId;
  role: MessageRole;
  status: MessageStatus;
  text: string;
  sources?: string[];
}

export interface ApiVault {
  id: number;
  name: string;
  path: string;
  created_at: string | null;
  last_indexed_at: string | null;
  files_indexed: number;
}

export interface FetchVaultsResponse {
  ok: boolean;
  vaults: ApiVault[];
}

export interface ApiChatSummary {
  id: number;
  vault_id: number;
  chat_title: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface FetchChatsResponse {
  chats: ApiChatSummary[];
}

export interface ApiMessage {
  id: number;
  chat_id: number;
  role: BackendMessageRole;
  msg: string;
  status: MessageStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface FetchChatResponse {
  chat: ApiChatSummary;
  messages: ApiMessage[];
}

export interface ChangedIndexResponse {
  ok: boolean;
  collection: string;
  files_indexed: number;
  total_files_indexed: number;
  new_files: number;
  modified_files: number;
  chunks_indexed: number;
}

export interface ChatCreatedPayload {
  vault_id: number;
  chat_id: number;
  chat_title: string;
  msg_id: number;
}

export interface ChatMessageCreatedPayload {
  vault_id: number;
  chat_id: number;
  msg_id: number;
}

export interface AssistantMessageDeltaPayload {
  msg_id: number;
  delta: string;
}

export interface AssistantMessageCompletedPayload {
  msg_id: number;
}

export interface AssistantMessageFailedPayload {
  msg_id: number;
  error: string;
}

export type StreamEvent =
  | { event: "chat_created"; data: ChatCreatedPayload }
  | { event: "chat_message_created"; data: ChatMessageCreatedPayload }
  | { event: "assistant_message_delta"; data: AssistantMessageDeltaPayload }
  | { event: "assistant_message_completed"; data: AssistantMessageCompletedPayload }
  | { event: "assistant_message_failed"; data: AssistantMessageFailedPayload }
  | { event: "unknown"; rawEvent: string; data: unknown };

export interface StreamChatParams {
  chatId: number | null;
  msg: string;
  onEvent: (event: StreamEvent) => void;
  signal: AbortSignal;
  vaultId: number;
}

export interface LoadChatOptions {
  nextVaultOptions?: VaultOption[];
  signal?: AbortSignal;
}

export function isModelId(value: string): value is ModelId {
  return modelIds.includes(value as ModelId);
}
