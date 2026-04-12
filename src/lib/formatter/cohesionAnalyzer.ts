/**
 * Cohesion analyzer — analyzes pairs of chunks for cohesion issues.
 */

import type { ChatMessage } from '../../types';
import type { FormatterBackend } from './backend';
import { logger } from '../../logger';
import { generateId } from '../../types';

export interface CohesionIssue {
  type: 'abrupt_transition' | 'duplicate_content' | 'missing_context' | 'topic_shift';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface CohesionAnalysis {
  hasIssues: boolean;
  issues: CohesionIssue[];
  summary: string;
}

/**
 * Analyze the cohesion between two consecutive chunks.
 * Identifies abrupt transitions, duplicates, missing context, and topic shifts.
 */
export async function analyzeCohesion(
  chunk1: string,
  chunk2: string,
  backend: FormatterBackend,
  options?: { onToken?: (token: string) => void }
): Promise<CohesionAnalysis> {
  const systemPrompt = `You are a content analysis assistant. Analyze two text chunks for cohesion issues.
For each pair, identify:
1. abrupt_transition: Sudden topic or style changes
2. duplicate_content: Repeated information between chunks
3. missing_context: References that depend on previous content
4. topic_shift: Significant changes in subject matter

Output a JSON object with this structure:
{
  "hasIssues": boolean,
  "issues": [
    {
      "type": "abrupt_transition" | "duplicate_content" | "missing_context" | "topic_shift",
      "description": "description of the issue",
      "severity": "low" | "medium" | "high",
      "suggestion": "how to fix this (optional)"
    }
  ],
  "summary": "overall summary of cohesion"
}`;

  const userPrompt = `Analyze cohesion between these two chunks:

--- CHUNK 1 ---
${chunk1}

--- CHUNK 2 ---
${chunk2}

Output only JSON, no other text:`;

  const messages: ChatMessage[] = [
    {
      id: generateId(),
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    {
      id: generateId(),
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toISOString(),
    },
  ];

  const response = await backend.generate(messages, {
    temperature: 0.3,
    maxTokens: 1024,
    onToken: options?.onToken,
  });

  try {
    // Try to parse JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]) as CohesionAnalysis;
      return analysis;
    } else {
      // If JSON parsing fails, create a simple analysis
      return {
        hasIssues: false,
        issues: [],
        summary: response.trim(),
      };
    }
  } catch (err) {
    logger.error('Error parsing cohesion analysis JSON:', err);
    return {
      hasIssues: false,
      issues: [],
      summary: response.trim(),
    };
  }
}

/**
 * Analyze all consecutive chunk pairs in parallel.
 */
export async function analyzeAllCohesions(
  chunks: string[],
  backend: FormatterBackend,
  options?: { onToken?: (token: string) => void }
): Promise<CohesionAnalysis[]> {
  if (chunks.length < 2) {
    return [];
  }

  const analyses: CohesionAnalysis[] = [];
  const concurrency = backend.recommendedConcurrency();
  
  for (let i = 0; i < chunks.length - 1; i += concurrency) {
    const batch: Promise<CohesionAnalysis>[] = [];
    
    for (let j = 0; j < concurrency && i + j < chunks.length - 1; j++) {
      const idx = i + j;
      const chunk1 = chunks[idx]!;
      const chunk2 = chunks[idx + 1]!;
      
      batch.push(
        analyzeCohesion(chunk1, chunk2, backend, options).catch(err => {
          logger.error(`Error analyzing cohesion between chunks ${idx} and ${idx + 1}:`, err);
          return {
            hasIssues: false,
            issues: [],
            summary: 'Analysis failed',
          };
        })
      );
    }
    
    const batchResults = await Promise.all(batch);
    analyses.push(...batchResults);
  }

  return analyses;
}

/**
 * Check if any analysis has high severity issues.
 */
export function hasHighSeverityIssues(analyses: CohesionAnalysis[]): boolean {
  return analyses.some(a => a.issues.some(i => i.severity === 'high'));
}

/**
 * Get total issue count across all analyses.
 */
export function getTotalIssueCount(analyses: CohesionAnalysis[]): number {
  return analyses.reduce((sum, a) => sum + a.issues.length, 0);
}