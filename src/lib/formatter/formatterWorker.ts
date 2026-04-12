/**
 * Formatter Web Worker script.
 * Loads Transformers.js model in WASM mode and handles generate requests.
 * 
 * Note: This worker uses WASM device (not WebGPU) for worker compatibility.
 * Each worker loads its own model instance.
 */

import { pipeline, type TextGenerationPipeline } from '@huggingface/transformers';

// Type for the message format
interface GenerateMessage {
  type: 'generate';
  id: string;
  messages: Array<{ role: string; content: string }>;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}

interface InitMessage {
  type: 'init';
  modelId: string;
}

interface OutgoingReadyMessage {
  type: 'ready';
}

interface OutgoingResultMessage {
  type: 'result';
  id: string;
  content: string;
}

interface OutgoingErrorMessage {
  type: 'error';
  id?: string;
  error: string;
}

interface OutgoingLogMessage {
  type: 'log';
  message: string;
}

type OutgoingMessage = OutgoingReadyMessage | OutgoingResultMessage | OutgoingErrorMessage | OutgoingLogMessage;

// Pipeline instance (loaded on init)
let pipe: TextGenerationPipeline | null = null;

/**
 * Handle incoming messages from the main thread.
 */
self.onmessage = async (event: MessageEvent) => {
  const data = event.data;
  
  if (data.type === 'init') {
    await handleInit(data.modelId as string);
    return;
  }

  if (data.type === 'generate') {
    await handleGenerate(
      data.id as string,
      data.messages as Array<{ role: string; content: string }>,
      data.options as { temperature?: number; maxTokens?: number } | undefined
    );
    return;
  }
};

/**
 * Initialize the model pipeline.
 */
async function handleInit(modelId: string): Promise<void> {
  try {
    (self as unknown as Worker).postMessage({ type: 'log', message: `Loading model: ${modelId}` });
    
    // Load model in WASM mode for worker compatibility
    pipe = await pipeline(
      'text-generation',
      modelId,
      { device: 'wasm' } as any
    ) as TextGenerationPipeline;

    (self as unknown as Worker).postMessage({ type: 'ready' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    (self as unknown as Worker).postMessage({ type: 'error', error: errorMessage });
  }
}

/**
 * Handle a generate request.
 */
async function handleGenerate(
  id: string,
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
): Promise<void> {
  if (!pipe) {
    (self as unknown as Worker).postMessage({ type: 'error', id, error: 'Model not loaded' });
    return;
  }

  try {
    // Build prompt from messages (similar to how the engine handles it)
    const prompt = buildPrompt(messages);

    // Run inference
    const result = await pipe(prompt, {
      max_new_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.3,
      do_sample: true,
      return_full_text: false,
    });

    // Extract generated text
    let content = '';
    if (result && Array.isArray(result) && result.length > 0) {
      const firstResult = result[0];
      if (firstResult && typeof firstResult === 'object') {
        const generated = (firstResult as Record<string, unknown>).generated_text;
        if (typeof generated === 'string') {
          content = generated;
        } else if (Array.isArray(generated)) {
          // For chat models, the output might be structured
          const lastItem = generated[generated.length - 1];
          content = typeof lastItem === 'string' ? lastItem : JSON.stringify(generated);
        } else {
          content = String(generated);
        }
      }
    }

    (self as unknown as Worker).postMessage({ type: 'result', id, content: content.trim() });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    (self as unknown as Worker).postMessage({ type: 'error', id, error: errorMessage });
  }
}

/**
 * Build a prompt string from chat messages.
 * Similar to how transformers.js chat templates work.
 */
function buildPrompt(messages: Array<{ role: string; content: string }>): string {
  const parts: string[] = [];
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      parts.push(`System: ${msg.content}`);
    } else if (msg.role === 'user') {
      parts.push(`User: ${msg.content}`);
    } else if (msg.role === 'assistant') {
      parts.push(`Assistant: ${msg.content}`);
    } else {
      parts.push(`${msg.role}: ${msg.content}`);
    }
  }

  // Add assistant prefix for continuation
  parts.push('Assistant:');
  
  return parts.join('\n');
}