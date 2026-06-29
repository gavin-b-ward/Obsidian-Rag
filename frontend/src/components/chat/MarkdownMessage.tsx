import type { ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  className?: string;
  content: string;
}

const markdownComponents: Components = {
  a: ({ children, href, ...props }) => (
    <a {...props} href={href} rel="noreferrer noopener" target="_blank">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
      <table className="min-w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
};

export default function MarkdownMessage({ className = "", content }: MarkdownMessageProps): ReactElement {
  return (
    <div className={`markdown-content ${className}`.trim()}>
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
