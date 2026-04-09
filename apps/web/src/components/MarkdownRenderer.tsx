import React, { useMemo } from 'react';

/**
 * Lightweight markdown renderer — no external deps.
 * Supports: bold, italic, code blocks, inline code, headers, lists, links.
 * Output is sanitized: only known safe tags/attributes pass through.
 */

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => sanitize(renderMarkdown(content)), [content]);
  return (
    <div
      className={`md-renderer${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Strip any HTML tags/attributes that aren't in our allowlist */
function sanitize(html: string): string {
  const allowedTags = new Set(['h1','h2','h3','h4','h5','h6','p','br','strong','em','code','pre','ul','ol','li','a','span']);
  const allowedAttrs: Record<string, Set<string>> = {
    a: new Set(['href', 'target', 'rel']),
    code: new Set(['class']),
    pre: new Set(['class']),
    span: new Set(['class']),
  };

  // Tokenize into tags and text
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g, (match, tag) => {
    const lower = tag.toLowerCase();
    if (!allowedTags.has(lower)) return '';

    // For closing tags, just return them
    if (match.startsWith('</')) return `</${lower}>`;

    // For self-closing
    if (match.endsWith('/>')) {
      const attrs = filterAttrs(match, allowedAttrs[lower]);
      return attrs ? `<${lower} ${attrs}/>` : `<${lower}/>`;
    }

    const attrs = filterAttrs(match, allowedAttrs[lower]);
    return attrs ? `<${lower} ${attrs}>` : `<${lower}>`;
  });
}

function filterAttrs(tagStr: string, allowed: Set<string> | undefined): string {
  if (!allowed) return '';
  const results: string[] = [];
  const re = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(tagStr)) !== null) {
    const name = m[1].toLowerCase();
    if (allowed.has(name)) {
      // Block javascript: in href
      if (name === 'href' && m[2].toLowerCase().trim().startsWith('javascript')) continue;
      results.push(`${name}="${m[2]}"`);
    }
  }
  return results.join(' ');
}

function renderMarkdown(raw: string): string {
  // Extract code blocks first to protect them from inline processing
  const codeBlocks: string[] = [];
  let text = raw.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre class="md-code-block"><code class="md-lang-${escAttr(lang || 'text')}">${esc(code.trimEnd())}</code></pre>`
    );
    return `\x00CB${idx}\x00`;
  });

  // Process line by line for block elements
  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;
  let listType = '';

  for (const line of lines) {
    // Code block placeholder
    if (/^\x00CB\d+\x00$/.test(line.trim())) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      out.push(line.replace(/\x00CB(\d+)\x00/, (_, i) => codeBlocks[parseInt(i)]));
      continue;
    }

    // Headers
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const level = hMatch[1].length;
      out.push(`<h${level}>${inlineFormat(hMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList || listType !== 'ul') {
        if (inList) out.push('</ol>');
        out.push('<ul>');
        inList = true; listType = 'ul';
      }
      out.push(`<li>${inlineFormat(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      if (!inList || listType !== 'ol') {
        if (inList) out.push('</ul>');
        out.push('<ol>');
        inList = true; listType = 'ol';
      }
      out.push(`<li>${inlineFormat(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>`);
      continue;
    }

    if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }

    // Empty line
    if (line.trim() === '') {
      out.push('<br/>');
      continue;
    }

    // Paragraph
    out.push(`<p>${inlineFormat(line)}</p>`);
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
  // Links — sanitize href
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    if (href.toLowerCase().trim().startsWith('javascript')) return esc(text);
    return `<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
  });
  return s;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
