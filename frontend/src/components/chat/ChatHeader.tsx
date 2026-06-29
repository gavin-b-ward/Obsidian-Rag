import type { ReactElement } from "react";
import { MoreVertical, PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";
import { useChat } from "../../context/ChatContext";

interface ChatHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleThinkingDemo: () => void;
  showThinkingDemo: boolean;
}

export default function ChatHeader({
  isSidebarOpen,
  onToggleSidebar,
  onToggleThinkingDemo,
  showThinkingDemo,
}: ChatHeaderProps): ReactElement {
  const { activeTab, handleReindex, isIndexing, setActiveTab } = useChat();

  return (
    <header className="z-10 flex h-16 shrink-0 items-center justify-between bg-surface-dim px-gutter">
      <div className="flex items-center gap-4">
        <button
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="flex h-9 w-9 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
          onClick={onToggleSidebar}
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
  );
}
