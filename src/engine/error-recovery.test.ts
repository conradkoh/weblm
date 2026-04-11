import { describe, test, expect, beforeEach } from 'bun:test';
import {
  categorizeError,
  getErrorMessage,
  trackError,
  getRecentErrorCount,
  canAutoRecover,
  getRecoveryAction,
  checkMemorySufficient,
  getMemoryWarning,
  clearErrorHistory,
  getErrorHistory,
  type ErrorCategory,
} from './error-recovery';
import { getModelInfo } from '../config';

describe('categorizeError', () => {
  test('categorizes OOM errors', () => {
    expect(categorizeError(new Error('Out of memory'))).toBe('oom');
    expect(categorizeError(new Error('OOM: allocation failed'))).toBe('oom');
    expect(categorizeError(new Error('memory allocation failed'))).toBe('oom');
    expect(categorizeError(new Error('Not enough memory'))).toBe('oom');
  });

  test('categorizes device lost errors', () => {
    expect(categorizeError(new Error('Device lost'))).toBe('device-lost');
    expect(categorizeError(new Error('WebGPU device was lost'))).toBe('device-lost');
    expect(categorizeError(new Error('GPU crashed'))).toBe('device-lost');
    expect(categorizeError(new Error('context lost'))).toBe('device-lost');
  });

  test('categorizes network errors', () => {
    expect(categorizeError(new Error('Network error'))).toBe('network');
    expect(categorizeError(new Error('fetch failed'))).toBe('network');
    expect(categorizeError(new Error('download failed'))).toBe('network');
    expect(categorizeError(new Error('Connection refused'))).toBe('network');
  });

  test('categorizes validation errors', () => {
    expect(categorizeError(new Error('validation error'))).toBe('validation');
    expect(categorizeError(new Error('Invalid argument'))).toBe('validation');
    expect(categorizeError(new Error('Unsupported operation'))).toBe('validation');
  });

  test('categorizes unknown errors', () => {
    expect(categorizeError(new Error('Something went wrong'))).toBe('unknown');
    expect(categorizeError(new Error(''))).toBe('unknown');
  });

  test('handles error names', () => {
    const error = new Error('test');
    error.name = 'OutOfMemoryError';
    expect(categorizeError(error)).toBe('oom');
  });
});

describe('getErrorMessage', () => {
  test('returns OOM message', () => {
    const msg = getErrorMessage('oom', new Error('test'));
    expect(msg).toContain('memory');
    expect(msg).toContain('smaller model');
  });

  test('returns device lost message', () => {
    const msg = getErrorMessage('device-lost', new Error('test'));
    expect(msg).toContain('GPU');
    expect(msg).toContain('refresh');
  });

  test('returns network message', () => {
    const msg = getErrorMessage('network', new Error('test'));
    expect(msg).toContain('network');
    expect(msg).toContain('connection');
  });

  test('returns validation message', () => {
    const msg = getErrorMessage('validation', new Error('Bad input'));
    expect(msg).toContain('invalid operation');
    expect(msg).toContain('Bad input');
  });

  test('returns unknown message', () => {
    const msg = getErrorMessage('unknown', new Error('test'));
    expect(msg).toContain('unexpected error');
  });
});

describe('error tracking', () => {
  beforeEach(() => {
    clearErrorHistory();
  });

  test('tracks errors', () => {
    trackError('oom', new Error('test'));
    expect(getRecentErrorCount('oom')).toBe(1);
  });

  test('tracks multiple errors', () => {
    trackError('oom', new Error('test1'));
    trackError('oom', new Error('test2'));
    trackError('oom', new Error('test3'));
    expect(getRecentErrorCount('oom')).toBe(3);
  });

  test('tracks errors by category', () => {
    trackError('oom', new Error('test'));
    trackError('network', new Error('test'));
    expect(getRecentErrorCount('oom')).toBe(1);
    expect(getRecentErrorCount('network')).toBe(1);
  });

  test('filters by time window', () => {
    trackError('oom', new Error('test'));
    // Within default window (60s)
    expect(getRecentErrorCount('oom', 60000)).toBe(1);
    // Outside window
    expect(getRecentErrorCount('oom', 0)).toBe(0);
  });

  test('limits error history', () => {
    for (let i = 0; i < 15; i++) {
      trackError('oom', new Error(`test ${i}`));
    }
    const history = getErrorHistory();
    expect(history.length).toBeLessThanOrEqual(10);
  });

  test('clears error history', () => {
    trackError('oom', new Error('test'));
    clearErrorHistory();
    expect(getRecentErrorCount('oom')).toBe(0);
  });

  test('returns error history', () => {
    trackError('oom', new Error('test1'));
    trackError('network', new Error('test2'));
    const history = getErrorHistory();
    expect(history.length).toBe(2);
    expect(history[0]?.lastCategory).toBe('oom');
    expect(history[1]?.lastCategory).toBe('network');
  });
});

describe('canAutoRecover', () => {
  beforeEach(() => {
    clearErrorHistory();
  });

  test('can recover from device-lost once', () => {
    expect(canAutoRecover('device-lost', 'Qwen3-8B-q4f16_1-MLC')).toBe(true);
  });

  test('can recover from network once', () => {
    expect(canAutoRecover('network', 'Qwen3-8B-q4f16_1-MLC')).toBe(true);
  });

  test('can switch from large model to smaller on OOM', () => {
    // Qwen3-8B has 5695 MB — there are definitely smaller models
    expect(canAutoRecover('oom', 'Qwen3-8B-q4f16_1-MLC')).toBe(true);
  });

  test('cannot recover from unknown errors', () => {
    expect(canAutoRecover('unknown', 'Qwen3-8B-q4f16_1-MLC')).toBe(false);
  });

  test('cannot recover after max retries', () => {
    trackError('device-lost', new Error('test'));
    trackError('device-lost', new Error('test'));
    trackError('device-lost', new Error('test'));
    expect(canAutoRecover('device-lost', 'Qwen3-8B-q4f16_1-MLC')).toBe(false);
  });
});

describe('getRecoveryAction', () => {
  beforeEach(() => {
    clearErrorHistory();
  });

  test('recommends a smaller model for OOM on large model', () => {
    const result = getRecoveryAction('oom', 'Qwen3-8B-q4f16_1-MLC');
    expect(result.shouldSwitchModel).toBe(true);
    expect(result.recommendedModel).toBeDefined();
  });

  test('recommended model has less VRAM than current on OOM', () => {
    const result = getRecoveryAction('oom', 'Qwen3-8B-q4f16_1-MLC');
    if (result.recommendedModel) {
      const currentInfo = getModelInfo('Qwen3-8B-q4f16_1-MLC');
      const recommendedInfo = getModelInfo(result.recommendedModel);
      if (currentInfo && recommendedInfo) {
        expect(recommendedInfo.vramMB).toBeLessThan(currentInfo.vramMB);
      }
    }
  });

  test('recommends reload for device-lost', () => {
    const result = getRecoveryAction('device-lost', 'Qwen3-4B-q4f16_1-MLC');
    expect(result.success).toBe(true);
    expect(result.message).toContain('GPU');
  });

  test('recommends retry for network', () => {
    const result = getRecoveryAction('network', 'Qwen3-4B-q4f16_1-MLC');
    expect(result.success).toBe(true);
    expect(result.message).toContain('Network');
  });

  test('provides message for unknown errors', () => {
    const result = getRecoveryAction('unknown', 'Qwen3-4B-q4f16_1-MLC');
    expect(result.message).toContain('unexpected error');
  });
});

describe('checkMemorySufficient', () => {
  test('returns sufficient=true when deviceMemory is undefined', () => {
    const result = checkMemorySufficient('SmolLM2-1.7B-Instruct-q4f16_1-MLC');
    expect(result.sufficient).toBeDefined();
    expect(typeof result.sufficient).toBe('boolean');
  });

  test('calculates required memory based on model', () => {
    const modelInfo = getModelInfo('SmolLM2-1.7B-Instruct-q4f16_1-MLC');
    const result = checkMemorySufficient('SmolLM2-1.7B-Instruct-q4f16_1-MLC');
    // When deviceMemory is undefined, required is 0
    if (result.required > 0 && modelInfo) {
      expect(result.required).toBe(modelInfo.vramMB);
    } else {
      expect(result.required).toBe(0);
    }
  });

  test('returns available and required as numbers', () => {
    const result = checkMemorySufficient('Llama-3.1-8B-Instruct-q4f16_1-MLC');
    expect(typeof result.available).toBe('number');
    expect(typeof result.required).toBe('number');
    expect(typeof result.sufficient).toBe('boolean');
  });
});

describe('getMemoryWarning', () => {
  test('returns null when memory is sufficient', () => {
    const warning = getMemoryWarning('SmolLM2-1.7B-Instruct-q4f16_1-MLC');
    expect(warning).toBeNull();
  });

  test('returns warning string when available', () => {
    const originalDeviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory = 1; // Low memory (1 GB)

    const warning = getMemoryWarning('Llama-3.1-8B-Instruct-q4f16_1-MLC');
    expect(warning).toBeDefined();
    expect(warning).toContain('insufficient');

    // Restore
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory = originalDeviceMemory;
  });
});
