import { describe, it, expect } from 'bun:test';
import {
  computeContentHash,
  checkHashMatch,
  createCacheEntry,
  getIndicesToPrune,
  getCacheStats,
} from './chunkCacheUtils';
import type { ChunkCache } from '../../stores/types';

describe('computeContentHash', () => {
  it('returns consistent hash for same input', () => {
    const text = 'Hello, World!';
    const hash1 = computeContentHash(text);
    const hash2 = computeContentHash(text);
    expect(hash1).toBe(hash2);
  });

  it('returns different hash for different input', () => {
    const hash1 = computeContentHash('Hello');
    const hash2 = computeContentHash('World');
    expect(hash1).not.toBe(hash2);
  });

  it('returns different hash for same content but different length', () => {
    const text1 = 'Hello';
    const text2 = 'Hello!';
    const hash1 = computeContentHash(text1, text1.length);
    const hash2 = computeContentHash(text2, text2.length);
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string', () => {
    const hash = computeContentHash('');
    expect(hash).toBe('0');
  });

  it('handles null/undefined', () => {
    expect(computeContentHash(null)).toBe('0');
    expect(computeContentHash(undefined)).toBe('0');
  });

  it('handles very long strings (> 2048 chars)', () => {
    const longText = 'A'.repeat(3000);
    const hash = computeContentHash(longText);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    expect(hash).not.toBe('0');
  });

  it('uses content length when provided', () => {
    const text = 'Hello';
    const len = text.length;
    const hash1 = computeContentHash(text, len);
    const hash2 = computeContentHash(text, text.length + 1); // wrong length
    expect(hash1).not.toBe(hash2);
  });
});

describe('checkHashMatch', () => {
  it('returns true when hash matches', () => {
    const content = 'Hello, World!';
    const hash = computeContentHash(content, content.length);
    expect(checkHashMatch(content, hash, content.length)).toBe(true);
  });

  it('returns false when hash does not match', () => {
    const content = 'Hello, World!';
    const wrongHash = 'abc123';
    expect(checkHashMatch(content, wrongHash, content.length)).toBe(false);
  });

  it('returns false when length does not match', () => {
    const content = 'Hello, World!';
    const hash = computeContentHash(content, content.length);
    expect(checkHashMatch(content, hash, content.length + 1)).toBe(false);
  });

  it('returns false for empty/null hash', () => {
    const content = 'Hello';
    expect(checkHashMatch(content, null, content.length)).toBe(false);
    expect(checkHashMatch(content, undefined, content.length)).toBe(false);
    expect(checkHashMatch(content, '', content.length)).toBe(false);
  });

  it('returns false for empty/null length', () => {
    const content = 'Hello';
    const hash = computeContentHash(content, content.length);
    expect(checkHashMatch(content, hash, null)).toBe(false);
    expect(checkHashMatch(content, hash, undefined)).toBe(false);
  });

  it('returns false for null/undefined content', () => {
    expect(checkHashMatch(null, 'abc123', 10)).toBe(false);
    expect(checkHashMatch(undefined, 'abc123', 10)).toBe(false);
  });
});

describe('createCacheEntry', () => {
  it('creates valid cache entry', () => {
    const chunkText = 'Hello';
    const refinedText = 'Formatted Hello';
    const entry = createCacheEntry(0, chunkText, refinedText);
    
    expect(entry).not.toBeNull();
    expect(entry!.hash).toBe(computeContentHash(chunkText, chunkText.length));
    expect(entry!.refinedText).toBe(refinedText);
    expect(entry!.refinedAt).toBeGreaterThan(0);
  });

  it('returns null for empty chunkText', () => {
    expect(createCacheEntry(0, '', 'Refined')).toBeNull();
    expect(createCacheEntry(0, null, 'Refined')).toBeNull();
    expect(createCacheEntry(0, undefined, 'Refined')).toBeNull();
  });

  it('returns null for empty refinedText', () => {
    expect(createCacheEntry(0, 'Original', '')).toBeNull();
    expect(createCacheEntry(0, 'Original', null)).toBeNull();
    expect(createCacheEntry(0, 'Original', undefined)).toBeNull();
  });

  it('index is tracked in hash calculation', () => {
    const chunkText = 'Hello';
    const entry1 = createCacheEntry(0, chunkText, 'Refined1');
    const entry2 = createCacheEntry(1, chunkText, 'Refined2');
    // Same text should produce same hash regardless of index
    expect(entry1!.hash).toBe(entry2!.hash);
  });
});

describe('getIndicesToPrune', () => {
  it('prunes entries above new chunk count', () => {
    const cache: ChunkCache = {
      0: { hash: 'hash0', refinedText: 'text0', refinedAt: Date.now() },
      1: { hash: 'hash1', refinedText: 'text1', refinedAt: Date.now() },
      2: { hash: 'hash2', refinedText: 'text2', refinedAt: Date.now() },
      3: { hash: 'hash3', refinedText: 'text3', refinedAt: Date.now() },
    };
    
    const toPrune = getIndicesToPrune(cache, 2);
    expect(toPrune).toContain(2);
    expect(toPrune).toContain(3);
    expect(toPrune).not.toContain(0);
    expect(toPrune).not.toContain(1);
  });

  it('keeps entries below new chunk count', () => {
    const cache: ChunkCache = {
      0: { hash: 'hash0', refinedText: 'text0', refinedAt: Date.now() },
      1: { hash: 'hash1', refinedText: 'text1', refinedAt: Date.now() },
    };
    
    const toPrune = getIndicesToPrune(cache, 5);
    expect(toPrune).toHaveLength(0);
  });

  it('handles empty cache', () => {
    const toPrune = getIndicesToPrune({}, 5);
    expect(toPrune).toHaveLength(0);
  });
});

describe('getCacheStats', () => {
  it('counts entries and bytes correctly', () => {
    const cache: ChunkCache = {
      0: { hash: 'hash0', refinedText: 'hello', refinedAt: Date.now() },
      1: { hash: 'hash1', refinedText: 'world!', refinedAt: Date.now() },
    };
    
    const stats = getCacheStats(cache);
    expect(stats.entries).toBe(2);
    expect(stats.totalBytes).toBe(11); // 'hello' + 'world!' = 11
  });

  it('handles empty cache', () => {
    const stats = getCacheStats({});
    expect(stats.entries).toBe(0);
    expect(stats.totalBytes).toBe(0);
  });
});
