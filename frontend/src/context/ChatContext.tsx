import { createContext, useContext, useEffect, useRef, useState } from "react";
import { fetchChat, fetchChats, fetchVaults, streamChat } from "../lib/chatApi";

const ChatContext = createContext(null);

const modelOptions = [
  { id: "gpt4o", label: "GPT-4o" },
  { id: "claude", label: "Claude 3.5 Sonnet" },
  { id: "llama", label: "Local Llama" },
];

function createMessageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatSessionLabel(value) {
  if (!value) {
    return "New session";
  }

  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const timestamp = new Date(normalizedValue);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);

  if (timestamp.toDateString() === now.toDateString()) {
    return `Today, ${timeLabel}`;
  }

  if (timestamp.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeLabel}`;
  }

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(timestamp);

  return `${dateLabel}, ${timeLabel}`;
}

function normalizeVault(vault) {
  return {
    id: vault.id,
    label: vault.name,
    indexedNotes: "--",
    lastIndexed: vault.last_indexed_at ? formatSessionLabel(vault.last_indexed_at) : "Not indexed yet",
    retrievalHealth: vault.last_indexed_at ? "Ready" : "Pending",
    recentSources: [],
    path: vault.path,
  };
}

function normalizeChatSummary(chat) {
  return {
    id: chat.id,
    label: chat.chat_title,
    faded: false,
    updatedAt: chat.updated_at,
    vaultId: chat.vault_id,
  };
}

function normalizeMessage(message) {
  return {
    id: message.id,
    role: message.role === "app" ? "assistant" : "user",
    status: message.status,
    text: message.msg ?? "",
  };
}

function sortChats(chats) {
  return [...chats].sort((left, right) => {
    const leftTime = new Date((left.updatedAt ?? "").replace(" ", "T")).getTime();
    const rightTime = new Date((right.updatedAt ?? "").replace(" ", "T")).getTime();
    return rightTime - leftTime;
  });
}

function upsertChatSummary(historyItems, nextItem) {
  const remainingItems = historyItems.filter((item) => item.id !== nextItem.id);
  return sortChats([nextItem, ...remainingItems]);
}

export function ChatProvider({ children }) {
  const [vaultOptions, setVaultOptions] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [activeVaultId, setActiveVaultId] = useState(null);
  const [activeModelId, setActiveModelId] = useState(modelOptions[0].id);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeTab, setActiveTab] = useState("focus");
  const [draft, setDraft] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [chatError, setChatError] = useState("");
  const [sessionLabel, setSessionLabel] = useState("New session");
  const [messages, setMessages] = useState([]);
  const indexTimerRef = useRef(null);
  const streamAbortRef = useRef(null);

  const activeVault = vaultOptions.find((vault) => vault.id === activeVaultId) ?? vaultOptions[0] ?? null;
  const activeModel = modelOptions.find((model) => model.id === activeModelId) ?? modelOptions[0];

  function handleSelectVault(vaultId) {
    setActiveVaultId(vaultId);
    setActiveConversationId(null);
    setActiveTab("focus");
    setSessionLabel("New session");
    setMessages([]);
    setChatError("");
    stopActiveStream();
  }

  function stopActiveStream() {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

    setIsThinking(false);
    setIsStreaming(false);
  }

  function appendAssistantError(messageId, errorMessage) {
    const fallbackText = errorMessage || "The assistant response failed before it could complete.";

    setMessages((currentMessages) => {
      const hasExistingMessage = currentMessages.some((message) => message.id === messageId);

      if (!hasExistingMessage) {
        return [
          ...currentMessages,
          {
            id: messageId ?? createMessageId("assistant-error"),
            role: "assistant",
            status: "failed",
            text: fallbackText,
          },
        ];
      }

      return currentMessages.map((message) => (
        message.id === messageId
          ? { ...message, status: "failed", text: message.text || fallbackText }
          : message
      ));
    });
  }

  async function loadChatById(chatId, options = undefined) {
    const nextVaultOptions = options?.nextVaultOptions;
    const signal = options?.signal;
    const chatResult = await fetchChat(chatId, signal);
    const chronologicalMessages = [...(chatResult.messages ?? [])].reverse().map(normalizeMessage);
    const availableVaults = nextVaultOptions ?? vaultOptions;

    setActiveConversationId(chatId);
    setMessages(chronologicalMessages);
    setSessionLabel(formatSessionLabel(chatResult.chat?.created_at));
    setActiveVaultId(chatResult.chat?.vault_id ?? availableVaults[0]?.id ?? null);
    setChatError("");
  }

  useEffect(() => {
    const abortController = new AbortController();

    async function bootstrapChat() {
      setIsLoadingChat(true);
      setChatError("");

      try {
        const [vaultResult, chatsResult] = await Promise.all([
          fetchVaults(abortController.signal),
          fetchChats(abortController.signal),
        ]);
        const nextVaultOptions = (vaultResult.vaults ?? []).map(normalizeVault);
        const nextHistoryItems = sortChats((chatsResult.chats ?? []).map(normalizeChatSummary));

        setVaultOptions(nextVaultOptions);
        setHistoryItems(nextHistoryItems);

        if (nextHistoryItems.length > 0) {
          const chatResult = await fetchChat(nextHistoryItems[0].id, abortController.signal);
          setActiveConversationId(nextHistoryItems[0].id);
          setMessages([...(chatResult.messages ?? [])].reverse().map(normalizeMessage));
          setSessionLabel(formatSessionLabel(chatResult.chat?.created_at));
          setActiveVaultId(chatResult.chat?.vault_id ?? nextVaultOptions[0]?.id ?? null);
          return;
        }

        setActiveVaultId(nextVaultOptions[0]?.id ?? null);
        setActiveConversationId(null);
        setMessages([]);
        setSessionLabel("New session");
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setChatError(error.message || "Failed to load chat data.");
      } finally {
        setIsLoadingChat(false);
      }
    }

    bootstrapChat();

    return () => {
      abortController.abort();

      if (indexTimerRef.current) {
        window.clearTimeout(indexTimerRef.current);
      }

      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
    };
  }, []);

  const handleReindex = () => {
    if (isIndexing) {
      return;
    }

    if (indexTimerRef.current) {
      window.clearTimeout(indexTimerRef.current);
    }

    setIsIndexing(true);
    indexTimerRef.current = window.setTimeout(() => {
      setIsIndexing(false);
    }, 2200);
  };

  const handleSelectConversation = async (conversationId) => {
    stopActiveStream();
    setActiveTab("focus");
    setDraft("");
    setIsLoadingChat(true);

    try {
      await loadChatById(conversationId);
    } catch (error) {
      setChatError(error.message || "Failed to load chat.");
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleNewChat = () => {
    stopActiveStream();
    setActiveConversationId(null);
    setActiveTab("focus");
    setDraft("");
    setSessionLabel("New session");
    setMessages([]);
    setChatError("");
  };

  const handleSubmit = async () => {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft || isStreaming || activeVaultId == null) {
      return;
    }

    stopActiveStream();

    const nextUserMessage = {
      id: createMessageId("user"),
      role: "user",
      status: "complete",
      text: trimmedDraft,
    };
    const abortController = new AbortController();
    const fallbackAssistantId = createMessageId("assistant");
    let streamedAssistantId = null;
    let receivedFirstDelta = false;

    streamAbortRef.current = abortController;
    setActiveTab("focus");
    setDraft("");
    setChatError("");
    setIsThinking(true);
    setIsStreaming(true);
    setMessages((currentMessages) => [...currentMessages, nextUserMessage]);

    try {
      await streamChat({
        chatId: activeConversationId,
        msg: trimmedDraft,
        signal: abortController.signal,
        vaultId: activeVaultId,
        onEvent: ({ data, event }) => {
          if (event === "chat_created") {
            streamedAssistantId = data.msg_id;
            setActiveConversationId(data.chat_id);
            setActiveVaultId(data.vault_id);
            setSessionLabel(formatSessionLabel(new Date().toISOString()));
            setHistoryItems((currentItems) => upsertChatSummary(currentItems, {
              id: data.chat_id,
              label: data.chat_title,
              faded: false,
              updatedAt: new Date().toISOString(),
              vaultId: data.vault_id,
            }));
            return;
          }

          if (event === "chat_message_created") {
            streamedAssistantId = data.msg_id;
            setActiveConversationId(data.chat_id);
            setActiveVaultId(data.vault_id);
            setHistoryItems((currentItems) => {
              const currentItem = currentItems.find((item) => item.id === data.chat_id);

              if (!currentItem) {
                return currentItems;
              }

              return upsertChatSummary(currentItems, {
                ...currentItem,
                updatedAt: new Date().toISOString(),
              });
            });
            return;
          }

          if (event === "assistant_message_delta") {
            const nextAssistantId = data.msg_id ?? streamedAssistantId ?? fallbackAssistantId;
            streamedAssistantId = nextAssistantId;

            if (!receivedFirstDelta) {
              receivedFirstDelta = true;
              setIsThinking(false);
            }

            setMessages((currentMessages) => {
              const hasAssistantMessage = currentMessages.some((message) => message.id === nextAssistantId);

              if (!hasAssistantMessage) {
                return [
                  ...currentMessages,
                  {
                    id: nextAssistantId,
                    role: "assistant",
                    status: "streaming",
                    text: data.delta ?? "",
                  },
                ];
              }

              return currentMessages.map((message) => (
                message.id === nextAssistantId
                  ? { ...message, status: "streaming", text: `${message.text}${data.delta ?? ""}` }
                  : message
              ));
            });
            return;
          }

          if (event === "assistant_message_completed") {
            const nextAssistantId = data.msg_id ?? streamedAssistantId ?? fallbackAssistantId;
            streamedAssistantId = nextAssistantId;
            setIsThinking(false);
            setIsStreaming(false);
            setMessages((currentMessages) => {
              const hasAssistantMessage = currentMessages.some((message) => message.id === nextAssistantId);

              if (!hasAssistantMessage) {
                return [
                  ...currentMessages,
                  {
                    id: nextAssistantId,
                    role: "assistant",
                    status: "complete",
                    text: "",
                  },
                ];
              }

              return currentMessages.map((message) => (
                message.id === nextAssistantId ? { ...message, status: "complete" } : message
              ));
            });
            return;
          }

          if (event === "assistant_message_failed") {
            const nextAssistantId = data.msg_id ?? streamedAssistantId ?? fallbackAssistantId;
            streamedAssistantId = nextAssistantId;
            setIsThinking(false);
            setIsStreaming(false);
            appendAssistantError(nextAssistantId, data.error);
          }
        },
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        setChatError(error.message || "Chat request failed.");
        appendAssistantError(streamedAssistantId ?? fallbackAssistantId, error.message);
      }
    } finally {
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null;
      }

      setIsThinking(false);
      setIsStreaming(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        activeConversationId,
        activeModel,
        activeModelId,
        activeTab,
        activeVault,
        activeVaultId,
        chatError,
        draft,
        handleNewChat,
        handleReindex,
        handleSelectConversation,
        handleSubmit,
        historyItems,
        isIndexing,
        isLoadingChat,
        isStreaming,
        isThinking,
        messages,
        modelOptions,
        sessionLabel,
        setActiveModelId,
        setActiveTab,
        setActiveVaultId: handleSelectVault,
        setDraft,
        vaultOptions,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }

  return context;
}
