"use client";

import { useRef, useState, useMemo } from "react";
import { parseMarkdown, type BlockNode, type InlineNode } from "@/lib/markdown";

interface MarkdownProps {
  /** The raw markdown text. Re-renders cheaply as it grows during streaming. */
  source: string;
  /** Optional extra className applied to the outer wrapper. */
  className?: string;
}

// Render a parsed AST into plain React elements. Note carefully: every leaf
// in the resulting tree is a {string} child — React escapes it automatically.
// There is no dangerouslySetInnerHTML call anywhere in this component, and
// the markdown parser never produces an HTML string. This is the whole
// XSS-safety guarantee for the response panel.
export function Markdown({ source, className }: MarkdownProps) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <Block key={i} node={block} />
      ))}
    </div>
  );
}

function Block({ node }: { node: BlockNode }) {
  switch (node.type) {
    case "heading": {
      const Tag = node.level === 1 ? "h1" : node.level === 2 ? "h2" : "h3";
      const cls =
        node.level === 1
          ? "mt-4 mb-2 font-display text-xl font-semibold leading-tight text-ink first:mt-0 dark:text-paper"
          : node.level === 2
            ? "mt-4 mb-2 font-display text-lg font-semibold leading-tight text-ink first:mt-0 dark:text-paper"
            : "mt-3 mb-1.5 font-display text-base font-semibold leading-tight text-ink first:mt-0 dark:text-paper";
      return (
        <Tag className={cls}>
          {node.children.map((c, i) => (
            <Inline key={i} node={c} />
          ))}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="my-2 whitespace-pre-wrap text-sm leading-relaxed text-ink first:mt-0 last:mb-0 dark:text-paper">
          {node.children.map((c, i) => (
            <Inline key={i} node={c} />
          ))}
        </p>
      );
    case "code-block":
      return <CodeBlock value={node.value} />;
    case "blockquote":
      return (
        <blockquote className="my-3 border-l-2 border-teal-300 bg-cream/40 px-3 py-2 text-sm italic leading-relaxed text-ink-muted dark:border-teal-500/40 dark:bg-night/40 dark:text-paper-muted">
          {node.children.map((c, i) => (
            <Inline key={i} node={c} />
          ))}
        </blockquote>
      );
    case "list":
      return node.ordered ? (
        <ol className="my-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-ink dark:text-paper">
          {node.items.map((item, i) => (
            <li key={i}>
              {item.map((c, j) => (
                <Inline key={j} node={c} />
              ))}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="my-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink dark:text-paper">
          {node.items.map((item, i) => (
            <li key={i}>
              {item.map((c, j) => (
                <Inline key={j} node={c} />
              ))}
            </li>
          ))}
        </ul>
      );
  }
}

// F-night-3 — code block with a hover-visible copy button. Pulled out
// of the block switch so it can hold its own "copied" state without
// hoisting it into the renderer. Falls back to the legacy execCommand
// path for old browsers; both paths swallow failure silently because a
// copy that doesn't work shouldn't break the response render.
function CodeBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — silent: the code is still visible to read */
    }
  }

  return (
    <div className="group/code relative my-3">
      <pre className="overflow-x-auto rounded-md border border-border bg-cream/60 px-3 py-2 pr-12 font-mono text-xs leading-relaxed text-ink dark:border-night-border dark:bg-night dark:text-paper">
        <code>{value}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Code copied" : "Copy code"}
        className="absolute right-2 top-2 rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-muted opacity-0 transition hover:border-teal-300 hover:text-teal-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 group-hover/code:opacity-100 dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-teal-300"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Inline({ node }: { node: InlineNode }) {
  switch (node.type) {
    case "text":
      return <>{node.value}</>;
    case "strong":
      return (
        <strong className="font-semibold text-ink dark:text-paper">
          {node.children.map((c, i) => (
            <Inline key={i} node={c} />
          ))}
        </strong>
      );
    case "em":
      return (
        <em className="italic">
          {node.children.map((c, i) => (
            <Inline key={i} node={c} />
          ))}
        </em>
      );
    case "code":
      return (
        <code className="rounded bg-cream px-1 py-0.5 font-mono text-[0.85em] text-ink dark:bg-night dark:text-paper">
          {node.value}
        </code>
      );
    case "link":
      // node.href is already validated by parseInline against the protocol
      // allowlist; the only routes here are https:/http:/mailto:.
      return (
        <a
          href={node.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-700 underline underline-offset-2 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 dark:text-teal-300 dark:hover:text-teal-200"
        >
          {node.children.map((c, i) => (
            <Inline key={i} node={c} />
          ))}
        </a>
      );
  }
}
