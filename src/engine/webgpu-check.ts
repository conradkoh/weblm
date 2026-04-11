/**
 * WebGPU capability detection and feature support checks.
 *
 * Responsibilities:
 * - WebGPU availability detection in browser
 * - Adapter/device capability querying
 * - Memory limit estimation for model selection (E2B vs E4B)
 * - Fallback recommendations for unsupported browsers
 */

/**
 * Result of WebGPU capability check.
 */
export interface WebGPUCapabilities {
  /** Whether WebGPU is available */
  isAvailable: boolean;
  /** Estimated max buffer size in bytes (if available) */
  maxBufferSize?: number;
  /** Estimated available VRAM/VRAM-like memory */
  estimatedMemoryMB?: number;
  /** Reason if unavailable */
  unavailableReason?: string;
}

/**
 * Check if WebGPU is supported in the current browser environment.
 * Returns capabilities and limitations.
 */
export async function checkWebGPUSupport(): Promise<WebGPUCapabilities> {
  // Check if WebGPU API exists
  if (!navigator.gpu) {
    return {
      isAvailable: false,
      unavailableReason: 'WebGPU is not supported in this browser. Please use Chrome 121+, Edge 121+, or Safari 18+.',
    };
  }

  try {
    // Request adapter to verify actual GPU access
    const adapter = await navigator.gpu.requestAdapter();
    
    if (!adapter) {
      return {
        isAvailable: false,
        unavailableReason: 'No WebGPU adapter found. Your GPU may not support WebGPU, or GPU access may be blocked.',
      };
    }

    // Get adapter info and limits
    // Note: requestAdapterInfo() was deprecated; modern browsers use adapter.info property
    const info = adapter.info ?? (typeof adapter.requestAdapterInfo === 'function' ? await adapter.requestAdapterInfo() : null);
    const limits = adapter.limits;
    
    // Estimate available memory based on buffer limits
    // maxBufferSize is the maximum size of a single buffer
    const maxBufferSize = limits.maxBufferSize;
    
    // Rough estimation: available memory is typically 1/4 to 1/2 of max buffer size
    // for integrated GPUs, or dedicated VRAM for discrete GPUs
    const estimatedMemoryMB = Math.floor(maxBufferSize / (1024 * 1024) / 4);

    return {
      isAvailable: true,
      maxBufferSize,
      estimatedMemoryMB,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      isAvailable: false,
      unavailableReason: `WebGPU initialization failed: ${errorMessage}`,
    };
  }
}

/** Browser recommendations for WebGPU support */
export const WEBGPU_BROWSER_RECOMMENDATIONS = [
  'Chrome 121 or later',
  'Edge 121 or later',
  'Safari 18 or later',
  'Firefox Nightly (with dom.webgpu.enabled)',
];

export {};