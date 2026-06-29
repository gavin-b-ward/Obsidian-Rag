export default function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] text-left">
        <div className="mt-2 flex h-8 items-center gap-2 px-2">
          <div className="thinking-dot h-2 w-2 rounded-full bg-primary/70" />
          <div className="thinking-dot h-2 w-2 rounded-full bg-primary/70" />
          <div className="thinking-dot h-2 w-2 rounded-full bg-primary/70" />
        </div>
      </div>
    </div>
  );
}
