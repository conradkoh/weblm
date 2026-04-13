import { describe, it, expect } from 'bun:test';
import { buildZodSchema, extractByPath, parseWithSchema } from './extractionSchema';
import type { ExtractionSchema } from './extractionSchema';

describe('buildZodSchema', () => {
  it('should build a schema with a single field', () => {
    const schema: ExtractionSchema = {
      name: 'UserInfo',
      fields: [{ path: 'name', type: 'string' }],
    };

    const zodSchema = buildZodSchema(schema);
    // Schema shape should have the field
    expect(zodSchema.shape).toBeDefined();
  });

  it('should build a schema with multiple fields of different types', () => {
    const schema: ExtractionSchema = {
      name: 'UserInfo',
      fields: [
        { path: 'name', type: 'string' },
        { path: 'age', type: 'number' },
        { path: 'isActive', type: 'boolean' },
        { path: 'createdAt', type: 'date' },
        { path: 'tags', type: 'array' },
      ],
    };

    const zodSchema = buildZodSchema(schema);
    expect(zodSchema.shape).toBeDefined();
    expect(zodSchema.shape.name).toBeDefined();
    expect(zodSchema.shape.age).toBeDefined();
  });

  it('should build a schema with nested fields', () => {
    const schema: ExtractionSchema = {
      name: 'UserInfo',
      fields: [
        { path: 'user.name', type: 'string' },
        { path: 'user.email', type: 'string' },
        { path: 'address.city', type: 'string' },
      ],
    };

    const zodSchema = buildZodSchema(schema);
    expect(zodSchema.shape).toBeDefined();
  });
});

describe('parseWithSchema', () => {
  it('should parse a single field', () => {
    const schema: ExtractionSchema = {
      name: 'UserInfo',
      fields: [{ path: 'name', type: 'string' }],
    };

    const result = parseWithSchema(schema, { name: 'Alice' });
    expect(result).not.toBeNull();
    if (result) {
      expect(result.name).toBe('Alice');
    }
  });

  it('should parse nested fields with dot notation', () => {
    const schema: ExtractionSchema = {
      name: 'UserInfo',
      fields: [
        { path: 'user.name', type: 'string' },
        { path: 'user.email', type: 'string' },
        { path: 'address.city', type: 'string' },
      ],
    };

    const result = parseWithSchema(schema, {
      user: { name: 'Alice', email: 'alice@example.com' },
      address: { city: 'New York' },
    });

    expect(result).not.toBeNull();
    if (result) {
      expect(result['user.name']).toBe('Alice');
      expect(result['user.email']).toBe('alice@example.com');
      expect(result['address.city']).toBe('New York');
    }
  });

  it('should handle empty input gracefully', () => {
    const schema: ExtractionSchema = {
      name: 'UserInfo',
      fields: [{ path: 'name', type: 'string' }],
    };

    const result = parseWithSchema(schema, {});
    expect(result).not.toBeNull();
    if (result) {
      expect(result.name).toBeUndefined();
    }
  });

  it('should handle partial data (all fields optional)', () => {
    const schema: ExtractionSchema = {
      name: 'PartialReport',
      fields: [
        { path: 'field1', type: 'string' },
        { path: 'field2', type: 'number' },
      ],
    };


    // Partial data should be valid
    const result = parseWithSchema(schema, { field1: 'Present' });
    expect(result).not.toBeNull();
    if (result) {
      expect(result.field1).toBe('Present');
      expect(result.field2).toBeUndefined();
    }
  });

  it('should handle deeply nested fields', () => {
    const schema: ExtractionSchema = {
      name: 'DeepInfo',
      fields: [{ path: 'a.b.c.d', type: 'string' }],
    };

    const result = parseWithSchema(schema, { a: { b: { c: { d: 'deep' } } } });
    expect(result).not.toBeNull();
    if (result) {
      expect(result['a.b.c.d']).toBe('deep');
    }
  });

  it('should return null for invalid input', () => {
    const schema: ExtractionSchema = {
      name: 'UserInfo',
      fields: [{ path: 'name', type: 'string' }],
    };

    // Invalid input that doesn't match schema
    const result = parseWithSchema(schema, { name: 123 }); // Should be string
    expect(result).toBeNull();
  });

  it('should parse multiple field types correctly', () => {
    const schema: ExtractionSchema = {
      name: 'Report',
      fields: [
        { path: 'title', type: 'string' },
        { path: 'score', type: 'number' },
        { path: 'active', type: 'boolean' },
        { path: 'createdAt', type: 'date' },
        { path: 'tags', type: 'array' },
      ],
    };

    const result = parseWithSchema(schema, {
      title: 'Test Report',
      score: 42,
      active: true,
      createdAt: '2024-01-01',
      tags: ['a', 'b'],
    });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.title).toBe('Test Report');
      expect(result.score).toBe(42);
      expect(result.active).toBe(true);
      expect(result.createdAt).toBe('2024-01-01');
      expect(result.tags).toEqual(['a', 'b']);
    }
  });
});

describe('extractByPath', () => {
  it('should extract a top-level field', () => {
    const obj = { name: 'Alice' };
    const result = extractByPath(obj, 'name');
    expect(result).toBe('Alice');
  });

  it('should extract a nested field', () => {
    const obj = { user: { name: 'Alice' } };
    const result = extractByPath(obj, 'user.name');
    expect(result).toBe('Alice');
  });

  it('should return null for non-existent path', () => {
    const obj = { name: 'Alice' };
    const result = extractByPath(obj, 'email');
    expect(result).toBeNull();
  });

  it('should return null for path through undefined object', () => {
    const obj = { user: undefined };
    const result = extractByPath(obj, 'user.name');
    expect(result).toBeNull();
  });

  it('should extract deeply nested fields', () => {
    const obj = { a: { b: { c: { d: 'deep' } } } };
    const result = extractByPath(obj, 'a.b.c.d');
    expect(result).toBe('deep');
  });

  it('should return null for null intermediate value', () => {
    const obj = { user: null };
    const result = extractByPath(obj, 'user.name');
    expect(result).toBeNull();
  });

  it('should extract number values', () => {
    const obj = { score: 42 };
    const result = extractByPath<number>(obj, 'score');
    expect(result).toBe(42);
  });

  it('should extract boolean values', () => {
    const obj = { active: true };
    const result = extractByPath<boolean>(obj, 'active');
    expect(result).toBe(true);
  });

  it('should extract array values', () => {
    const obj = { items: [1, 2, 3] };
    const result = extractByPath<number[]>(obj, 'items');
    expect(result).toStrictEqual([1, 2, 3]);
  });
});
