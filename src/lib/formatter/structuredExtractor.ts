import type { ExtractionSchema, SchemaField } from './extractionSchema';
import type { FormatterBackend } from './backend';
import type { ChatMessage, MessageRole } from '../../types';

/**
 * Result of extracting data from a single chunk.
 * Contains flat keys using dot-notation paths from the schema.
 */
export interface ChunkExtractionResult {
  chunkIndex: number;
  data: Record<string, string | number | boolean | string[] | null>;
}

/**
 * Options for chunk extraction.
 */
export interface ExtractOptions {
  /** Callback for streaming tokens */
  onToken?: (token: string) => void;
  /** Callback when a chunk is complete */
  onChunkComplete?: (result: ChunkExtractionResult) => void;
  /** Callback for progress updates */
  onProgress?: (current: number, total: number) => void;
}

/**
 * Builds a prompt for extracting structured data from a chunk.
 */
function buildExtractionPrompt(
  chunkText: string,
  fields: SchemaField[]
): string {
  const fieldDescriptions = fields
    .map((f) => {
      const desc = f.description ? ` - ${f.description}` : '';
      return `  - ${f.path} (${f.type})${desc}`;
    })
    .join('\n');

  return `Extract structured data from the following content.

Content:
${chunkText}

Fields to extract:
${fieldDescriptions}

Rules:
1. Respond ONLY with valid JSON object
2. Use dot-notation keys matching field paths (e.g., "patient.name")
3. Use null if the field's value is not found in this content
4. For string fields, extract the text value
5. For number fields, return the numeric value
6. For boolean fields, return true or false
7. For array fields, return an array of strings

Example output format:
{ "patient.name": "John Doe", "patient.age": 45, "diagnosis.primary": null }

Respond ONLY with valid JSON:`;
}

/**
 * Parse the LLM response into a flat record with dot-notation keys.
 * Handles missing fields by setting them to null.
 */
function parseExtractionResponse(
  response: string,
  schema: ExtractionSchema
): Record<string, string | number | boolean | string[] | null> {
  // Initialize result with all fields set to null
  const result: Record<string, string | number | boolean | string[] | null> = {};
  for (const field of schema.fields) {
    result[field.path] = null;
  }

  // Try to extract and parse JSON from the response
  try {
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

    // Copy parsed values to result, coercing types as needed
    for (const field of schema.fields) {
      const value = parsed[field.path];

      if (value === undefined || value === null) {
        result[field.path] = null;
      } else {
        // Coerce types loosely
        result[field.path] = coerceType(value, field.type);
      }
    }
  } catch {
    // On parse failure, return all-null result
    return result;
  }

  return result;
}

/**
 * Coerce a value to the expected type.
 */
function coerceType(
  value: unknown,
  expectedType: SchemaField['type']
): string | number | boolean | string[] | null {
  switch (expectedType) {
    case 'string':
      return value === null || value === undefined ? null : String(value);
    case 'number':
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const num = Number(value);
        return isNaN(num) ? null : num;
      }
      return null;
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
      }
      if (typeof value === 'number') return value !== 0;
      return null;
    case 'date':
      return value === null || value === undefined ? null : String(value);
    case 'array':
      if (Array.isArray(value)) {
        return value.map((v) => String(v));
      }
      return null;
    default:
      return value === null || value === undefined ? null : String(value);
  }
}

/**
 * Extract structured data from a single chunk against the schema.
 *
 * @param chunkText - The text content of the chunk to extract from
 * @param chunkIndex - The index of this chunk in the sequence
 * @param schema - The extraction schema defining fields to extract
 * @param backend - The LLM backend to use for extraction
 * @param options - Optional extraction options
 * @returns The extraction result with dot-notation keys
 */
export async function extractChunkData(
  chunkText: string,
  chunkIndex: number,
  schema: ExtractionSchema,
  backend: FormatterBackend,
  options?: { onToken?: (token: string) => void }
): Promise<ChunkExtractionResult> {
  const prompt = buildExtractionPrompt(chunkText, schema.fields);

  const messages: ChatMessage[] = [
    {
      id: crypto.randomUUID(),
      role: 'user' as MessageRole,
      content: prompt,
      timestamp: new Date().toISOString(),
    },
  ];

  const response = await backend.generate(messages, {
    onToken: options?.onToken,
  });

  const data = parseExtractionResponse(response, schema);

  return {
    chunkIndex,
    data,
  };
}

/**
 * Extract structured data from all chunks sequentially.
 *
 * @param chunks - Array of chunk text content
 * @param schema - The extraction schema defining fields to extract
 * @param backend - The LLM backend to use for extraction
 * @param options - Optional extraction options including callbacks
 * @returns Array of extraction results, one per chunk
 */
export async function extractAllChunks(
  chunks: string[],
  schema: ExtractionSchema,
  backend: FormatterBackend,
  options?: ExtractOptions
): Promise<ChunkExtractionResult[]> {
  const results: ChunkExtractionResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue; // Skip undefined chunks
    
    const result = await extractChunkData(chunk, i, schema, backend, {
      onToken: options?.onToken,
    });

    results.push(result);

    // Notify callbacks
    options?.onChunkComplete?.(result);
    options?.onProgress?.(i + 1, chunks.length);
  }

  return results;
}
