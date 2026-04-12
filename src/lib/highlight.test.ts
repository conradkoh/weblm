import { describe, test, expect } from 'bun:test';
import { highlightCode, getHighlightStyles } from './highlight';

describe('highlightCode', () => {
  describe('language normalization', () => {
    test('normalizes js to javascript', () => {
      const result = highlightCode('const x = 1;', 'js');
      expect(result).toContain('hl-keyword');
    });

    test('normalizes ts to typescript', () => {
      const result = highlightCode('interface Foo {}', 'ts');
      expect(result).toContain('hl-keyword');
    });

    test('normalizes sh to bash', () => {
      const result = highlightCode('echo hello', 'sh');
      expect(result).toContain('hl-keyword');
    });

    test('normalizes shell to bash', () => {
      const result = highlightCode('echo hello', 'shell');
      expect(result).toContain('hl-keyword');
    });

    test('handles unknown language gracefully', () => {
      const result = highlightCode('some text', 'unknown');
      expect(result).toBe('some text');
    });
  });

  describe('keyword highlighting', () => {
    test('highlights JavaScript keywords', () => {
      const result = highlightCode('const x = 1;', 'javascript');
      expect(result).toContain('<span class="hl-keyword">const</span>');
    });

    test('highlights TypeScript keywords', () => {
      const result = highlightCode('interface Foo { }', 'typescript');
      expect(result).toContain('<span class="hl-keyword">interface</span>');
    });

    test('highlights Python keywords', () => {
      const result = highlightCode('def foo():', 'python');
      expect(result).toContain('<span class="hl-keyword">def</span>');
    });

    test('highlights bash keywords', () => {
      const result = highlightCode('if then fi', 'bash');
      expect(result).toContain('<span class="hl-keyword">if</span>');
      expect(result).toContain('<span class="hl-keyword">fi</span>');
    });

    test('does not apply keywords to JSON', () => {
      const result = highlightCode('{"key": "value"}', 'json');
      expect(result).not.toContain('hl-keyword');
    });
  });

  describe('string highlighting', () => {
    test('highlights double-quoted strings', () => {
      const result = highlightCode('const x = "hello";', 'javascript');
      expect(result).toContain('hl-string');
      expect(result).toContain('"hello"');
    });

    test('highlights single-quoted strings', () => {
      const result = highlightCode("const x = 'hello';", 'javascript');
      expect(result).toContain('hl-string');
      expect(result).toContain("'hello'");
    });

    test('handles escaped quotes in strings', () => {
      const result = highlightCode('"say \\"hello\\""', 'javascript');
      expect(result).toContain('hl-string');
    });
  });

  describe('comment highlighting', () => {
    test('highlights single-line comments in JS', () => {
      const result = highlightCode('// comment', 'javascript');
      expect(result).toContain('hl-comment');
      expect(result).toContain('// comment');
    });

    test('highlights single-line comments in Python', () => {
      const result = highlightCode('# comment', 'python');
      expect(result).toContain('hl-comment');
      expect(result).toContain('# comment');
    });

    test('highlights multi-line comments in JS', () => {
      const result = highlightCode('/* line1\nline2 */', 'javascript');
      expect(result).toContain('hl-comment');
      expect(result).toContain('/*');
      expect(result).toContain('*/');
    });

    test('highlights bash comments', () => {
      const result = highlightCode('# this is a comment', 'bash');
      expect(result).toContain('<span class="hl-comment"># this is a comment</span>');
    });
  });

  describe('number highlighting', () => {
    test('highlights integers', () => {
      const result = highlightCode('x = 42', 'javascript');
      expect(result).toContain('<span class="hl-number">42</span>');
    });

    test('highlights floats', () => {
      const result = highlightCode('x = 3.14', 'javascript');
      expect(result).toContain('<span class="hl-number">3.14</span>');
    });

    test('highlights numbers in expressions', () => {
      const result = highlightCode('const count = 100;', 'javascript');
      expect(result).toContain('<span class="hl-number">100</span>');
    });
  });

  describe('function highlighting', () => {
    test('highlights function calls', () => {
      const result = highlightCode('myFunction()', 'javascript');
      expect(result).toContain('<span class="hl-function">myFunction</span>');
    });

    test('highlights method calls', () => {
      const result = highlightCode('obj.method()', 'javascript');
      expect(result).toContain('<span class="hl-function">method</span>');
    });

    test('does not highlight keywords as functions', () => {
      const result = highlightCode('return()', 'javascript');
      // 'return' should be highlighted as keyword, not function
      expect(result).toContain('hl-keyword');
    });
  });

  describe('HTML escaping', () => {
    test('escapes HTML in code', () => {
      const result = highlightCode('<script>', 'javascript');
      expect(result).toBe('&lt;script&gt;');
    });

    test('escapes ampersands', () => {
      const result = highlightCode('a && b', 'javascript');
      expect(result).toContain('&amp;');
    });

    test('escapes greater than', () => {
      const result = highlightCode('a > b', 'javascript');
      expect(result).toContain('&gt;');
    });
  });

  describe('complex cases', () => {
    test('handles mixed content', () => {
      const code = 'const x = 42; // comment\nconst y = "string";';
      const result = highlightCode(code, 'javascript');
      expect(result).toContain('hl-keyword');
      expect(result).toContain('hl-number');
      expect(result).toContain('hl-comment');
      expect(result).toContain('hl-string');
    });

    test('handles CSS properties', () => {
      const result = highlightCode('.class { color: red; margin: 10px; }', 'css');
      expect(result).toContain('hl-keyword');
    });

    test('handles HTML tags', () => {
      const result = highlightCode('<div class="test">', 'html');
      expect(result).toContain('hl-string');
    });
  });
});

describe('getHighlightStyles', () => {
  test('returns CSS string', () => {
    const styles = getHighlightStyles();
    expect(styles).toContain('.hl-keyword');
    expect(styles).toContain('.hl-string');
    expect(styles).toContain('.hl-comment');
    expect(styles).toContain('.hl-number');
    expect(styles).toContain('.hl-function');
  });

  test('contains color values', () => {
    const styles = getHighlightStyles();
    expect(styles).toContain('color:');
  });
});