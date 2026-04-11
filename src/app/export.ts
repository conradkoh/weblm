/**
 * Chat export functionality.
 *
 * Responsibilities:
 * - Export chat history as plain text
 * - Export chat history as markdown
 * - Download files to user's computer
 */

import type { ChatMessage } from '../types';

/**
 * Export chat history as plain text.
 */
export function exportChatAsText(messages: ChatMessage[]): void {
  const lines: string[] = [];
  lines.push('=== WebLM Chat Export ===');
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push('');
  
  messages.forEach(msg => {
    const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
    const timestamp = new Date(msg.timestamp).toLocaleString();
    lines.push(`[${timestamp}] ${role}:`);
    lines.push(msg.content);
    lines.push('');
  });
  
  const content = lines.join('\n');
  downloadFile(content, 'weblm-chat.txt', 'text/plain');
}

/**
 * Export chat history as markdown.
 */
export function exportChatAsMarkdown(messages: ChatMessage[]): void {
  const lines: string[] = [];
  lines.push('# WebLM Chat Export');
  lines.push('');
  lines.push(`*Exported: ${new Date().toLocaleString()}*`);
  lines.push('');
  
  messages.forEach(msg => {
    const role = msg.role === 'user' ? '## User' : msg.role === 'assistant' ? '## Assistant' : '## System';
    const timestamp = new Date(msg.timestamp).toLocaleString();
    lines.push(role);
    lines.push(`*${timestamp}*`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  
  const content = lines.join('\n');
  downloadFile(content, 'weblm-chat.md', 'text/markdown');
}

/**
 * Download a file to the user's computer.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}