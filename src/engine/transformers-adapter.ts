/**
 * TransformersJsAdapter — implements LLMEngine using @huggingface/transformers.
 *
 * Runs models via ONNX/WebGPU in the browser without WebLLM.
 * Enables larger context windows and models not available in the prebuilt WebLLM catalog.
 */

import {
  pipeline,
  TextStreamer,
  InterruptableStoppingCriteria,
  type TextGenerationPipeline,
  type ProgressInfo,
} from '@huggingface/transformers';
import type { LLMEngine } from './llm-engine';
import type { ChatMessage } from '../types';
import type { ModelProgress, ProgressCallback } from './types';
import { logger } from '../logger';

export class TransformersJsAdapter implements LLMEngine {
  private pipe: TextGenerationPipeline | null = null;
  private currentModelId: string | null = null;
  private _isGenerating = false;
  private stoppingCriteria = new InterruptableStoppingCriteria();

  // ─── LLMEngine implementation ─────────────────────────────

  async initialize(modelId: string, onProgress?: ProgressCallback): Promise<void> {
    try {
      this.pipe = await pipeline('text-generation', modelId, {
        device: 'webgpu',
        progress_callback: (info: ProgressInfo) => {
          if (!onProgress) return;

          let progress: ModelProgress;

          if (info.status === 'progress') {
            progress = {
              phase: 'downloading',
              progress: Math.round(info.progress ?? 0),
              message: `Downloading ${info.file ?? ''}… (${Math.round(info.progress ?? 0)}%)`,
            };
          } else if (info.status === 'progress_total') {
            progress = {
              phase: 'loading',
              progress: Math.round(info.progress ?? 0),
              message: `Loading model… (${Math.round(info.progress ?? 0)}%)`,
            };
          } else if (info.status === 'ready') {
            progress = {
              phase: 'ready',
              progress: 100,
              message: 'Model ready.',
            };
          } else {
            // 'initiate' | 'download' | 'done'
            progress = {
              phase: 'loading',
              progress: 0,
              message: `Loading${info.file ? ` ${info.file}` : ''}…`,
            };
          }

          onProgress(progress);
        },
      });

      this.currentModelId = modelId;

      onProgress?.({
        phase: 'ready',
        progress: 100,
        message: `${modelId} loaded successfully!`,
      });
    } catch (error) {
      this.pipe = null;
      this.currentModelId = null;
      throw error;
    }
  }

  async sendMessage(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: Error) => void,
    options?: { temperature?: number; maxTokens?: number; topP?: number }
  ): Promise<void> {
    if (!this.pipe) {
      onError(new Error('Model not loaded'));
      return;
    }

    if (this._isGenerating) {
      onError(new Error('Already generating'));
      return;
    }

    this._isGenerating = true;
    this.stoppingCriteria.reset();

    const chatMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

    let fullResponse = '';

    try {
      // TextStreamer calls callback_function with each decoded text chunk
      const streamer = new TextStreamer(this.pipe.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          fullResponse += text;
          onToken(text);
        },
      });

      await this.pipe(chatMessages, {
        max_new_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 0.95,
        do_sample: (options?.temperature ?? 0.7) > 0,
        streamer,
        stopping_criteria: this.stoppingCriteria,
        return_full_text: false,
      });

      onComplete(fullResponse);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('TransformersJsAdapter generation error:', err);
      onError(err);
    } finally {
      this._isGenerating = false;
    }
  }

  stopGeneration(): void {
    if (this._isGenerating) {
      this.stoppingCriteria.interrupt();
      this._isGenerating = false;
    }
  }

  async unload(): Promise<void> {
    if (this.pipe) {
      try {
        await this.pipe.dispose();
      } catch (error) {
        logger.error('TransformersJsAdapter unload error:', error);
      } finally {
        this.pipe = null;
        this.currentModelId = null;
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
    return this.pipe !== null;
  }
}
