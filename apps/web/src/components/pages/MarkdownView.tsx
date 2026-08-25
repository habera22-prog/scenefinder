import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground [&>*:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-6 text-lg font-bold text-foreground">{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 text-lg font-bold text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 text-base font-bold text-foreground">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-3 text-sm font-bold text-foreground">{children}</h4>
          ),
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          hr: () => <hr className="border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="rounded-lg border-l-4 border-brand bg-brand-muted px-3 py-2 text-xs text-muted-foreground">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="mt-1">{children}</li>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          th: ({ children }) => (
            <th className="border border-border bg-muted px-3 py-2 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2 align-top">{children}</td>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-brand underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
