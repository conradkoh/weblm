/**
 * WebGPU type declarations.
 * 
 * These types extend the Navigator interface to include WebGPU API.
 * TypeScript's DOM lib does not yet include these types by default.
 */

interface GPUSupportedLimits {
  maxTextureDimension1D: number;
  maxTextureDimension2D: number;
  maxTextureDimension3D: number;
  maxTextureArrayLayers: number;
  maxBindGroups: number;
  maxBindingsPerBindGroup: number;
  maxBufferSize: number;
  maxVertexBuffers: number;
  maxVertexAttributes: number;
  maxVertexBufferArrayStride: number;
  [key: string]: number;
}

interface GPUAdapterInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
}

interface GPUAdapter {
  readonly limits: GPUSupportedLimits;
  /** Modern property (replaces deprecated requestAdapterInfo()) */
  readonly info?: GPUAdapterInfo;
  /** @deprecated Use adapter.info instead */
  requestAdapterInfo?(): Promise<GPUAdapterInfo>;
  requestDevice(): Promise<GPUDevice>;
  readonly features: Set<string>;
  readonly isFallbackAdapter: boolean;
}

interface GPUDevice {
  readonly features: Set<string>;
  readonly limits: GPUSupportedLimits;
  readonly queue: GPUQueue;
  destroy(): void;
  lost: Promise<{ message: string; reason: string }>;
}

interface GPUQueue {
  submit(commandBuffers: unknown[]): void;
}

interface Navigator {
  gpu: {
    requestAdapter(): Promise<GPUAdapter | null>;
    requestAdapter(options?: unknown): Promise<GPUAdapter | null>;
  };
}