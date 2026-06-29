const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getErrorMessage(payload, fallbackMessage) {
  return payload?.detail?.msg ?? payload?.detail?.error ?? payload?.message ?? fallbackMessage;
}

async function ensureOk(response, fallbackMessage) {
  if (response.ok) {
    return response;
  }

  const payload = await readJson(response);
  throw new Error(getErrorMessage(payload, fallbackMessage));
}

async function requestJson(url, options, fallbackMessage) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(fallbackMessage, { cause: error });
  }

  await ensureOk(response, fallbackMessage);
  return response.json();
}

function parseEventChunk(chunk) {
  const lines = chunk.split(/\r?\n/);
  let eventName = "message";
  const dataLines = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const dataText = dataLines.join("\n");

  try {
    return { event: eventName, data: JSON.parse(dataText) };
  } catch {
    return { event: eventName, data: dataText };
  }
}

async function streamSseResponse(response, onEvent) {
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

export async function fetchVaults(signal) {
  return requestJson(
    `${API_BASE_URL}/v1/vaults/`,
    { signal },
    "Failed to load vaults. Start the backend or update VITE_API_BASE_URL.",
  );
}

export async function fetchChats(signal) {
  return requestJson(
    `${API_BASE_URL}/v1/chats/`,
    { signal },
    "Failed to load chats. Start the backend or update VITE_API_BASE_URL.",
  );
}

export async function fetchChat(chatId, signal) {
  return requestJson(
    `${API_BASE_URL}/v1/chats/${chatId}`,
    { signal },
    "Failed to load chat. Start the backend or update VITE_API_BASE_URL.",
  );
}

export async function streamChat({ chatId, msg, onEvent, signal, vaultId }) {
  const endpoint = chatId == null ? "/v1/chats/" : `/v1/chats/${chatId}`;
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vault_id: vaultId, msg }),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error("Failed to reach the chat API. Start the backend or update VITE_API_BASE_URL.", {
      cause: error,
    });
  }

  return streamSseResponse(response, onEvent);
}
