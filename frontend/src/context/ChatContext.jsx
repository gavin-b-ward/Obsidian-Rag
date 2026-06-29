import { createContext, useContext, useEffect, useRef, useState } from "react";

const ChatContext = createContext(null);

const vaultOptions = [
  {
    id: "personal",
    label: "Personal Brain",
    indexedNotes: 248,
    lastIndexed: "Today, 10:24 AM",
    retrievalHealth: "Stable",
    recentSources: ["2023-10-Design-System.md", "UI-Patterns.md", "Pattern-Library.md"],
  },
  {
    id: "work",
    label: "Work Notes",
    indexedNotes: 126,
    lastIndexed: "Today, 8:06 AM",
    retrievalHealth: "Rebuilding",
    recentSources: ["Q3-Roadmap.md", "Weekly-Sync.md", "Infra-Notes.md"],
  },
  {
    id: "research",
    label: "Research Lab",
    indexedNotes: 83,
    lastIndexed: "Yesterday, 6:42 PM",
    retrievalHealth: "Stable",
    recentSources: ["RAG-Benchmarks.md", "Retrieval-Notes.md", "Prompt-Design.md"],
  },
];

const modelOptions = [
  { id: "gpt4o", label: "GPT-4o" },
  { id: "claude", label: "Claude 3.5 Sonnet" },
  { id: "llama", label: "Local Llama" },
];

const historyItems = [
  { id: "rag-strategy", label: "RAG implementation strategy" },
  { id: "deep-focus", label: "Notes on Deep Focus UI" },
  { id: "weekly-sync", label: "Weekly sync prep...", faded: true },
  { id: "rust-macro", label: "Rust macro debugging", faded: true },
];

const conversationSeeds = {
  "deep-focus": {
    sessionLabel: "Today, 10:24 AM",
    messages: [
      {
        role: "user",
        text: 'Summarize my notes on the "Deep Focus UI" pattern. What are the core visual principles?',
      },
      {
        role: "assistant",
        sources: ["2023-10-Design-System.md", "UI-Patterns.md"],
        blocks: [
          {
            type: "paragraph",
            text: "Based on your vault notes, the Deep Focus UI pattern is centered around reducing cognitive load for knowledge workers. The core visual principles are:",
          },
          {
            type: "list",
            items: [
              'Atmospheric Depth: Using black-on-black layering to create a sense of digital space, relying on tonal separation instead of loud borders.',
              'Precision: Keeping alignment and whitespace deliberate so the interface feels as organized as a well-maintained Obsidian vault.',
              'Subtle Motion: Using rotating shadows and understated loaders to communicate search activity without breaking concentration.',
            ],
          },
          {
            type: "aside",
            text: "Would you like me to cross-reference this with your notes on Glassmorphism?",
          },
        ],
      },
    ],
  },
  "rag-strategy": {
    sessionLabel: "Yesterday, 4:17 PM",
    messages: [
      {
        role: "user",
        text: "Outline the RAG implementation strategy from my backend notes.",
      },
      {
        role: "assistant",
        sources: ["RAG-Architecture.md", "Embedding-Pipeline.md"],
        blocks: [
          {
            type: "paragraph",
            text: "Your notes split the implementation into three layers: vault ingestion, retrieval orchestration, and answer synthesis.",
          },
          {
            type: "list",
            items: [
              "Normalize Markdown notes into chunked documents with stable source paths.",
              "Embed and index chunks with refresh-on-change semantics for fast re-indexing.",
              "Use citations in every assistant answer so the generated response stays anchored to the vault.",
            ],
          },
        ],
      },
    ],
  },
  "weekly-sync": {
    sessionLabel: "Thursday, 9:05 AM",
    messages: [
      {
        role: "user",
        text: "Pull the key talking points for the weekly sync.",
      },
      {
        role: "assistant",
        sources: ["Weekly-Sync.md", "Roadmap-Blockers.md"],
        blocks: [
          {
            type: "paragraph",
            text: "The strongest recurring themes are launch focus, indexing reliability, and trimming optional UI scope for the MVP.",
          },
        ],
      },
    ],
  },
  "rust-macro": {
    sessionLabel: "Monday, 6:31 PM",
    messages: [
      {
        role: "user",
        text: "What was the issue in my Rust macro debugging notes?",
      },
      {
        role: "assistant",
        sources: ["macro-debugging.md"],
        blocks: [
          {
            type: "paragraph",
            text: "The failure came from token expansion order: the derive macro expected a field attribute that the helper macro injected too late in the compile pipeline.",
          },
        ],
      },
    ],
  },
};

function buildConversationMessages(conversationId) {
  const seed = conversationSeeds[conversationId] ?? conversationSeeds["deep-focus"];

  return seed.messages.map((message, index) => ({
    ...message,
    id: `${conversationId}-${message.role}-${index}`,
  }));
}

function createMessageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createAssistantReply(prompt, vault, model) {
  const normalizedPrompt = prompt.toLowerCase();
  const summaryTopic = normalizedPrompt.includes("index")
    ? "index health and retrieval freshness"
    : normalizedPrompt.includes("source")
      ? "source coverage and note grounding"
      : "deep-focus design patterns across your notes";

  return {
    id: createMessageId("assistant"),
    role: "assistant",
    sources: vault.recentSources.slice(0, 2),
    blocks: [
      {
        type: "paragraph",
        text: `Using ${model.label} against ${vault.label}, the strongest matches for "${prompt}" cluster around ${summaryTopic}.`,
      },
      {
        type: "list",
        items: [
          "The interface language stays monochromatic so the retrieved note content remains the focal point.",
          "Most of the retrieved notes reinforce subtle feedback, especially the rotating black shadow and restrained waiting states.",
          "The vault consistently ties layout precision to trust: clean alignment, readable line lengths, and visible source chips.",
        ],
      },
      {
        type: "aside",
        text: `I can also restate this as an action list or compare it across another vault using ${model.label}.`,
      },
    ],
  };
}

export function ChatProvider({ children }) {
  const [activeVaultId, setActiveVaultId] = useState(vaultOptions[0].id);
  const [activeModelId, setActiveModelId] = useState(modelOptions[0].id);
  const [activeConversationId, setActiveConversationId] = useState("deep-focus");
  const [activeTab, setActiveTab] = useState("focus");
  const [draft, setDraft] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionLabel, setSessionLabel] = useState(conversationSeeds["deep-focus"].sessionLabel);
  const [messages, setMessages] = useState(() => buildConversationMessages("deep-focus"));
  const indexTimerRef = useRef(null);
  const responseTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (indexTimerRef.current) {
        window.clearTimeout(indexTimerRef.current);
      }

      if (responseTimerRef.current) {
        window.clearTimeout(responseTimerRef.current);
      }
    };
  }, []);

  const activeVault = vaultOptions.find((vault) => vault.id === activeVaultId) ?? vaultOptions[0];
  const activeModel = modelOptions.find((model) => model.id === activeModelId) ?? modelOptions[0];

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

  const handleSelectConversation = (conversationId) => {
    if (responseTimerRef.current) {
      window.clearTimeout(responseTimerRef.current);
    }

    setActiveConversationId(conversationId);
    setActiveTab("focus");
    setIsThinking(false);
    setDraft("");
    setSessionLabel((conversationSeeds[conversationId] ?? conversationSeeds["deep-focus"]).sessionLabel);
    setMessages(buildConversationMessages(conversationId));
  };

  const handleNewChat = () => {
    if (responseTimerRef.current) {
      window.clearTimeout(responseTimerRef.current);
    }

    setActiveConversationId("new-chat");
    setActiveTab("focus");
    setDraft("");
    setIsThinking(false);
    setSessionLabel("New session");
    setMessages([]);
  };

  const handleSubmit = () => {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft || isThinking) {
      return;
    }

    if (responseTimerRef.current) {
      window.clearTimeout(responseTimerRef.current);
    }

    const userPrompt = trimmedDraft;
    const nextUserMessage = {
      id: createMessageId("user"),
      role: "user",
      text: userPrompt,
    };
    const nextAssistantMessage = createAssistantReply(userPrompt, activeVault, activeModel);

    setActiveTab("focus");
    setDraft("");
    setIsThinking(true);
    setMessages((currentMessages) => [...currentMessages, nextUserMessage]);

    responseTimerRef.current = window.setTimeout(() => {
      setMessages((currentMessages) => [...currentMessages, nextAssistantMessage]);
      setIsThinking(false);
    }, 1400);
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
        draft,
        handleNewChat,
        handleReindex,
        handleSelectConversation,
        handleSubmit,
        historyItems,
        isIndexing,
        isThinking,
        messages,
        modelOptions,
        sessionLabel,
        setActiveModelId,
        setActiveTab,
        setActiveVaultId,
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
