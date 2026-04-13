import { describe, it, expect } from 'bun:test';
import { renderTemplate } from './templateRenderer';
import type { AggregatedData } from './aggregator';

describe('templateRenderer', () => {
  describe('renderTemplate', () => {
    it('should return empty string for empty template', () => {
      const result = renderTemplate('', {});
      expect(result).toBe('');
    });

    it('should return template unchanged with no placeholders', () => {
      const template = 'Hello, World!';
      const result = renderTemplate(template, {});
      expect(result).toBe('Hello, World!');
    });

    it('should replace simple field with string value', () => {
      const template = 'Name: {{name}}';
      const data: AggregatedData = { name: 'Alice' };
      const result = renderTemplate(template, data);
      expect(result).toBe('Name: Alice');
    });

    it('should replace field with number value', () => {
      const template = 'Count: {{count}}';
      const data: AggregatedData = { count: 42 };
      const result = renderTemplate(template, data);
      expect(result).toBe('Count: 42');
    });

    it('should replace field with boolean value', () => {
      const template = 'Active: {{active}}';
      const data: AggregatedData = { active: true };
      const result = renderTemplate(template, data);
      expect(result).toBe('Active: true');
    });

    it('should handle nested dot-notation fields', () => {
      const template = 'Patient: {{patient.name}}, Age: {{patient.age}}';
      const data: AggregatedData = {
        'patient.name': 'John Doe',
        'patient.age': 45,
      };
      const result = renderTemplate(template, data);
      expect(result).toBe('Patient: John Doe, Age: 45');
    });

    it('should replace null values with empty string', () => {
      const template = 'Name: {{name}}, Age: {{age}}';
      const data: AggregatedData = { name: 'Bob', age: null };
      const result = renderTemplate(template, data);
      expect(result).toBe('Name: Bob, Age: ');
    });

    it('should replace unknown fields with empty string', () => {
      const template = 'Known: {{name}}, Unknown: {{unknown}}';
      const data: AggregatedData = { name: 'Alice' };
      const result = renderTemplate(template, data);
      expect(result).toBe('Known: Alice, Unknown: ');
    });

    it('should handle array fields in simple references', () => {
      const template = 'Tags: {{tags}}';
      const data: AggregatedData = { tags: ['a', 'b', 'c'] };
      const result = renderTemplate(template, data);
      expect(result).toBe('Tags: a, b, c');
    });

    it('should render section with truthy value once', () => {
      const template = 'Header{{#show}} - Visible{{/show}} Footer';
      const data: AggregatedData = { show: true };
      const result = renderTemplate(template, data);
      expect(result).toBe('Header - Visible Footer');
    });

    it('should not render section with falsy value', () => {
      const template = 'Header{{#show}} - Visible{{/show}} Footer';
      const data: AggregatedData = { show: null };
      const result = renderTemplate(template, data);
      expect(result).toBe('Header Footer');
    });

    it('should iterate over array in section', () => {
      const template = 'Items:{{#items}}*{{.}}{{/items}}';
      const data: AggregatedData = { items: ['a', 'b', 'c'] };
      const result = renderTemplate(template, data);
      expect(result).toBe('Items:*a*b*c');
    });

    it('should handle empty array in section', () => {
      const template = 'Items:{{#items}} *{{.}}{{/items}}';
      const data: AggregatedData = { items: [] };
      const result = renderTemplate(template, data);
      expect(result).toBe('Items:');
    });

    it('should handle multiple sections', () => {
      const template = '{{#header}}Header: {{.}}{{/header}} {{#footer}}Footer: {{.}}{{/footer}}';
      const data: AggregatedData = { header: 'Top', footer: 'Bottom' };
      const result = renderTemplate(template, data);
      expect(result).toBe('Header: Top Footer: Bottom');
    });

    it('should handle nested fields in sections', () => {
      const template = '{{#info}}Patient: {{name}}, Age: {{age}}{{/info}}';
      const data: AggregatedData = {
        info: 'patient info',
        name: 'Alice',
        age: 30,
      };
      const result = renderTemplate(template, data);
      expect(result).toBe('Patient: Alice, Age: 30');
    });

    it('should handle multiple placeholders on same line', () => {
      const template = '{{a}} + {{b}} + {{c}}';
      const data: AggregatedData = { a: '1', b: '2', c: '3' };
      const result = renderTemplate(template, data);
      expect(result).toBe('1 + 2 + 3');
    });

    it('should handle template with no spaces', () => {
      const template = '{{name}}:{{age}}';
      const data: AggregatedData = { name: 'Alice', age: 25 };
      const result = renderTemplate(template, data);
      expect(result).toBe('Alice:25');
    });

    it('should handle template with only sections', () => {
      const template = '{{#items}}[{{.}}]{{/items}}';
      const data: AggregatedData = { items: ['x', 'y'] };
      const result = renderTemplate(template, data);
      expect(result).toBe('[x][y]');
    });

    it('should handle multiple arrays in sections', () => {
      const template = 'Names:{{#names}} {{.}}{{/names}}, Values:{{#values}} {{.}}{{/values}}';
      const data: AggregatedData = { names: ['a', 'b'], values: ['1', '2'] };
      const result = renderTemplate(template, data);
      expect(result).toBe('Names: a b, Values: 1 2');
    });

    it('should handle template with escaped braces', () => {
      const template = 'Plain text with no placeholders';
      const data: AggregatedData = {};
      const result = renderTemplate(template, data);
      expect(result).toBe('Plain text with no placeholders');
    });

    it('should handle whitespace in template', () => {
      const template = '  {{name}}  ';
      const data: AggregatedData = { name: 'Bob' };
      const result = renderTemplate(template, data);
      expect(result).toBe('  Bob  ');
    });

    it('should handle mixed content with sections and fields', () => {
      const template = `
Report for {{patient.name}}:
{{#showAge}}Age: {{age}}{{/showAge}}
Tags: {{tags}}
      `.trim();
      const data: AggregatedData = {
        'patient.name': 'John',
        showAge: true,
        age: 45,
        tags: ['urgent', 'checkup'],
      };
      const result = renderTemplate(template, data);
      expect(result).toContain('Report for John:');
      expect(result).toContain('Age: 45');
      expect(result).toContain('Tags: urgent, checkup');
    });
  });
});
