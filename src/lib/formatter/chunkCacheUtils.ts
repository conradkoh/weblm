/**
 * Pure utility functions for chunk caching.
 * These functions are stateless and testable.
 */

import type { ChunkCache, ChunkCacheEntry } from '../../stores/types';

/**
 * Simple hash function for content change detection using djb2 algorithm.
 * 
 * ⚠️ WARNING: For very large content (1MB+), djb2 hash collisions become more likely.
 * This is acceptable for UX caching purposes but not for security.
 * For extra safety, we also store content length alongside hash.
 * 
 * @param content - The content to hash (may be null/undefined — returns '0')
 * @param contentLength - Optional pre-computed length (avoids re-calculation)
 * @returns A hex string representation of the hash
 */
export function computeContentHash(content: string | null | undefined, contentLength?: number): string {
  if (!content) return '0';
  
  const len = contentLength ?? content.length;
  let hash = 5381;
  // Use first and last 1KB plus length for better uniqueness
  const sampleSize = Math.min(1024, len);
  const sample = (len > sampleSize * 2)
    ? content.slice(0, sampleSize) + content.slice(-sampleSize)
    : content;
  
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) + hash) + sample.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Mix in length to differentiate content with same sampled prefix
  hash = ((hash << 5) + hash) + (len % 0xFFFFFFFF);
  hash = hash & hash;
  
  return hash.toString(16);
}

/**
 * Check if content matches stored hash (with length verification).
 * More reliable than hash-only check due to collision protection.
 */
export function checkHashMatch(
  content: string | null | undefined,
  storedHash: string | null | undefined,
  storedLength: number | null | undefined
): boolean {
  if (!storedHash || !storedLength) return false;
  if (!content) return false;
  if (content.length !== storedLength) return false;
  return computeContentHash(content, content.length) === storedHash;
}

/**
 * Create a cache entry for a refined chunk.
 * Returns null if inputs are invalid.
 */
export function createCacheEntry(
  index: number,
  chunkText: string | null | undefined,
  refinedText: string | null | undefined
): ChunkCacheEntry | null {
  if (!chunkText || !refinedText) {
    return null;
  }
  
  const hash = computeContentHash(chunkText, chunkText.length);
  return {
    hash,
    refinedText,
    refinedAt: Date.now(),
  };
}

/**
 * Calculate which cache indices should be pruned.
 * Returns array of indices that are >= newChunkCount.
 */
export function getIndicesToPrune(chunkCache: ChunkCache, newChunkCount: number): number[] {
  return Object.keys(chunkCache)
    .map(k => parseInt(k, 10))
    .filter(i => i >= newChunkCount);
}

/**
 * Get cache statistics for a cache object.
 */
export function getCacheStats(chunkCache: ChunkCache): { entries: number; totalBytes: number } {
  const entries = Object.keys(chunkCache).length;
  const totalBytes = Object.values(chunkCache)
    .reduce((sum, entry) => sum + entry.refinedText.length, 0);
  return { entries, totalBytes };
}
