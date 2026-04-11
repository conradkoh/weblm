/**
 * Simple syntax highlighting for code blocks.
 * 
 * Lightweight keyword-based highlighting without external dependencies.
 * Supports common languages for LLM output.
 */

/** Language keywords for highlighting */
const KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'interface', 'type', 'enum', 'implements', 'extends', 'private', 'public', 'readonly'],
  python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'raise', 'pass', 'break', 'continue', 'True', 'False', 'None'],
  json: [],
  html: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'li', 'ol', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'script', 'style', 'meta', 'link', 'title', 'DOCTYPE'],
  css: ['color', 'background', 'margin', 'padding', 'border', 'display', 'flex', 'grid', 'position', 'width', 'height', 'font-size', 'font-family', 'text-align', 'justify-content', 'align-items'],
  bash: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'local', 'export', 'source', 'echo', 'read', 'cd', 'ls', 'cat', 'grep', 'sed', 'awk', 'mkdir', 'rm', 'cp', 'mv'],
};

/** Normalize language name */
function normalizeLang(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  if (normalized === 'js') return 'javascript';
  if (normalized === 'ts') return 'typescript';
  if (normalized === 'sh' || normalized === 'shell') return 'bash';
  return normalized;
}

/**
 * Apply syntax highlighting to code.
 * Returns HTML with spans for syntax elements.
 */
export function highlightCode(code: string, language: string): string {
  const lang = normalizeLang(language);
  const keywords = KEYWORDS[lang] || [];
  
  // Escape HTML first
  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight strings (both single and double quoted)
  result = result.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="hl-string">$1$2$1</span>');

  // Highlight comments
  if (lang === 'python' || lang === 'bash') {
    // Python/bash: # comments
    result = result.replace(/(#[^\n]*)/g, '<span class="hl-comment">$1</span>');
  } else {
    // JS/TS/CSS: // comments and /* */ comments
    result = result.replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>');
    result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
  }

  // Highlight keywords
  if (keywords.length > 0) {
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    result = result.replace(keywordRegex, '<span class="hl-keyword">$1</span>');
  }

  // Highlight numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');

  // Highlight function calls
  result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="hl-function">$1</span>(');

  return result;
}

/**
 * Get all highlight CSS classes for inclusion in styles.
 */
export function getHighlightStyles(): string {
  return `
    .hl-keyword { color: #cf222e; font-weight: 500; }
    .hl-string { color: #0a3069; }
    .hl-comment { color: #6e7781; font-style: italic; }
    .hl-number { color: #0550ae; }
    .hl-function { color: #8250df; }
  `;
}