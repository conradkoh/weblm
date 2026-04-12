/**
 * Chunker — splits large text content into manageable chunks.
 * Smart splitting at paragraph boundaries when possible.
 */

import { estimateTokenCount, getDefaultChunkSize } from './tokenizer';

export interface ChunkConfig {
  /** Maximum context window size in tokens */
  maxContextWindow?: number;
  /** Target chunk size in tokens (default: 1/3 of max context window) */
  chunkSize?: number;
}

export interface Chunk {
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  tokenCount: number;
}

/**
 * Parse source content into chunks (as string array).
 * Smart splitting at paragraph boundaries when possible.
 */
export function parseIntoChunks(
  text: string,
  config: ChunkConfig = {}
): string[] {
  const chunkSize = config.chunkSize ?? getDefaultChunkSize();
  const chunkSizeChars = chunkSize * 4; // rough conversion

  if (!text.trim()) {
    return [];
  }

  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  
  let currentChunk = '';
  let currentStart = 0;

  for (const paragraph of paragraphs) {
    const paragraphTrimmed = paragraph.trim();
    if (!paragraphTrimmed) continue;

    // Check if this paragraph alone exceeds chunk size
    const paragraphTokens = estimateTokenCount(paragraphTrimmed);
    
    if (paragraphTokens > chunkSize) {
      // Paragraph is too large - split it further
      // First, save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentStart += currentChunk.length + 2;
        currentChunk = '';
      } else {
        currentStart = text.indexOf(paragraphTrimmed, currentStart);
      }

      // Split large paragraph by sentences or lines
      const subChunks = splitLargeParagraph(paragraphTrimmed, chunkSizeChars);
      chunks.push(...subChunks);
      currentStart += paragraphTrimmed.length + 2;
      continue;
    }

    // Check if adding this paragraph would exceed chunk size
    const potentialText = currentChunk + '\n\n' + paragraphTrimmed;
    const potentialTokens = estimateTokenCount(potentialText);

    if (currentChunk && potentialTokens > chunkSize) {
      // Save current chunk and start a new one
      chunks.push(currentChunk.trim());
      currentStart = text.indexOf(paragraphTrimmed, currentStart);
      currentChunk = paragraphTrimmed;
    } else {
      // Add to current chunk
      if (currentChunk) {
        currentChunk += '\n\n';
      }
      currentChunk += paragraphTrimmed;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Split a large paragraph into smaller chunks.
 * Attempts to split at sentence boundaries.
 */
function splitLargeParagraph(paragraph: string, maxChars: number): string[] {
  const chunks: string[] = [];
  
  // Try to split by sentences first
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // If single sentence exceeds max, split by words
      if (!currentChunk || sentence.length > maxChars) {
        const words = sentence.split(/\s+/);
        let wordChunk = '';
        for (const word of words) {
          if (wordChunk.length + word.length + 1 > maxChars) {
            if (wordChunk) chunks.push(wordChunk.trim());
            // If single word exceeds max, truncate it
            if (!wordChunk) {
              chunks.push(word.substring(0, maxChars - 10) + '...');
            }
            wordChunk = word;
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }
        currentChunk = wordChunk;
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [paragraph.substring(0, maxChars - 10) + '...'];
}

/**
 * Create a chunk object with metadata.
 */
export function createChunk(index: number, text: string, startChar: number, endChar: number): Chunk {
  return {
    index,
    text,
    startChar,
    endChar,
    tokenCount: estimateTokenCount(text),
  };
}

/**
 * Get the number of chunks needed for a given text.
 */
export function getChunkCount(text: string, config?: ChunkConfig): number {
  return parseIntoChunks(text, config).length;
}

/**
 * Validate that a chunk is within size limits.
 */
export function isChunkValid(chunk: Chunk, maxTokens: number): boolean {
  return chunk.tokenCount <= maxTokens;
}