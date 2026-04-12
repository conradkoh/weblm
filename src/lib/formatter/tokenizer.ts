/**
 * Tokenizer utilities for estimating token counts.
 * Uses simple heuristics since we don't have a proper tokenizer available.
 */

const CHARS_PER_TOKEN = 4;

/**
 * Estimate the number of tokens in a text string.
 * Uses a rough heuristic: 1 token ≈ 4 characters.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate how many tokens can fit in a given character count.
 */
export function estimateTokensFromChars(charCount: number): number {
  return Math.ceil(charCount / CHARS_PER_TOKEN);
}

/**
 * Convert token count to character count.
 */
export function tokensToChars(tokens: number): number {
  return tokens * CHARS_PER_TOKEN;
}

/**
 * Default max context window size (128k tokens).
 * This is a reasonable default for most modern models.
 */
export const DEFAULT_MAX_CONTEXT_WINDOW = 128000;

/**
 * Get the default chunk size (1/3 of max context window).
 */
export function getDefaultChunkSize(): number {
  return Math.floor(DEFAULT_MAX_CONTEXT_WINDOW / 3);
}

/**
 * Get the default chunk size in characters.
 */
export function getDefaultChunkSizeChars(): number {
  return tokensToChars(getDefaultChunkSize());
}