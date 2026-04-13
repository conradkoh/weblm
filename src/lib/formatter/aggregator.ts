import type { ChunkExtractionResult } from './structuredExtractor';
import type { SchemaField } from './extractionSchema';

/**
 * Aggregated data for all fields across all chunks.
 * Contains the merged values using the comma-delimited strategy.
 */
export type AggregatedData = Record<string, string | number | boolean | string[] | null>;

/**
 * Aggregate multiple chunk extraction results into a single data object.
 *
 * Aggregation rules per field type:
 * - string: join unique values with ", " separator
 * - number: use first non-null value
 * - boolean: use first non-null value
 * - date: use first non-null value
 * - array: concatenate all arrays, deduplicate
 *
 * @param results - Array of chunk extraction results
 * @param fields - Schema fields defining the expected data structure
 * @returns Aggregated data object with merged values
 */
export function aggregateChunkResults(
  results: ChunkExtractionResult[],
  fields: SchemaField[]
): AggregatedData {
  // Initialize result with null values for all fields
  const aggregated: AggregatedData = {};

  for (const field of fields) {
    aggregated[field.path] = null;
  }

  // Handle empty results
  if (!results || results.length === 0) {
    return aggregated;
  }

  // Collect all values for each field
  const fieldValues: Record<string, (string | number | boolean | string[] | null)[]> = {};
  for (const field of fields) {
    fieldValues[field.path] = [];
  }

  for (const result of results) {
    for (const field of fields) {
      const value = result.data[field.path];
      if (value !== null && value !== undefined) {
        fieldValues[field.path]!.push(value);
      }
    }
  }

  // Apply aggregation rules based on field type
  for (const field of fields) {
    const values = fieldValues[field.path] ?? [];

    if (values.length === 0) {
      aggregated[field.path] = null;
      continue;
    }

    if (values.length === 1) {
      // Single value - use as-is
      aggregated[field.path] = values[0]!;
      continue;
    }

    // Multiple values - apply type-specific aggregation
    const firstValue = values[0]!;
    switch (field.type) {
      case 'string':
        // Join unique string values with ", "
        aggregated[field.path] = joinUniqueStrings(values as string[]);
        break;
      case 'number':
      case 'boolean':
      case 'date':
        // Use first non-null value
        aggregated[field.path] = firstValue;
        break;
      case 'array':
        // Concatenate all arrays and deduplicate
        aggregated[field.path] = concatAndDeduplicateArrays(values as string[][]);
        break;
      default:
        // Fallback to first value
        aggregated[field.path] = firstValue;
    }
  }

  return aggregated;
}

/**
 * Join unique string values with ", " separator.
 * Preserves order of first appearance.
 */
function joinUniqueStrings(values: string[]): string {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    // Split by existing comma+space to get individual values, then re-join uniquely
    const parts = value.split(', ').map((s) => s.trim()).filter((s) => s);
    for (const part of parts) {
      if (!seen.has(part)) {
        seen.add(part);
        unique.push(part);
      }
    }
  }

  return unique.join(', ');
}

/**
 * Concatenate multiple arrays and deduplicate.
 * Preserves order of first appearance.
 */
function concatAndDeduplicateArrays(arrays: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const arr of arrays) {
    for (const item of arr) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
  }

  return result;
}
