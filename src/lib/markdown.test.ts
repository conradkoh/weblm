import { describe, test, expect } from 'bun:test';
import { renderMarkdown, renderPlainText } from './markdown';

describe('renderMarkdown', () => {
  describe('headings', () => {
    test('renders h1 heading', () => {
      expect(renderMarkdown('# Hello World')).toBe('<h1>Hello World</h1>');
    });

    test('renders h2 heading', () => {
      expect(renderMarkdown('## Section Title')).toBe('<h2>Section Title</h2>');
    });

    test('renders h3 heading', () => {
      expect(renderMarkdown('### Subsection')).toBe('<h3>Subsection</h3>');
    });

    test('handles inline formatting in headings', () => {
      expect(renderMarkdown('# Hello **World**')).toBe('<h1>Hello <strong>World</strong></h1>');
    });
  });

  describe('bold and italic', () => {
    test('renders bold with **', () => {
      expect(renderMarkdown('**bold text**')).toBe('<p><strong>bold text</strong></p>');
    });

    test('renders italic with *', () => {
      expect(renderMarkdown('*italic text*')).toBe('<p><em>italic text</em></p>');
    });

    test('renders bold with __', () => {
      expect(renderMarkdown('__bold text__')).toBe('<p><strong>bold text</strong></p>');
    });

    test('renders italic with _', () => {
      expect(renderMarkdown('_italic text_')).toBe('<p><em>italic text</em></p>');
    });

    test('renders bold+italic with ***', () => {
      expect(renderMarkdown('***both***')).toBe('<p><strong><em>both</em></strong></p>');
    });

    test('renders bold+italic with ___', () => {
      expect(renderMarkdown('___both___')).toBe('<p><strong><em>both</em></strong></p>');
    });
  });

  describe('inline code', () => {
    test('renders inline code', () => {
      expect(renderMarkdown('use `code` here')).toBe('<p>use <code class="inline-code">code</code> here</p>');
    });

    test('renders multiple inline code blocks', () => {
      expect(renderMarkdown('`a` and `b`')).toBe('<p><code class="inline-code">a</code> and <code class="inline-code">b</code></p>');
    });
  });

  describe('code blocks', () => {
    test('renders code block with language', () => {
      const input = '```javascript\nconst x = 1;\n```';
      const result = renderMarkdown(input);
      expect(result).toContain('<div class="code-block">');
      expect(result).toContain('<span class="code-lang">javascript</span>');
      expect(result).toContain('<code class="language-javascript">');
    });

    test('renders code block without language', () => {
      const input = '```\nplain text\n```';
      const result = renderMarkdown(input);
      expect(result).toContain('<span class="code-lang">text</span>');
    });

    test('escapes HTML in code blocks', () => {
      const result = renderMarkdown('```\n<script>alert(1)</script>\n```');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    test('handles multi-line code blocks', () => {
      const input = '```js\nline1\nline2\nline3\n```';
      const result = renderMarkdown(input);
      expect(result).toContain('line1\nline2\nline3');
    });
  });

  describe('links', () => {
    test('renders links', () => {
      expect(renderMarkdown('[Click here](https://example.com)')).toBe(
        '<p><a href="https://example.com" target="_blank" rel="noopener">Click here</a></p>'
      );
    });

    test('handles links with formatting inside', () => {
      const result = renderMarkdown('[**bold link**](https://example.com)');
      expect(result).toContain('<strong>bold link</strong>');
    });
  });

  describe('lists', () => {
    test('renders unordered list items', () => {
      expect(renderMarkdown('- item 1')).toBe('<li>item 1</li>');
      expect(renderMarkdown('* item 2')).toBe('<li>item 2</li>');
      expect(renderMarkdown('+ item 3')).toBe('<li>item 3</li>');
    });

    test('renders ordered list items', () => {
      expect(renderMarkdown('1. first')).toBe('<li>first</li>');
      expect(renderMarkdown('2. second')).toBe('<li>second</li>');
    });
  });

  describe('blockquotes', () => {
    test('renders blockquotes', () => {
      expect(renderMarkdown('> quoted text')).toBe('<blockquote>quoted text</blockquote>');
    });
  });

  describe('horizontal rules', () => {
    test('renders horizontal rule with ---', () => {
      expect(renderMarkdown('---')).toBe('<hr>');
    });

    test('renders horizontal rule with ***', () => {
      expect(renderMarkdown('***')).toBe('<hr>');
    });

    test('renders horizontal rule with ___', () => {
      expect(renderMarkdown('___')).toBe('<hr>');
    });
  });

  describe('paragraphs', () => {
    test('wraps plain text in paragraph', () => {
      expect(renderMarkdown('Hello world')).toBe('<p>Hello world</p>');
    });

    test('creates line breaks on empty lines', () => {
      expect(renderMarkdown('Line 1\n\nLine 2')).toBe('<p>Line 1</p>\n<br>\n<p>Line 2</p>');
    });
  });

  describe('HTML escaping', () => {
    test('escapes HTML in plain text', () => {
      const result = renderMarkdown('<script>alert("xss")</script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    test('escapes ampersands', () => {
      expect(renderMarkdown('a & b')).toBe('<p>a &amp; b</p>');
    });

    test('escapes quotes', () => {
      const result = renderMarkdown('Say "hello"');
      expect(result).toContain('&quot;');
    });
  });

  describe('edge cases', () => {
    test('handles empty input', () => {
      // Empty input creates empty array which joins to empty string
      // But split('\n') of empty string gives [''], which becomes <br>
      const result = renderMarkdown('');
      expect(result).toBe('<br>');
    });

    test('handles whitespace-only input', () => {
      // Whitespace-only lines become <br>
      const result = renderMarkdown('   ');
      expect(result).toBe('<br>');
    });

    test('handles unclosed code block', () => {
      const result = renderMarkdown('```js\ncode here');
      expect(result).toContain('<pre><code>');
    });

    test('handles special characters', () => {
      const result = renderMarkdown('Test $100 test');
      expect(result).toContain('$100');
    });

    test('handles mixed content', () => {
      const result = renderMarkdown('# Title\n\nParagraph with **bold** and `code`\n\n- List item');
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<code class="inline-code">code</code>');
      expect(result).toContain('<li>List item</li>');
    });
  });
});

describe('renderPlainText', () => {
  test('escapes HTML', () => {
    expect(renderPlainText('<script>')).toBe('&lt;script&gt;');
  });

  test('converts newlines to br', () => {
    expect(renderPlainText('line1\nline2')).toBe('line1<br>line2');
  });

  test('escapes ampersands', () => {
    expect(renderPlainText('a & b')).toBe('a &amp; b');
  });

  test('handles empty input', () => {
    expect(renderPlainText('')).toBe('');
  });
});