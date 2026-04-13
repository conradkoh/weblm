import type { AggregatedData } from './aggregator';

/**
 * Render a Mustache-style template with the provided data.
 *
 * Template syntax:
 * - `{{field.path}}` → replaced with value (or empty string if null)
 * - `{{#field.path}}...content...{{/field.path}}` → section block
 *   - If value is truthy/non-null: render content once
 *   - If value is an array: iterate and render content for each item
 *   - Inside array iteration: `{{.}}` refers to current item
 *   - If value is null/falsy: render nothing
 * - Null/undefined values render as empty string (not "null")
 * - Unknown fields render as empty string
 *
 * @param template - The template string with {{placeholders}}
 * @param data - The aggregated data object
 * @returns The rendered string
 */
export function renderTemplate(
  template: string,
  data: AggregatedData
): string {
  if (!template) {
    return '';
  }

  let result = template;

  // Handle section blocks first (they may contain field references)
  result = renderSections(result, data);

  // Handle simple field replacements
  result = renderFields(result, data);

  return result;
}

/**
 * Render section blocks `{{#path}}...{{/path}}`.
 * Handles both truthy values (render once) and arrays (iterate).
 */
function renderSections(template: string, data: AggregatedData): string {
  // Match section blocks: {{#field.path}}content{{/field.path}}
  // Supports nested sections
  const sectionRegex = /\{\{#([^}]+)\}\}(([\s\S]*?))\{\{\/\1\}\}/g;

  return template.replace(sectionRegex, (match, path, content) => {
    const value = getValueByPath(data, path.trim());

    if (value === null || value === undefined) {
      // Falsy value - render nothing
      return '';
    }

    if (Array.isArray(value)) {
      // Array - iterate and render content for each item
      if (value.length === 0) {
        return '';
      }
      return value.map((item) => replaceDotInContent(content, item)).join('');
    }

    // Truthy non-array value - render content once
    return replaceDotInContent(content, value);
  });
}

/**
 * Replace {{.}} with the current value in array iteration.
 */
function replaceDotInContent(content: string, value: unknown): string {
  const valueStr = String(value ?? '');
  return content.replace(/\{\{\.\}\}/g, valueStr);
}

/**
 * Render simple field replacements `{{field.path}}`.
 */
function renderFields(template: string, data: AggregatedData): string {
  // Match field references: {{field.path}}
  const fieldRegex = /\{\{([^#\/][^}]*?)\}\}/g;

  return template.replace(fieldRegex, (match, path) => {
    const value = getValueByPath(data, path.trim());

    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      // Arrays in simple field refs: join with ", "
      return value.join(', ');
    }

    return String(value);
  });
}

/**
 * Get a value from the data object by dot-notation path.
 */
function getValueByPath(
  data: AggregatedData,
  path: string
): string | number | boolean | string[] | null | unknown {
  return data[path] ?? null;
}
