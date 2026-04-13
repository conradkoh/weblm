import type { ExtractionSchema, SchemaField } from './extractionSchema';

/**
 * Prompt template for generating extraction schema from user description.
 */
const SCHEMA_GENERATION_PROMPT = `You are a schema generator. Given a user's description of the data they want to extract, generate a structured extraction schema.

User description:
{desiredFormat}

Generate a JSON schema with:
- name: A descriptive name for this schema
- description: Brief description of what data this extracts
- fields: Array of field definitions with:
  - path: Dot-notation path (e.g., "user.name", "address.city")
  - type: One of "string", "number", "boolean", "date", "array"
  - description: Brief description of what this field contains

Rules:
1. Use dot notation for nested fields (e.g., "user.name", "address.city.street")
2. Choose the most appropriate type for each field
3. Keep the schema simple and focused on what's requested
4. Do not include 1-many relationships (e.g., multiple reports)

Respond ONLY with valid JSON matching the ExtractionSchema format.`;

/**
 * Response parser prompt for LLM responses.
 */
const RESPONSE_PARSING_PROMPT = `Given the following extracted data in JSON format, convert it to a flat record with dot-notation keys.

Example:
Input: { "user": { "name": "Alice", "email": "alice@example.com" } }
Output: { "user.name": "Alice", "user.email": "alice@example.com" }

Rules:
1. Convert all nested objects to dot-notation keys
2. Arrays stay as arrays (comma-delimited in final output)
3. Missing values should be null

Input JSON:
{inputJson}

Respond ONLY with valid JSON.`;

/**
 * Result formatter for comma-delimited aggregation.
 */
const RESULT_FORMAT_PROMPT = `Given a flat record with dot-notation keys, format it as a comma-delimited string.

Example:
Input: { "user.name": "Alice", "user.email": "alice@example.com", "address.city": "New York" }
Output:
user.name: Alice
user.email: alice@example.com
address.city: New York

Input JSON:
{inputJson}

Respond ONLY with the formatted text.`;

/**
 * Interface for LLM backend that can generate text.
 */
export interface LLMBackend {
  /**
   * Generate text completion from a prompt.
   */
  complete(prompt: string, options?: { maxTokens?: number }): Promise<string>;
}

/**
 * Parses the LLM response to extract a valid ExtractionSchema.
 */
function parseSchemaFromResponse(response: string): ExtractionSchema | null {
  try {
    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = response.trim();

    // Remove markdown code block syntax if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }

    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }

    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (
      typeof parsed.name === 'string' &&
      Array.isArray(parsed.fields) &&
      parsed.fields.every(
        (f: unknown) =>
          typeof f === 'object' &&
          f !== null &&
          typeof (f as Record<string, unknown>).path === 'string' &&
          ['string', 'number', 'boolean', 'date', 'array'].includes((f as Record<string, unknown>).type as string)
      )
    ) {
      return parsed as ExtractionSchema;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generates an ExtractionSchema from a user-provided description of desired format.
 *
 * @param backend - The LLM backend to use for generation
 * @param desiredFormat - Natural language description of what data to extract
 * @returns The generated ExtractionSchema or null if generation failed
 */
export async function generateSchemaFromDescription(
  backend: LLMBackend,
  desiredFormat: string
): Promise<ExtractionSchema | null> {
  const prompt = SCHEMA_GENERATION_PROMPT.replace('{desiredFormat}', desiredFormat);

  try {
    const response = await backend.complete(prompt);
    return parseSchemaFromResponse(response);
  } catch {
    return null;
  }
}

/**
 * Formats extracted data as a comma-delimited string.
 *
 * @param data - The flat record with dot-notation keys
 * @returns Formatted string with each field on its own line
 */
export function formatExtractedData(data: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      lines.push(`${key}: `);
    } else if (Array.isArray(value)) {
      lines.push(`${key}: ${value.join(', ')}`);
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Creates a schema generator with a specific LLM backend.
 */
export function createSchemaGenerator(backend: LLMBackend) {
  return {
    /**
     * Generate schema from natural language description.
     */
    generateSchema: (description: string) => generateSchemaFromDescription(backend, description),

    /**
     * Format extracted data as comma-delimited string.
     */
    formatData: formatExtractedData,
  };
}
