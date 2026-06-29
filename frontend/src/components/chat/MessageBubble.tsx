import { FileText } from "lucide-react";

export default function MessageBubble({ message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="group relative max-w-[80%] text-right">
          <div className="absolute -right-3 top-2 h-4 w-1 rounded-full bg-surface-container-highest transition-colors group-hover:bg-outline" />
          <p className="text-body-base text-on-surface whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] text-left">
        {message.sources?.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.sources.map((source) => (
              <span
                className="inline-flex items-center gap-1 rounded bg-primary-container px-2 py-0.5 font-code-label text-[11px] text-[#131315] transition-opacity hover:opacity-80"
                key={source}
              >
                <FileText className="h-[13px] w-[13px]" strokeWidth={1.8} />
                {source}
              </span>
            ))}
          </div>
        ) : null}
        {message.text ? (
          <p
            className={`whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere] ${message.status === "failed" ? "text-red-100" : "text-primary/90"}`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
