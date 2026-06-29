import { FolderOpen, History, Star } from "lucide-react";
import { useChat } from "../../context/ChatContext";

const coreItems = [
  { id: "recent", label: "Recent", icon: History, active: true },
  { id: "vaults", label: "Vaults", icon: FolderOpen },
  { id: "starred", label: "Starred", icon: Star },
];

export default function ChatHistoryList({ onSelectConversation }) {
  const { activeConversationId, handleSelectConversation, historyItems } = useChat();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-stack-sm">
      <div className="mt-2 mb-1 px-3 py-2 font-code-label text-xs uppercase tracking-wider text-on-surface-variant">
        Core
      </div>
      {coreItems.map(({ active, icon: Icon, id, label }) => (
        <button
          className={`group mb-1 flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors duration-200 ${active ? "border-l-2 border-primary bg-surface-container-high font-bold text-primary" : "border-l-2 border-transparent text-on-surface-variant hover:border-outline-variant hover:bg-surface-container-high"}`}
          key={id}
          type="button"
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
      <div className="mt-stack-md mb-1 px-3 py-2 font-code-label text-xs uppercase tracking-wider text-on-surface-variant">
        History
      </div>
      {historyItems.map((item) => {
        const isActive = item.id === activeConversationId;

        return (
          <button
            className={`truncate rounded border-l-2 px-3 py-2 text-left text-sm transition-colors duration-200 ${isActive ? "border-primary bg-surface-container-high font-medium text-primary" : `border-transparent text-on-surface-variant hover:border-outline-variant hover:bg-surface-container-high ${item.faded ? "opacity-50" : ""}`}`}
            key={item.id}
            onClick={() => {
              handleSelectConversation(item.id);
              onSelectConversation();
            }}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
