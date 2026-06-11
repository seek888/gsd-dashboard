import type { ReactNode } from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content.trim()) {
    return <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">暂无文档内容。</div>;
  }

  return <div className="space-y-4 text-slate-300">{renderBlocks(content)}</div>;
}

function renderBlocks(content: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  const lines = content.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      const text = paragraph.join(" ").trim();
      blocks.push(
        <p key={`p-${blocks.length}`} className="text-sm leading-7 text-slate-300">
          {renderInline(text)}
        </p>,
      );
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="space-y-2 text-sm leading-6">
          {list.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-400" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const flushCode = () => {
    if (code.length > 0) {
      blocks.push(
        <pre key={`code-${blocks.length}`} className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950 p-4 text-xs text-slate-300">
          <code>{code.join("\n")}</code>
        </pre>,
      );
      code = [];
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const className = level === 1 ? "text-xl" : level === 2 ? "text-lg" : "text-base";
      blocks.push(
        <h3 key={`h-${blocks.length}`} className={`${className} font-semibold text-white`}>
          {heading[2]}
        </h3>,
      );
      continue;
    }

    const listItem = line.trim().match(/^[-*+]\s+(.+)$/) ?? line.trim().match(/^\d+\.\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={`${part}-${index}`} className="rounded bg-slate-950 px-1.5 py-0.5 text-xs text-sky-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
