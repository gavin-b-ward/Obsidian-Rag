import { useEffect, useState, type ReactElement } from "react";
import { RefreshCw } from "lucide-react";
import ChatHeader from "./ChatHeader";
import MessageStream from "./MessageStream";
import { useChat } from "../../context/ChatContext";

const HEADER_HEIGHT_PX = 64;

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
  const { activeTab } = useChat();
  const handleSidebarToggle = onToggleSidebar ?? onOpenSidebar;
  const [isHeaderOffscreen, setIsHeaderOffscreen] = useState<boolean>(false);
  const [isPointerInHeaderZone, setIsPointerInHeaderZone] = useState<boolean>(false);

  useEffect(() => {
    function handleWindowScroll(): void {
      setIsHeaderOffscreen(window.scrollY >= HEADER_HEIGHT_PX);
    }

    function handlePointerMove(event: PointerEvent): void {
      setIsPointerInHeaderZone(event.clientY <= HEADER_HEIGHT_PX);
    }

    handleWindowScroll();
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  const revealHeaderContainerClassName = `fixed left-0 right-0 top-0 z-20 h-16 overflow-hidden transition-[left] duration-300 ${isSidebarOpen ? "lg:left-sidebar-width" : "lg:left-0"} ${isPointerInHeaderZone ? "pointer-events-auto" : "pointer-events-none"}`;
  const revealHeaderClassName = `transition-transform duration-200 ease-out ${isPointerInHeaderZone ? "translate-y-0" : "-translate-y-full"}`;

  return (
    <section className="flex min-h-screen flex-1 flex-col bg-surface-dim">
      <ChatHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleSidebarToggle}
        onToggleThinkingDemo={onToggleThinkingDemo}
        showThinkingDemo={showThinkingDemo}
      />
      {isHeaderOffscreen ? (
        <div className={revealHeaderContainerClassName}>
          <div className={revealHeaderClassName}>
            <ChatHeader
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={handleSidebarToggle}
              onToggleThinkingDemo={onToggleThinkingDemo}
              showThinkingDemo={showThinkingDemo}
            />
          </div>
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto px-gutter pb-[180px] pt-stack-lg scroll-smooth">
        {activeTab === "focus" ? <MessageStream showThinkingDemo={showThinkingDemo} /> : <IndexPanel />}
      </div>
    </section>
  );
}
