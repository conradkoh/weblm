import { describe, test, expect } from 'bun:test';
import type { ChatMessage } from '../types';

// Note: IndexedDB requires a browser environment. These tests verify the interface
// and types. For full integration tests, a browser testing framework would be needed.

// Helper to create test messages
function createTestMessage(id: string, role: 'user' | 'assistant' | 'system', content: string): ChatMessage {
  return {
    id,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

describe('ChatMessage type', () => {
  test('message has required fields', () => {
    const msg: ChatMessage = {
      id: 'test-1',
      role: 'user',
      content: 'Hello',
      timestamp: '2024-01-01T00:00:00.000Z',
    };
    expect(msg.id).toBe('test-1');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
    expect(msg.timestamp).toBe('2024-01-01T00:00:00.000Z');
  });

  test('message can have streaming flag', () => {
    const msg: ChatMessage = {
      id: 'test-2',
      role: 'assistant',
      content: 'Response',
      timestamp: '2024-01-01T00:00:00.000Z',
      streaming: true,
    };
    expect(msg.streaming).toBe(true);
  });

  test('supports all message roles', () => {
    const userMsg: ChatMessage = { id: '1', role: 'user', content: '', timestamp: '' };
    const assistantMsg: ChatMessage = { id: '2', role: 'assistant', content: '', timestamp: '' };
    const systemMsg: ChatMessage = { id: '3', role: 'system', content: '', timestamp: '' };
    
    expect(userMsg.role).toBe('user');
    expect(assistantMsg.role).toBe('assistant');
    expect(systemMsg.role).toBe('system');
  });

  test('message with system role', () => {
    const msg: ChatMessage = {
      id: 'sys-1',
      role: 'system',
      content: 'You are a helpful assistant.',
      timestamp: new Date().toISOString(),
    };
    expect(msg.role).toBe('system');
    expect(msg.content).toContain('assistant');
  });

  test('message ids are unique', () => {
    const msg1 = createTestMessage('a', 'user', 'test1');
    const msg2 = createTestMessage('b', 'user', 'test2');
    expect(msg1.id).not.toBe(msg2.id);
  });

  test('message timestamps are valid ISO strings', () => {
    const msg = createTestMessage('1', 'user', 'test');
    const date = new Date(msg.timestamp);
    expect(date.toISOString()).toBe(msg.timestamp);
  });
});

describe('Message creation helpers', () => {
  test('creates user message', () => {
    const msg = createTestMessage('test-id', 'user', 'Hello world');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello world');
    expect(msg.id).toBe('test-id');
    expect(msg.timestamp).toBeDefined();
  });

  test('creates assistant message', () => {
    const msg = createTestMessage('test-id', 'assistant', 'Response');
    expect(msg.role).toBe('assistant');
    expect(msg.content).toBe('Response');
  });

  test('creates system message', () => {
    const msg = createTestMessage('test-id', 'system', 'System prompt');
    expect(msg.role).toBe('system');
    expect(msg.content).toBe('System prompt');
  });

  test('messages can have streaming state', () => {
    const msg: ChatMessage = {
      ...createTestMessage('1', 'assistant', 'streaming'),
      streaming: true,
    };
    expect(msg.streaming).toBe(true);
  });
});

describe('Message array operations', () => {
  test('filter by role', () => {
    const messages: ChatMessage[] = [
      createTestMessage('1', 'user', 'Hello'),
      createTestMessage('2', 'assistant', 'Hi'),
      createTestMessage('3', 'user', 'How are you?'),
    ];
    const userMessages = messages.filter(m => m.role === 'user');
    expect(userMessages.length).toBe(2);
  });

  test('sort by timestamp', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'later', timestamp: '2024-01-02T00:00:00.000Z' },
      { id: '2', role: 'user', content: 'earlier', timestamp: '2024-01-01T00:00:00.000Z' },
    ];
    const sorted = [...messages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    expect(sorted[0]?.content).toBe('earlier');
  });

  test('find by id', () => {
    const messages: ChatMessage[] = [
      createTestMessage('a', 'user', 'first'),
      createTestMessage('b', 'assistant', 'second'),
    ];
    const found = messages.find(m => m.id === 'b');
    expect(found?.content).toBe('second');
  });

  test('map content', () => {
    const messages: ChatMessage[] = [
      createTestMessage('1', 'user', 'Hello'),
      createTestMessage('2', 'assistant', 'World'),
    ];
    const contents = messages.map(m => m.content);
    expect(contents).toEqual(['Hello', 'World']);
  });
});

describe('Message content handling', () => {
  test('empty content', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      content: '',
      timestamp: new Date().toISOString(),
    };
    expect(msg.content).toBe('');
  });

  test('long content', () => {
    const longContent = 'a'.repeat(10000);
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      content: longContent,
      timestamp: new Date().toISOString(),
    };
    expect(msg.content.length).toBe(10000);
  });

  test('special characters in content', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Hello <world> & "quoted"',
      timestamp: new Date().toISOString(),
    };
    expect(msg.content).toContain('<world>');
    expect(msg.content).toContain('&');
    expect(msg.content).toContain('"quoted"');
  });

  test('multiline content', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Line 1\nLine 2\nLine 3',
      timestamp: new Date().toISOString(),
    };
    expect(msg.content.split('\n').length).toBe(3);
  });
});