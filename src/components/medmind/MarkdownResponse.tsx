"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props {
  content: string;
  streaming?: boolean;
}

const components: Components = {
  h1: ({ children }) => (
    <p className="text-sm font-medium text-foreground uppercase tracking-[0.15em] mt-4 mb-2">
      {children}
    </p>
  ),
  h2: ({ children }) => (
    <p className="text-sm font-medium text-foreground uppercase tracking-[0.15em] mt-3 mb-1.5">
      {children}
    </p>
  ),
  h3: ({ children }) => (
    <p className="text-xs font-medium text-foreground mt-2 mb-1">{children}</p>
  ),
  p: ({ children }) => (
    <p className="text-sm text-foreground leading-relaxed mb-2">{children}</p>
  ),
  strong: ({ children }) => (
    <span className="font-medium text-foreground">{children}</span>
  ),
  em: ({ children }) => (
    <span className="italic text-foreground/80">{children}</span>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-4 space-y-0.5 mb-2 text-sm text-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 space-y-0.5 mb-2 text-sm text-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="bg-surface rounded-lg px-3 py-2 my-2 overflow-x-auto">
          <code className="text-xs font-mono text-foreground">{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-surface px-1 py-0.5 rounded text-xs font-mono text-primary">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 text-foreground border-b border-border/50">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-sm text-foreground/80 italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary hover:text-primary/80 transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  hr: () => <div className="w-full h-px bg-border my-3" />,
};

export default function MarkdownResponse({ content, streaming }: Props) {
  // Strip any emoji that Claude might insert despite instructions
  const cleaned = content.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ""
  );

  return (
    <div className="medmind-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {cleaned}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-1 h-4 bg-primary/50 ml-0.5 animate-pulse" />
      )}
    </div>
  );
}
