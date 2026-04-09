import React, { useMemo } from 'react';

/**
 * Lightweight markdown renderer — no external deps.
 * Supports: bold, italic, code blocks, inline code, headers, lists, links.
 */

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className={`md-renderer${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMarkdown(raw: string): string {
  // Extract code blocks first to protect them from inline processing
  const codeBlocks: string[] = [];
  let text = raw.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre class="md-code-block"><code class="md-lang-${lang || 'text'}">${esc(code.trimEnd())}</code></pre>`
    );
    return `\x00CB${idx}\x00`;
  });

  // Process line by line for block elements
  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;
  let listType = '';

  for (const line of lines) {
    // Restore code blocks placeholder
    const restored = line;

    // Code block placeholder
    if (/^\x00CB\d+\x00$/.test(restored.trim())) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(restored.replace(/\x00CB(\d+)\x00/, (_, i) => codeBlocks[parseInt(i)]));
      continue;
    }

    // Headers
    const hMatch = restored.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const level = hMatch[1].length;
      out.push(`<h${level}>${inlineFormat(hMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*]\s+/.test(restored)) {
      if (!inList || listType !== 'ul') {
        if (inList) out.push('</ol>');
        out.push('<ul>');
        inList = true; listType = 'ul';
      }
      out.push(`<li>${inlineFormat(restored.replace(/^[\s]*[-*]\s+/, ''))}</li>`);
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+[.)]\s+/.test(restored)) {
      if (!inList || listType !== 'ol') {
        if (inList) out.push('</ul>');
        out.push('<ol>');
        inList = true; listType = 'ol';
      }
      out.push(`<li>${inlineFormat(restored.replace(/^[\s]*\d+[.)]\s+/, ''))}</li>`);
      continue;
    }

    if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }

    // Empty line
    if (restored.trim() === '') {
      out.push('<br/>');
      continue;
    }

    // Paragraph
    out.push(`<p>${inlineFormat(restored)}</p>`);
  }

  if (inList) out.push(listType === 'ul' ? '</ul>' : '</ol>');
  return out.join('\n');
}

function inlineFormat(s: string): string {
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
