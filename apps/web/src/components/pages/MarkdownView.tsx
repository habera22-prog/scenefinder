function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

function renderTable(lines: string[], key: string) {
  const rows = lines
    .filter((l) => !/^\|?\s*-{2,}/.test(l.replace(/\|/g, "")))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  const [head, ...body] = rows;
  return (
    <div key={key} className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((c, i) => (
              <th
                key={i}
                className="border border-border bg-muted px-3 py-2 text-left font-medium"
              >
                {renderInline(c, `${key}-h${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((c, ci) => (
                <td key={ci} className="border border-border px-3 py-2 align-top">
                  {renderInline(c, `${key}-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarkdownView({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/);

  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground">
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const lines = trimmed.split("\n");

        if (/^#{1,4}\s/.test(lines[0]) && lines.length === 1) {
          const level = lines[0].match(/^#+/)![0].length;
          const text = lines[0].replace(/^#{1,4}\s*/, "");
          const Tag = (`h${Math.min(level + 1, 6)}` as unknown) as "h2";
          return (
            <Tag key={bi} className="mt-2 font-bold text-foreground">
              {renderInline(text, `${bi}`)}
            </Tag>
          );
        }

        if (trimmed === "---") {
          return <hr key={bi} className="border-border" />;
        }

        if (lines[0].startsWith(">")) {
          return (
            <blockquote
              key={bi}
              className="rounded-lg border-l-4 border-brand bg-brand-muted px-3 py-2 text-xs text-muted-foreground"
            >
              {lines.map((l, li) => (
                <p key={li}>{renderInline(l.replace(/^>\s*/, ""), `${bi}-${li}`)}</p>
              ))}
            </blockquote>
          );
        }

        if (lines.every((l) => l.includes("|"))) {
          return renderTable(lines, `table-${bi}`);
        }

        if (lines.every((l) => /^\s*(-|\d+\.)\s/.test(l))) {
          const ordered = /^\s*\d+\./.test(lines[0]);
          const ListTag = ordered ? "ol" : "ul";
          return (
            <ListTag
              key={bi}
              className={ordered ? "list-decimal pl-5" : "list-disc pl-5"}
            >
              {lines.map((l, li) => (
                <li key={li}>
                  {renderInline(l.replace(/^\s*(-|\d+\.)\s*/, ""), `${bi}-${li}`)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <span key={li}>
                {renderInline(l, `${bi}-${li}`)}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
