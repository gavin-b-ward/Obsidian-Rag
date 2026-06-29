import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import ThinkingIndicator from "./ThinkingIndicator";
import { useChat } from "../../context/ChatContext";

export default function MessageStream({ showThinkingDemo }) {
  const { isThinking, messages, sessionLabel } = useChat();
  const bottomRef = useRef(null);

  const hiddenAssistantId = showThinkingDemo && !isThinking
    ? [...messages].reverse().find((message) => message.role === "assistant")?.id
    : null;
  const visibleMessages = hiddenAssistantId
    ? messages.filter((message) => message.id !== hiddenAssistantId)
    : messages;
  const showWaitingState = isThinking || Boolean(hiddenAssistantId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [hiddenAssistantId, isThinking, messages]);

  return (
    <div className="mx-auto flex w-full max-w-container-max flex-col gap-8">
      <div className="text-center">
        <span className="rounded-full border border-outline-variant/30 bg-surface-container-lowest px-3 py-1 font-code-label text-xs text-on-surface-variant opacity-50">
          {sessionLabel}
        </span>
      </div>
      {visibleMessages.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-outline-variant/60 bg-surface-container-low/50 px-6 text-center text-sm text-on-surface-variant">
          Start a new thread and query your vault. The focused chat stream, source chips, and model state are already wired up.
        </div>
      ) : (
        visibleMessages.map((message) => <MessageBubble key={message.id} message={message} />)
      )}
      {showWaitingState ? <ThinkingIndicator /> : null}
      <div ref={bottomRef} />
    </div>
  );
}
