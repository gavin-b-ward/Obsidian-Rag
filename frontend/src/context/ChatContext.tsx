import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren, type ReactElement } from "react";
import { fetchChat, fetchChats, fetchVaults, streamChat } from "../lib/chatApi";
import type {
  ApiChatSummary,
  ApiMessage,
  ApiVault,
  AppTab,
  ChatHistoryItem,
  ChatMessage,
  LoadChatOptions,
  MessageId,
  ModelId,
  ModelOption,
  StreamEvent,
  VaultOption,
} from "../types/chat";

interface ChatContextValue {
  activeConversationId: number | null;
  activeModel: ModelOption;
  activeModelId: ModelId;
  activeTab: AppTab;
  activeVault: VaultOption | null;
  activeVaultId: number | null;
  chatError: string;
  draft: string;
  handleNewChat: () => void;
  handleReindex: () => void;
  handleSelectConversation: (conversationId: number) => Promise<void>;
  handleSubmit: () => Promise<void>;
  historyItems: ChatHistoryItem[];
  isIndexing: boolean;
  isLoadingChat: boolean;
  isStreaming: boolean;
  isThinking: boolean;
  messages: ChatMessage[];
  modelOptions: ModelOption[];
  sessionLabel: string;
  setActiveModelId: (modelId: ModelId) => void;
  setActiveTab: (tab: AppTab) => void;
  setActiveVaultId: (vaultId: number | null) => void;
  setDraft: (draft: string) => void;
  vaultOptions: VaultOption[];
}

const ChatContext = createContext<ChatContextValue | null>(null);

const modelOptions: ModelOption[] = [
  { id: "gpt4o", label: "GPT-4o" },
  { id: "claude", label: "Claude 3.5 Sonnet" },
  { id: "llama", label: "Local Llama" },
];

function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}

function createMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatSessionLabel(value: string | null | undefined): string {
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

function normalizeVault(vault: ApiVault): VaultOption {
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

function normalizeChatSummary(chat: ApiChatSummary): ChatHistoryItem {
  return {
    id: chat.id,
    label: chat.chat_title,
    faded: false,
    updatedAt: chat.updated_at,
    vaultId: chat.vault_id,
  };
}

function normalizeMessage(message: ApiMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role === "app" ? "assistant" : "user",
    status: message.status,
    text: message.msg ?? "",
  };
}

function getTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value.replace(" ", "T")).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortChats(chats: ChatHistoryItem[]): ChatHistoryItem[] {
  return [...chats].sort((left, right) => {
    return getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt);
  });
}

function upsertChatSummary(
  historyItems: ChatHistoryItem[],
  nextItem: ChatHistoryItem,
): ChatHistoryItem[] {
  const remainingItems = historyItems.filter((item) => item.id !== nextItem.id);
  return sortChats([nextItem, ...remainingItems]);
}

export function ChatProvider({ children }: PropsWithChildren): ReactElement {
  const [vaultOptions, setVaultOptions] = useState<VaultOption[]>([]);
  const [historyItems, setHistoryItems] = useState<ChatHistoryItem[]>([]);
  const [activeVaultId, setActiveVaultIdState] = useState<number | null>(null);
  const [activeModelId, setActiveModelIdState] = useState<ModelId>(modelOptions[0]!.id);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [activeTab, setActiveTabState] = useState<AppTab>("focus");
  const [draft, setDraftState] = useState<string>("");
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(true);
  const [chatError, setChatError] = useState<string>("");
  const [sessionLabel, setSessionLabel] = useState<string>("New session");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const indexTimerRef = useRef<number | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  const activeVault = vaultOptions.find((vault) => vault.id === activeVaultId) ?? vaultOptions[0] ?? null;
  const activeModel = modelOptions.find((model) => model.id === activeModelId) ?? modelOptions[0]!;

  function setActiveModelId(modelId: ModelId): void {
    setActiveModelIdState(modelId);
  }

  function setActiveTab(tab: AppTab): void {
    setActiveTabState(tab);
  }

  function setDraft(nextDraft: string): void {
    setDraftState(nextDraft);
  }

  function handleSelectVault(vaultId: number | null): void {
    setActiveVaultIdState(vaultId);
    setActiveConversationId(null);
    setActiveTabState("focus");
    setSessionLabel("New session");
    setMessages([]);
    setChatError("");
    stopActiveStream();
  }

  function stopActiveStream(): void {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

    setIsThinking(false);
    setIsStreaming(false);
  }

  function appendAssistantError(messageId: MessageId | null, errorMessage?: string | null): void {
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

  async function loadChatById(chatId: number, options?: LoadChatOptions): Promise<void> {
    const nextVaultOptions = options?.nextVaultOptions;
    const signal = options?.signal;
    const chatResult = await fetchChat(chatId, signal);
    const chronologicalMessages = [...chatResult.messages].reverse().map(normalizeMessage);
    const availableVaults = nextVaultOptions ?? vaultOptions;

    setActiveConversationId(chatId);
    setMessages(chronologicalMessages);
    setSessionLabel(formatSessionLabel(chatResult.chat.created_at));
    setActiveVaultIdState(chatResult.chat.vault_id ?? availableVaults[0]?.id ?? null);
    setChatError("");
  }

  useEffect(() => {
    const abortController = new AbortController();

    async function bootstrapChat(): Promise<void> {
      setIsLoadingChat(true);
      setChatError("");

      try {
        const [vaultResult, chatsResult] = await Promise.all([
          fetchVaults(abortController.signal),
          fetchChats(abortController.signal),
        ]);
        const nextVaultOptions = vaultResult.vaults.map(normalizeVault);
        const nextHistoryItems = sortChats(chatsResult.chats.map(normalizeChatSummary));

        setVaultOptions(nextVaultOptions);
        setHistoryItems(nextHistoryItems);

        if (nextHistoryItems.length > 0) {
          const chatResult = await fetchChat(nextHistoryItems[0].id, abortController.signal);
          setActiveConversationId(nextHistoryItems[0].id);
          setMessages([...chatResult.messages].reverse().map(normalizeMessage));
          setSessionLabel(formatSessionLabel(chatResult.chat.created_at));
          setActiveVaultIdState(chatResult.chat.vault_id ?? nextVaultOptions[0]?.id ?? null);
          return;
        }

        setActiveVaultIdState(nextVaultOptions[0]?.id ?? null);
        setActiveConversationId(null);
        setMessages([]);
        setSessionLabel("New session");
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }

        setChatError(getErrorMessage(error, "Failed to load chat data."));
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

  const handleSelectConversation = async (conversationId: number): Promise<void> => {
    stopActiveStream();
    setActiveTabState("focus");
    setDraftState("");
    setIsLoadingChat(true);

    try {
      await loadChatById(conversationId);
    } catch (error: unknown) {
      setChatError(getErrorMessage(error, "Failed to load chat."));
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleNewChat = (): void => {
    stopActiveStream();
    setActiveConversationId(null);
    setActiveTabState("focus");
    setDraftState("");
    setSessionLabel("New session");
    setMessages([]);
    setChatError("");
  };

  const handleSubmit = async (): Promise<void> => {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft || isStreaming || activeVaultId == null) {
      return;
    }

    stopActiveStream();

    const nextUserMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      status: "complete",
      text: trimmedDraft,
    };
    const abortController = new AbortController();
    const fallbackAssistantId = createMessageId("assistant");
    let streamedAssistantId: MessageId | null = null;
    let receivedFirstDelta = false;

    streamAbortRef.current = abortController;
    setActiveTabState("focus");
    setDraftState("");
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
        onEvent: (streamEvent: StreamEvent): void => {
          switch (streamEvent.event) {
            case "chat_created": {
              const { data } = streamEvent;
              streamedAssistantId = data.msg_id;
              setActiveConversationId(data.chat_id);
              setActiveVaultIdState(data.vault_id);
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
            case "chat_message_created": {
              const { data } = streamEvent;
              streamedAssistantId = data.msg_id;
              setActiveConversationId(data.chat_id);
              setActiveVaultIdState(data.vault_id);
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
            case "assistant_message_delta": {
              const { data } = streamEvent;
              const nextAssistantId = streamedAssistantId ?? data.msg_id ?? fallbackAssistantId;
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
                      text: data.delta,
                    },
                  ];
                }

                return currentMessages.map((message) => (
                  message.id === nextAssistantId
                    ? { ...message, status: "streaming", text: `${message.text}${data.delta}` }
                    : message
                ));
              });
              return;
            }
            case "assistant_message_completed": {
              const { data } = streamEvent;
              const nextAssistantId = streamedAssistantId ?? data.msg_id ?? fallbackAssistantId;
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
            case "assistant_message_failed": {
              const { data } = streamEvent;
              const nextAssistantId = streamedAssistantId ?? data.msg_id ?? fallbackAssistantId;
              streamedAssistantId = nextAssistantId;
              setIsThinking(false);
              setIsStreaming(false);
              appendAssistantError(nextAssistantId, data.error);
              return;
            }
            case "unknown":
              return;
          }
        },
      });
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        const errorMessage = getErrorMessage(error, "Chat request failed.");
        setChatError(errorMessage);
        appendAssistantError(streamedAssistantId ?? fallbackAssistantId, errorMessage);
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

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }

  return context;
}
