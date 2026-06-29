import { ChevronDown } from "lucide-react";
import { useChat } from "../../context/ChatContext";

export default function ModelSelector() {
  const { activeModelId, modelOptions, setActiveModelId } = useChat();

  return (
    <div className="group relative">
      <select
        className="appearance-none rounded bg-transparent py-1 pl-2 pr-6 font-code-label text-xs font-medium text-zinc-300 transition-colors cursor-pointer hover:bg-zinc-600 focus:outline-none focus:ring-0"
        onChange={(event) => setActiveModelId(event.target.value)}
        value={activeModelId}
      >
        {modelOptions.map((model) => (
          <option className="bg-zinc-800 text-zinc-100" key={model.id} value={model.id}>
            {model.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
        <ChevronDown className="h-[14px] w-[14px]" strokeWidth={1.8} />
      </div>
    </div>
  );
}
