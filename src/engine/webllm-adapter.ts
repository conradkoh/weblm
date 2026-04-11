/**
 * WebLLMAdapter — implements LLMEngine using @mlc-ai/web-llm.
 *
 * Encapsulates all WebLLM-specific logic: MLCEngine instance management,
 * progress reporting, streaming completions, and generation control.
 */

import {
  CreateMLCEngine,
  prebuiltAppConfig,
  type MLCEngine,
  type InitProgressReport,
} from '@mlc-ai/web-llm';
import type { LLMEngine } from './llm-engine';
import type { ChatMessage } from '../types';
import type { ModelProgress, ProgressCallback } from './types';
import { getModelInfo, DEFAULT_GENERATION_CONFIG, GEMMA3_MODEL_RECORDS } from '../config';
import { logger } from '../logger';

export class WebLLMAdapter implements LLMEngine {
  private engine: MLCEngine | null = null;
  private currentModelId: string | null = null;
  private loadingController: AbortController | null = null;
  private _isGenerating = false;

  // ─── LLMEngine implementation ─────────────────────────────

  async initialize(modelId: string, onProgress?: ProgressCallback): Promise<void> {
    const info = getModelInfo(modelId);
    const displayName = info?.displayName ?? modelId;

    this.loadingController = new AbortController();
    const { signal } = this.loadingController;

    try {
      this.engine = await CreateMLCEngine(modelId, {
        appConfig: {
          model_list: [...prebuiltAppConfig.model_list, ...GEMMA3_MODEL_RECORDS],
        },
        initProgressCallback: (report: InitProgressReport) => {
          if (signal.aborted) {
            throw new Error('Loading cancelled');
          }

          const progress: ModelProgress = {
            phase: report.text?.toLowerCase().includes('download')
              ? 'downloading'
              : report.text?.toLowerCase().includes('compil')
                ? 'compiling'
                : 'loading',
            progress: Math.round(report.progress * 100),
            message: report.text || `Loading ${displayName}...`,
            timeElapsed: report.timeElapsed,
          };

          onProgress?.(progress);
        },
      });

      this.currentModelId = modelId;

      onProgress?.({
        phase: 'ready',
        progress: 100,
        message: `${displayName} loaded successfully!`,
      });
    } catch (error) {
      this.engine = null;
      this.currentModelId = null;
      throw error;
    } finally {
      this.loadingController = null;
    }
  }

  async sendMessage(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: Error) => void,
    options?: { temperature?: number; maxTokens?: number; topP?: number }
  ): Promise<void> {
    if (!this.engine) {
      onError(new Error('Model not loaded'));
      return;
    }

    if (this._isGenerating) {
      onError(new Error('Already generating'));
      return;
    }

    this._isGenerating = true;

    try {
      const stream = await this.engine.chat.completions.create({
        messages: this._toWebLLMMessages(messages),
        stream: true,
        temperature: options?.temperature ?? DEFAULT_GENERATION_CONFIG.temperature,
        max_tokens: options?.maxTokens ?? DEFAULT_GENERATION_CONFIG.maxTokens,
        top_p: options?.topP ?? DEFAULT_GENERATION_CONFIG.topP,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullResponse += delta;
          onToken(delta);
        }
      }

      onComplete(fullResponse);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Generation error:', err);
      onError(err);
    } finally {
      this._isGenerating = false;
    }
  }

  stopGeneration(): void {
    if (this.engine && this._isGenerating) {
      try {
        this.engine.interruptGenerate();
      } catch (error) {
        logger.error('Error stopping generation:', error);
      }
      this._isGenerating = false;
    }
  }

  async unload(): Promise<void> {
    if (this.engine) {
      try {
        this.engine = null;
        this.currentModelId = null;
      } catch (error) {
        logger.error('Error unloading engine:', error);
      }
    }
  }

  isGenerating(): boolean {
    return this._isGenerating;
  }

  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  isModelLoaded(): boolean {
    return this.engine !== null;
  }

  // ─── Internal helpers ─────────────────────────────────────

  /** Cancel the ongoing model loading. */
  cancelLoading(): void {
    if (this.loadingController) {
      this.loadingController.abort();
      this.loadingController = null;
    }
  }

  private _toWebLLMMessages(
    messages: ChatMessage[]
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));
  }
}
