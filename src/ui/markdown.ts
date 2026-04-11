/**
 * Lightweight markdown renderer for LLM output.
 * 
 * Simple regex-based parser for common markdown patterns.
 * No external dependencies - keeps build size minimal.
 */

/**
 * Escape HTML entities to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse inline markdown (bold, italic, code, links).
 */
function parseInline(text: string): string {
  // Escape HTML first
  let result = escapeHtml(text);

  // Inline code (must be before other patterns to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold and italic
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  return result;
}

/**
 * Render markdown to HTML.
 * Supports: headings, bold/italic, lists, code blocks, links, paragraphs, blockquotes.
 */
export function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    // Code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        // End code block
        inCodeBlock = false;
        const lang = codeBlockLang || 'text';
        const code = codeBlockContent.join('\n');
        result.push(`<div class="code-block">`);
        result.push(`<div class="code-header"><span class="code-lang">${escapeHtml(lang)}</span><button class="copy-btn" data-code="${escapeHtml(code)}">Copy</button></div>`);
        result.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`);
        result.push(`</div>`);
        codeBlockLang = '';
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      result.push(`<h3>${parseInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      result.push(`<h2>${parseInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      result.push(`<h1>${parseInline(line.slice(2))}</h1>`);
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      result.push('<hr>');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      result.push(`<blockquote>${parseInline(line.slice(2))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (line.match(/^[-*+]\s/)) {
      result.push(`<li>${parseInline(line.replace(/^[-*+]\s/, ''))}</li>`);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      result.push(`<li>${parseInline(line.replace(/^\d+\.\s/, ''))}</li>`);
      continue;
    }

    // Empty line - paragraph break
    if (line.trim() === '') {
      result.push('<br>');
      continue;
    }

    // Regular paragraph
    result.push(`<p>${parseInline(line)}</p>`);
  }

  // Close unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    const code = codeBlockContent.join('\n');
    result.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
  }

  return result.join('\n');
}

/**
 * Render plain text (no markdown parsing).
 */
export function renderPlainText(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}