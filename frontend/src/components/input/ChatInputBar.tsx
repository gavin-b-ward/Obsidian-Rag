import { ArrowUp, Paperclip } from "lucide-react";
import { useEffect, useRef, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactElement } from "react";
import ModelSelector from "./ModelSelector";
import { useChat } from "../../context/ChatContext";

interface ChatInputBarProps {
  isSidebarOpen: boolean;
}

export default function ChatInputBar({ isSidebarOpen }: ChatInputBarProps): ReactElement {
  const { activeVaultId, draft, handleSubmit, isStreaming, setDraft } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  }, [draft]);

  const submitDraft = (): void => {
    void handleSubmit();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submitDraft();
  };

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setDraft(event.target.value);
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitDraft();
    }
  };

  return (
    <div className="pointer-events-none absolute bottom-stack-lg left-0 w-full px-gutter">
      <div
        className={`mx-auto w-full max-w-container-max transition-transform duration-300 ${isSidebarOpen ? "lg:translate-x-[130px]" : "lg:translate-x-0"}`}
      >
        <div className="insight-active-container pointer-events-auto">
          <form
            className="relative z-20 flex flex-col gap-2 rounded-2xl border border-white/20 bg-zinc-700 p-2 shadow-2xl"
            onSubmit={handleFormSubmit}
          >
            <textarea
              className="min-h-[60px] max-h-[200px] w-full resize-none border-none bg-transparent p-3 text-body-base text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
              onChange={handleDraftChange}
              onKeyDown={handleDraftKeyDown}
              placeholder="Ask your vault..."
              ref={textareaRef}
              rows={1}
              value={draft}
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <ModelSelector />
              <div className="flex items-center gap-2">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-600 hover:text-zinc-100"
                  title="Attach note"
                  type="button"
                >
                  <Paperclip className="h-5 w-5" strokeWidth={1.8} />
                </button>
                <button
                  className="group flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 shadow-md transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!draft.trim() || isStreaming || activeVaultId == null}
                  type="submit"
                >
                  <ArrowUp className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
