/**
 * TransformersJsAdapter — implements LLMEngine using @huggingface/transformers.
 *
 * Runs models via ONNX/WebGPU in the browser without WebLLM.
 * Enables larger context windows and models not available in the prebuilt WebLLM catalog.
 *
 * Supports two model types:
 * - `'text-generation'`        — loaded via `pipeline('text-generation', …)` (e.g. Qwen2.5)
 * - `'conditional-generation'` — loaded via `AutoProcessor` + model class (e.g. Gemma 4)
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
import { ProgressAggregator } from './progress-aggregator';
import { getTransformersModelRecord } from './transformers-models';
import { logger } from '../logger';

// ─── Internal types ──────────────────────────────────────────────

/** State for a model loaded via `pipeline('text-generation', …)` */
interface PipelineState {
  kind: 'pipeline';
  pipe: TextGenerationPipeline;
}

/** State for a conditional-generation model loaded via AutoProcessor + model class */
interface ConditionalGenState {
  kind: 'conditional-generation';
  processor: any;  // AutoProcessor instance
  model: any;      // Gemma4ForCausalLM (or similar)
}

type ModelState = PipelineState | ConditionalGenState;

// ─── Adapter ────────────────────────────────────────────────────

export class TransformersJsAdapter implements LLMEngine {
  private state: ModelState | null = null;
  private currentModelId: string | null = null;
  private _isGenerating = false;
  private stoppingCriteria = new InterruptableStoppingCriteria();

  // ─── LLMEngine implementation ─────────────────────────────

  async initialize(modelId: string, onProgress?: ProgressCallback): Promise<void> {
    const record = getTransformersModelRecord(modelId);
    const modelType = record?.modelType ?? 'text-generation';

    try {
      if (modelType === 'conditional-generation') {
        await this.initializeConditionalGeneration(modelId, onProgress);
      } else {
        await this.initializePipeline(modelId, onProgress);
      }

      this.currentModelId = modelId;

      onProgress?.({
        phase: 'ready',
        progress: 100,
        message: `${modelId} loaded successfully!`,
      });
    } catch (error) {
      this.state = null;
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
    if (!this.state) {
      onError(new Error('Model not loaded'));
      return;
    }

    if (this._isGenerating) {
      onError(new Error('Already generating'));
      return;
    }

    this._isGenerating = true;
    this.stoppingCriteria.reset();

    try {
      if (this.state.kind === 'pipeline') {
        await this.sendPipelineMessage(this.state.pipe, messages, onToken, onComplete, options);
      } else {
        await this.sendConditionalGenMessage(this.state, messages, onToken, onComplete, options);
      }
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
    if (!this.state) return;

    try {
      if (this.state.kind === 'pipeline' && this.state.pipe) {
        await this.state.pipe.dispose();
      } else if (this.state.kind === 'conditional-generation' && this.state.model) {
        await this.state.model.dispose();
      }
    } catch (error) {
      logger.error('TransformersJsAdapter unload error:', error);
    } finally {
      this.state = null;
      this.currentModelId = null;
    }
  }

  isGenerating(): boolean {
    return this._isGenerating;
  }

  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  isModelLoaded(): boolean {
    if (!this.state) return false;
    if (this.state.kind === 'pipeline') return this.state.pipe !== null;
    return this.state.model !== null;
  }

  // ─── Initialization helpers ─────────────────────────────────

  /**
   * Load a text-generation model via the pipeline API.
   * Used for models like Qwen2.5.
   * Single sequential download — no aggregation needed.
   */
  private async initializePipeline(
    modelId: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const pipe = await pipeline('text-generation', modelId, {
      device: 'webgpu',
      progress_callback: (info: ProgressInfo) => {
        this.handleProgress(info, onProgress);
      },
    }) as TextGenerationPipeline;

    this.state = { kind: 'pipeline', pipe };
  }

  /**
   * Load a conditional-generation model via AutoProcessor + model class.
   * Used for multimodal models like Gemma 4 in text-only mode.
   * Both AutoProcessor and ModelClass download files in parallel,
   * so ProgressAggregator is used to prevent UI flicker.
   */
  private async initializeConditionalGeneration(
    modelId: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    // Dynamically import to keep initial bundle small
    const { AutoProcessor, Gemma4ForCausalLM: ModelClass } =
      await import('@huggingface/transformers');

    // Aggregate concurrent progress events from AutoProcessor and ModelClass
    const aggregator = new ProgressAggregator();
    aggregator.reset();

    const progressCallback = (info: ProgressInfo) => {
      const aggregated = aggregator.process(info);
      if (aggregated && onProgress) {
        onProgress(aggregated);
      }
    };

    const [processor, model] = await Promise.all([
      AutoProcessor.from_pretrained(modelId, {
        progress_callback: progressCallback,
      }),
      ModelClass.from_pretrained(modelId, {
        dtype: 'q4f16',
        device: 'webgpu',
        progress_callback: progressCallback,
      }),
    ]);

    this.state = { kind: 'conditional-generation', processor, model };
  }

  // ─── Generation helpers ────────────────────────────────────

  /**
   * Generate using the pipeline API (text-generation models).
   */
  private async sendPipelineMessage(
    pipe: TextGenerationPipeline,
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onComplete: (fullResponse: string) => void,
    options?: { temperature?: number; maxTokens?: number; topP?: number }
  ): Promise<void> {
    const chatMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

    let fullResponse = '';

    const streamer = new TextStreamer(pipe.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        fullResponse += text;
        onToken(text);
      },
    });

    await pipe(chatMessages, {
      max_new_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 0.95,
      do_sample: (options?.temperature ?? 0.7) > 0,
      streamer,
      stopping_criteria: this.stoppingCriteria,
      return_full_text: false,
    });

    onComplete(fullResponse);
  }

  /**
   * Generate using direct model.generate() (conditional-generation models).
   * Handles text-only chat with multimodal models like Gemma 4.
   */
  private async sendConditionalGenMessage(
    state: ConditionalGenState,
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onComplete: (fullResponse: string) => void,
    options?: { temperature?: number; maxTokens?: number; topP?: number }
  ): Promise<void> {
    const { processor, model } = state;

    // Format chat messages for text-only generation
    const chatMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

    // Apply chat template (disable thinking mode for regular chat)
    const text = processor.apply_chat_template(chatMessages, {
      add_generation_prompt: true,
      enable_thinking: false,
    });

    // Tokenize using the processor's tokenizer for text-only input
    const inputs = await processor.tokenizer(text, {
      add_special_tokens: false,
    });

    let fullResponse = '';

    const streamer = new TextStreamer(processor.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        fullResponse += text;
        onToken(text);
      },
    });

    await model.generate({
      ...inputs,
      max_new_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 0.95,
      do_sample: (options?.temperature ?? 0.7) > 0,
      streamer,
      stopping_criteria: this.stoppingCriteria,
    });

    onComplete(fullResponse);
  }

  // ─── Progress helper ────────────────────────────────────────

  /**
   * Simple passthrough progress handler for pipeline mode (single sequential download).
   * Conditional-generation mode uses ProgressAggregator instead.
   */
  private handleProgress(info: ProgressInfo, onProgress?: ProgressCallback): void {
    if (!onProgress) return;

    // Guard access to `file` — only exists on some ProgressInfo variants
    const hasFile = 'file' in info && info.file !== undefined;

    if (info.status === 'progress' && hasFile) {
      onProgress({
        phase: 'downloading',
        progress: Math.round(info.progress ?? 0),
        message: `Downloading ${info.file}… (${Math.round(info.progress ?? 0)}%)`,
      });
    } else if (info.status === 'progress_total') {
      onProgress({
        phase: 'loading',
        progress: Math.round(info.progress ?? 0),
        message: `Loading model… (${Math.round(info.progress ?? 0)}%)`,
      });
    } else if (info.status === 'ready') {
      onProgress({ phase: 'ready', progress: 100, message: 'Model ready.' });
    } else {
      onProgress({
        phase: 'loading',
        progress: 0,
        message: hasFile ? `Loading ${info.file}…` : 'Loading…',
      });
    }
  }
}
