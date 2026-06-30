import { useState, type ReactElement } from "react";
import { Toaster } from "sonner";
import ChatArea from "./components/chat/ChatArea";
import ChatInputBar from "./components/input/ChatInputBar";
import Sidebar from "./components/sidebar/Sidebar";
import { ChatProvider } from "./context/ChatContext";

function AppShell(): ReactElement {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [showThinkingDemo, setShowThinkingDemo] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-zinc-900 text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Toaster richColors position="top-center" theme="dark" />
      <main
        className={`relative flex min-h-screen flex-col bg-surface-dim transition-[padding] duration-300 ${isSidebarOpen ? "lg:pl-sidebar-width" : "lg:pl-0"}`}
      >
        <ChatArea
          isSidebarOpen={isSidebarOpen}
          showThinkingDemo={showThinkingDemo}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen((currentState) => !currentState)}
          onToggleThinkingDemo={() => setShowThinkingDemo((currentState) => !currentState)}
        />
        <ChatInputBar isSidebarOpen={isSidebarOpen} />
      </main>
    </div>
  );
}

export default function App(): ReactElement {
  return (
    <ChatProvider>
      <AppShell />
    </ChatProvider>
  );
}
