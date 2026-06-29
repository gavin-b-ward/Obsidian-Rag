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
        <div className="space-y-4 leading-relaxed text-primary/90">
          {message.blocks?.map((block, index) => {
            if (block.type === "list") {
              return (
                <ul className="list-disc space-y-2 pl-5 marker:text-outline" key={`${message.id}-list-${index}`}>
                  {block.items.map((item) => (
                    <li key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }

            if (block.type === "aside") {
              return (
                <p className="text-sm italic text-on-surface-variant" key={`${message.id}-aside-${index}`}>
                  {block.text}
                </p>
              );
            }

            return <p key={`${message.id}-paragraph-${index}`}>{block.text}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
