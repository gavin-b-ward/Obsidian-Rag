import { useState } from "react";
import ChatArea from "./components/chat/ChatArea";
import ChatInputBar from "./components/input/ChatInputBar";
import Sidebar from "./components/sidebar/Sidebar";
import { ChatProvider } from "./context/ChatContext";

function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showThinkingDemo, setShowThinkingDemo] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-900 text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="relative flex min-h-screen flex-col bg-surface-dim lg:pl-sidebar-width">
        <ChatArea
          showThinkingDemo={showThinkingDemo}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onToggleThinkingDemo={() => setShowThinkingDemo((currentState) => !currentState)}
        />
        <ChatInputBar />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <AppShell />
    </ChatProvider>
  );
}
