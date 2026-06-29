import type { ReactElement } from "react";
import { MoreVertical, PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";
import MessageStream from "./MessageStream";
import { useChat } from "../../context/ChatContext";

interface ChatAreaProps {
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
  onToggleSidebar?: () => void;
  onToggleThinkingDemo: () => void;
  showThinkingDemo: boolean;
}

function IndexPanel(): ReactElement {
  const { activeVault, handleReindex, isIndexing } = useChat();

  if (!activeVault) {
    return (
      <div className="mx-auto flex w-full max-w-container-max items-center justify-center rounded-3xl border border-outline-variant bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">
        Load or create a vault to see index details.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-container-max">
      <div className="rounded-3xl border border-outline-variant bg-surface-container-low p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-code-label text-code-label uppercase tracking-[0.24em] text-on-surface-variant">
              Vault Index
            </p>
            <h2 className="mt-3 font-headline-md text-3xl font-semibold text-on-surface">
              {activeVault.label}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
              Retrieval status stays intentionally quiet: recent sources, index freshness, and note volume without pulling focus away from chat.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 self-start rounded-full border border-outline-variant bg-surface-container-high px-4 py-2 text-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
            onClick={handleReindex}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${isIndexing ? "animate-spin" : ""}`} strokeWidth={1.8} />
            <span>{isIndexing ? "Re-indexing..." : "Refresh index"}</span>
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-high p-4">
            <p className="font-code-label text-code-label uppercase tracking-[0.18em] text-on-surface-variant">
              Indexed Notes
            </p>
            <p className="mt-3 text-3xl font-semibold text-primary">{activeVault.indexedNotes}</p>
          </div>
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-high p-4">
            <p className="font-code-label text-code-label uppercase tracking-[0.18em] text-on-surface-variant">
              Retrieval Health
            </p>
            <p className="mt-3 text-3xl font-semibold text-primary">{activeVault.retrievalHealth}</p>
          </div>
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-high p-4">
            <p className="font-code-label text-code-label uppercase tracking-[0.18em] text-on-surface-variant">
              Last Indexed
            </p>
            <p className="mt-3 text-lg font-medium text-primary">{activeVault.lastIndexed}</p>
          </div>
        </div>
        <div className="mt-6">
          <p className="font-code-label text-code-label uppercase tracking-[0.18em] text-on-surface-variant">
            Recent Sources
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeVault.recentSources.length > 0 ? activeVault.recentSources.map((source) => (
              <span
                className="inline-flex items-center rounded-full border border-outline-variant/60 bg-surface-container-high px-3 py-1 text-xs text-on-surface"
                key={source}
              >
                {source}
              </span>
            )) : (
              <span className="text-sm text-on-surface-variant">Streaming chat responses do not currently include source metadata.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatArea({
  isSidebarOpen,
  onOpenSidebar,
  onToggleSidebar,
  onToggleThinkingDemo,
  showThinkingDemo,
}: ChatAreaProps): ReactElement {
  const { activeTab, handleReindex, isIndexing, setActiveTab } = useChat();
  const handleSidebarToggle = onToggleSidebar ?? onOpenSidebar;

  return (
    <section className="flex min-h-screen flex-1 flex-col bg-surface-dim">
      <header className="z-10 flex h-16 shrink-0 items-center justify-between bg-surface-dim px-gutter">
        <div className="flex items-center gap-4">
          <button
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="flex h-9 w-9 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            onClick={handleSidebarToggle}
            type="button"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" strokeWidth={1.8} />
            ) : (
              <PanelLeftOpen className="h-5 w-5" strokeWidth={1.8} />
            )}
          </button>
          <div className="flex items-center gap-stack-lg text-sm font-medium text-on-surface-variant">
            <button
              className={`pb-1 transition-colors ${activeTab === "focus" ? "border-b-2 border-primary text-primary" : "hover:text-primary"}`}
              onClick={() => setActiveTab("focus")}
              type="button"
            >
              Focus
            </button>
            <button
              className={`pb-1 transition-colors ${activeTab === "index" ? "border-b-2 border-primary text-primary" : "hover:text-primary"}`}
              onClick={() => setActiveTab("index")}
              type="button"
            >
              Index
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant sm:gap-4">
          <button
            className={`rounded-full border px-3 py-1 font-code-label text-[11px] uppercase tracking-[0.18em] transition-colors ${showThinkingDemo ? "border-primary bg-surface-container-high text-primary" : "border-outline-variant text-on-surface-variant hover:text-primary"}`}
            onClick={onToggleThinkingDemo}
            type="button"
          >
            AI Waiting
          </button>
          <button
            aria-label="Re-index vault"
            className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-surface-container-high hover:text-primary"
            onClick={handleReindex}
            type="button"
          >
            <RefreshCw className={`h-5 w-5 ${isIndexing ? "animate-spin" : ""}`} strokeWidth={1.8} />
          </button>
          <button
            aria-label="More options"
            className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-surface-container-high hover:text-primary"
            type="button"
          >
            <MoreVertical className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-gutter pb-[180px] pt-stack-lg scroll-smooth">
        {activeTab === "focus" ? <MessageStream showThinkingDemo={showThinkingDemo} /> : <IndexPanel />}
      </div>
    </section>
  );
}
