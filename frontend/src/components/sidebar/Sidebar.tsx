import type { ReactElement } from "react";
import { FolderOpen, Plus, RefreshCw } from "lucide-react";
import ChatHistoryList from "./ChatHistoryList";
import VaultSelector from "./VaultSelector";
import { useChat } from "../../context/ChatContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps): ReactElement {
  const { handleNewChat, handleReindex, isIndexing } = useChat();

  return (
    <>
      <button
        aria-label="Close sidebar overlay"
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        type="button"
      />
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-sidebar-width flex-col border-r border-outline-variant bg-surface-container-lowest py-gutter transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-stack-lg px-gutter">
          <div className="mb-stack-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-container-high border border-outline-variant">
                <FolderOpen className="h-5 w-5 text-primary" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="font-headline-md text-headline-md font-bold leading-none text-on-surface">
                  Obsidian AI
                </h1>
                <p className="mt-1 font-code-label text-code-label text-on-surface-variant opacity-70">
                  Digital Extension
                </p>
              </div>
            </div>
          </div>
          <VaultSelector />
          <button
            className="mt-2 flex w-full items-center justify-center gap-2 rounded border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high hover:text-primary disabled:pointer-events-none disabled:opacity-50"
            disabled={isIndexing}
            onClick={handleReindex}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${isIndexing ? "animate-spin" : ""}`} strokeWidth={1.8} />
            <span>{isIndexing ? "Re-indexing..." : "Re-index Vault"}</span>
          </button>
        </div>
        <div className="mb-stack-md px-gutter">
          <button
            className="flex w-full items-center justify-center gap-2 rounded border border-outline-variant px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-surface-container-high active:scale-[0.98]"
            onClick={() => {
              handleNewChat();
              onClose();
            }}
            type="button"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span>New Chat</span>
          </button>
        </div>
        <ChatHistoryList onSelectConversation={onClose} />
      </aside>
    </>
  );
}
