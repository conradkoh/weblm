import { z } from 'zod';

/**
 * Represents a field in the extraction schema.
 * Uses dot notation for nested fields (e.g., "user.name").
 */
export interface SchemaField {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
  description?: string;
}

/**
 * Root type for the extraction schema definition.
 * Contains a list of fields to extract from the content.
 */
export interface ExtractionSchema {
  name: string;
  description?: string;
  fields: SchemaField[];
}

/**
 * Maps field types to their corresponding Zod types.
 */
function getZodTypeForFieldType(
  type: SchemaField['type']
): z.ZodTypeAny {
  switch (type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'date':
      return z.string(); // Dates are represented as ISO strings
    case 'array':
      return z.array(z.string()); // Arrays default to string arrays
    default:
      return z.string();
  }
}

/**
 * Builds a nested Zod schema from dot-notation field paths.
 * Paths like "user.name" become nested Zod object structures.
 */
function buildNestedZodSchema(fields: SchemaField[]): z.ZodTypeAny {
  // Group fields by their top-level key
  const nested: Record<string, SchemaField[]> = {};

  for (const field of fields) {
    const parts = field.path.split('.');
    const topLevel = parts[0];
    if (!topLevel) continue; // Skip empty paths

    if (!nested[topLevel]) {
      nested[topLevel] = [];
    }
    nested[topLevel]!.push(field);
  }

  // Build nested object shapes
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, groupFields] of Object.entries(nested)) {
    const firstField = groupFields[0];
    if (!firstField) continue; // Skip empty groups
    
    if (groupFields.length === 1 && firstField.path === key) {
      // Top-level field (no nesting)
      shape[key] = getZodTypeForFieldType(firstField.type)
        .optional()
        .nullable();
    } else {
      // Nested fields - build recursively
      const subFields: SchemaField[] = groupFields.map((f) => ({
        ...f,
        path: f.path.substring(key.length + 1), // Remove top-level prefix
      }));
      shape[key] = buildNestedZodSchema(subFields);
    }
  }

  return z.object(shape);
}

/**
 * Flattens a nested object into dot-notation keys.
 * Input: { user: { name: 'Alice' } } → Output: { 'user.name': 'Alice' }
 */
function flattenResult(
  obj: unknown,
  prefix = ''
): Record<string, unknown> {
  if (obj === null || obj === undefined) {
    return {};
  }

  if (typeof obj !== 'object') {
    return prefix ? { [prefix]: obj } : {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(result, flattenResult(value, newPrefix));
    } else {
      result[newPrefix] = value;
    }
  }

  return result;
}

/**
 * Builds a Zod schema from an ExtractionSchema.
 * Nested paths are converted to nested Zod objects.
 * All fields default to optional (nullable) to handle missing values gracefully.
 * The parsed result is flattened to dot-notation keys (e.g., "user.name").
 *
 * @param schema - The extraction schema definition
 * @returns A Zod schema object that can be used for parsing/validation
 */
export function buildZodSchema(schema: ExtractionSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const nestedSchema = buildNestedZodSchema(schema.fields);

  // We need to wrap this in a custom schema that flattens the result
  // Since Zod doesn't support post-processing in safeParse easily,
  // we'll use a transform
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of schema.fields) {
    shape[field.path] = getZodTypeForFieldType(field.type).optional().nullable();
  }

  return z.object(shape);
}

/**
 * Parse content using the schema, returning a flattened result with dot-notation keys.
 * All fields default to optional (nullable) to handle missing values gracefully.
 *
 * @param schema - The extraction schema definition
 * @param content - The content to parse
 * @returns The parsed result with dot-notation keys, or null if parsing fails
 */
export function parseWithSchema<T extends Record<string, unknown>>(
  schema: ExtractionSchema,
  content: unknown
): T | null {
  const nestedSchema = buildNestedZodSchema(schema.fields);
  const result = nestedSchema.safeParse(content);

  if (!result.success) {
    return null;
  }

  const flattened = flattenResult(result.data);
  return flattened as T;
}

/**
 * Extracts a value from a nested object using dot notation path.
 * Returns null if the path does not exist or the value is undefined.
 *
 * @param obj - The object to extract from
 * @param path - Dot-notation path (e.g., "user.profile.name")
 * @returns The extracted value or null
 */
export function extractByPath<T = unknown>(obj: Record<string, unknown>, path: string): T | null {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }
    if (typeof current !== 'object') {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return (current as T) ?? null;
}
