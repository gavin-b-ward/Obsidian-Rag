import type {
  AssistantMessageCompletedPayload,
  AssistantMessageDeltaPayload,
  AssistantMessageFailedPayload,
  ChatCreatedPayload,
  ChatMessageCreatedPayload,
  FetchChatResponse,
  FetchChatsResponse,
  FetchVaultsResponse,
  StreamChatParams,
  StreamEvent,
} from "../types/chat";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === "AbortError";
}

function isChatCreatedPayload(data: unknown): data is ChatCreatedPayload {
  return (
    isRecord(data)
    && isNumber(data.vault_id)
    && isNumber(data.chat_id)
    && isString(data.chat_title)
    && isNumber(data.msg_id)
  );
}

function isChatMessageCreatedPayload(data: unknown): data is ChatMessageCreatedPayload {
  return isRecord(data) && isNumber(data.vault_id) && isNumber(data.chat_id) && isNumber(data.msg_id);
}

function isAssistantMessageDeltaPayload(data: unknown): data is AssistantMessageDeltaPayload {
  return isRecord(data) && isNumber(data.msg_id) && isString(data.delta);
}

function isAssistantMessageCompletedPayload(data: unknown): data is AssistantMessageCompletedPayload {
  return isRecord(data) && isNumber(data.msg_id);
}

function isAssistantMessageFailedPayload(data: unknown): data is AssistantMessageFailedPayload {
  return isRecord(data) && isNumber(data.msg_id) && isString(data.error);
}

async function readJson(response: Response): Promise<unknown | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!isRecord(payload)) {
    return fallbackMessage;
  }

  const detail = payload.detail;

  if (isRecord(detail)) {
    if (isString(detail.msg) && detail.msg.length > 0) {
      return detail.msg;
    }

    if (isString(detail.error) && detail.error.length > 0) {
      return detail.error;
    }
  }

  if (isString(payload.message) && payload.message.length > 0) {
    return payload.message;
  }

  return fallbackMessage;
}

async function ensureOk(response: Response, fallbackMessage: string): Promise<Response> {
  if (response.ok) {
    return response;
  }

  const payload = await readJson(response);
  throw new Error(getErrorMessage(payload, fallbackMessage));
}

async function requestJson<T>(
  url: string,
  options: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(fallbackMessage, { cause: error });
  }

  await ensureOk(response, fallbackMessage);
  return (await response.json()) as T;
}

function parseJsonData(dataText: string): unknown {
  if (!dataText) {
    return null;
  }

  try {
    return JSON.parse(dataText) as unknown;
  } catch {
    return dataText;
  }
}

function parseEventChunk(chunk: string): StreamEvent {
  const lines = chunk.split(/\r?\n/);
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const parsedData = parseJsonData(dataLines.join("\n"));

  switch (eventName) {
    case "chat_created":
      return isChatCreatedPayload(parsedData)
        ? { event: eventName, data: parsedData }
        : { event: "unknown", rawEvent: eventName, data: parsedData };
    case "chat_message_created":
      return isChatMessageCreatedPayload(parsedData)
        ? { event: eventName, data: parsedData }
        : { event: "unknown", rawEvent: eventName, data: parsedData };
    case "assistant_message_delta":
      return isAssistantMessageDeltaPayload(parsedData)
        ? { event: eventName, data: parsedData }
        : { event: "unknown", rawEvent: eventName, data: parsedData };
    case "assistant_message_completed":
      return isAssistantMessageCompletedPayload(parsedData)
        ? { event: eventName, data: parsedData }
        : { event: "unknown", rawEvent: eventName, data: parsedData };
    case "assistant_message_failed":
      return isAssistantMessageFailedPayload(parsedData)
        ? { event: eventName, data: parsedData }
        : { event: "unknown", rawEvent: eventName, data: parsedData };
    default:
      return { event: "unknown", rawEvent: eventName, data: parsedData };
  }
}

async function streamSseResponse(
  response: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  await ensureOk(response, "Chat request failed.");

  if (!response.body) {
    throw new Error("Streaming response body was unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      if (!chunk.trim()) {
        continue;
      }

      onEvent(parseEventChunk(chunk));
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    onEvent(parseEventChunk(buffer));
  }
}

export async function fetchVaults(signal?: AbortSignal): Promise<FetchVaultsResponse> {
  return requestJson<FetchVaultsResponse>(
    `${API_BASE_URL}/v1/vaults/`,
    { signal },
    "Failed to load vaults. Start the backend or update VITE_API_BASE_URL.",
  );
}

export async function fetchChats(signal?: AbortSignal): Promise<FetchChatsResponse> {
  return requestJson<FetchChatsResponse>(
    `${API_BASE_URL}/v1/chats/`,
    { signal },
    "Failed to load chats. Start the backend or update VITE_API_BASE_URL.",
  );
}

export async function fetchChat(chatId: number, signal?: AbortSignal): Promise<FetchChatResponse> {
  return requestJson<FetchChatResponse>(
    `${API_BASE_URL}/v1/chats/${chatId}`,
    { signal },
    "Failed to load chat. Start the backend or update VITE_API_BASE_URL.",
  );
}

export async function streamChat({
  chatId,
  msg,
  onEvent,
  signal,
  vaultId,
}: StreamChatParams): Promise<void> {
  const endpoint = chatId == null ? "/v1/chats/" : `/v1/chats/${chatId}`;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vault_id: vaultId, msg }),
      signal,
    });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error("Failed to reach the chat API. Start the backend or update VITE_API_BASE_URL.", {
      cause: error,
    });
  }

  return streamSseResponse(response, onEvent);
}
