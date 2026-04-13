import { describe, it, expect } from 'bun:test';
import { aggregateChunkResults, type AggregatedData } from './aggregator';
import type { ExtractionSchema } from './extractionSchema';
import type { ChunkExtractionResult } from './structuredExtractor';

describe('aggregator', () => {
  const schema: ExtractionSchema = {
    name: 'TestSchema',
    fields: [
      { path: 'name', type: 'string' },
      { path: 'count', type: 'number' },
      { path: 'active', type: 'boolean' },
      { path: 'created', type: 'date' },
      { path: 'tags', type: 'array' },
    ],
  };

  const makeResult = (index: number, overrides: Record<string, unknown>): ChunkExtractionResult => ({
    chunkIndex: index,
    data: {
      name: null,
      count: null,
      active: null,
      created: null,
      tags: null,
      ...overrides,
    },
  });

  describe('aggregateChunkResults', () => {
    it('should handle empty results array', () => {
      const result = aggregateChunkResults([], schema.fields);

      expect(result['name']).toBeNull();
      expect(result['count']).toBeNull();
      expect(result['active']).toBeNull();
      expect(result['created']).toBeNull();
      expect(result['tags']).toBeNull();
    });

    it('should passthrough single chunk result', () => {
      const results = [
        makeResult(0, { name: 'Alice', count: 42, active: true, created: '2024-01-01', tags: ['a', 'b'] }),
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['name']).toBe('Alice');
      expect(result['count']).toBe(42);
      expect(result['active']).toBe(true);
      expect(result['created']).toBe('2024-01-01');
      expect(result['tags']).toEqual(['a', 'b']);
    });

    it('should return value from single chunk that has data', () => {
      const results = [
        makeResult(0, { name: null, count: null }),
        makeResult(1, { name: 'Bob', count: null }),
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['name']).toBe('Bob');
      expect(result['count']).toBeNull();
    });

    it('should comma-join unique strings', () => {
      const results = [
        makeResult(0, { name: 'Alice' }),
        makeResult(1, { name: 'Bob' }),
        makeResult(2, { name: 'Alice' }), // Duplicate
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['name']).toBe('Alice, Bob');
    });

    it('should handle comma-separated strings in values', () => {
      const results = [
        makeResult(0, { name: 'Alice, Carol' }),
        makeResult(1, { name: 'Bob, Alice' }), // Alice already seen
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['name']).toBe('Alice, Carol, Bob');
    });

    it('should use first non-null for number fields', () => {
      const results = [
        makeResult(0, { count: null }),
        makeResult(1, { count: 42 }),
        makeResult(2, { count: 100 }),
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['count']).toBe(42);
    });

    it('should use first non-null for boolean fields', () => {
      const results = [
        makeResult(0, { active: null }),
        makeResult(1, { active: true }),
        makeResult(2, { active: false }),
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['active']).toBe(true);
    });

    it('should use first non-null for date fields', () => {
      const results = [
        makeResult(0, { created: null }),
        makeResult(1, { created: '2024-01-01' }),
        makeResult(2, { created: '2024-06-15' }),
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['created']).toBe('2024-01-01');
    });

    it('should concatenate and deduplicate arrays', () => {
      const results = [
        makeResult(0, { tags: ['a', 'b'] }),
        makeResult(1, { tags: ['b', 'c'] }), // b is duplicate
        makeResult(2, { tags: ['d'] }),
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['tags']).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should handle all null values', () => {
      const results = [
        makeResult(0, { name: null, count: null, tags: null }),
        makeResult(1, { name: null, count: null, tags: null }),
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['name']).toBeNull();
      expect(result['count']).toBeNull();
      expect(result['tags']).toBeNull();
    });

    it('should handle mixed null and non-null values', () => {
      const results = [
        makeResult(0, { name: null, count: 10 }),
        makeResult(1, { name: 'Alice', count: null }),
        makeResult(2, { name: null, count: null }),
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['name']).toBe('Alice');
      expect(result['count']).toBe(10);
    });

    it('should handle empty arrays across chunks', () => {
      const results = [
        makeResult(0, { tags: [] }),
        makeResult(1, { tags: [] }),
      ];

      const result = aggregateChunkResults(results, schema.fields);

      expect(result['tags']).toEqual([]);
    });

    it('should preserve schema field order', () => {
      const customSchema: ExtractionSchema = {
        name: 'Custom',
        fields: [
          { path: 'z-field', type: 'string' },
          { path: 'a-field', type: 'string' },
          { path: 'm-field', type: 'string' },
        ],
      };

      const results = [
        makeResult(0, { 'z-field': 'z', 'a-field': 'a', 'm-field': 'm' }),
      ];

      const result = aggregateChunkResults(results, customSchema.fields);

      expect(Object.keys(result)).toEqual(['z-field', 'a-field', 'm-field']);
    });
  });
});
