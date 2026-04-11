/**
 * Chat history persistence using IndexedDB.
 * 
 * Stores chat messages so they persist across browser sessions.
 */

import type { ChatMessage } from '../types';

const DB_NAME = 'weblm-chat';
const STORE_NAME = 'messages';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

/**
 * Open the chat history database.
 */
export async function openChatDatabase(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Create object store for messages
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Save all chat messages to IndexedDB.
 */
export async function saveChatMessages(messages: ChatMessage[]): Promise<void> {
  const database = await openChatDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Clear existing messages
    store.clear();

    // Add all messages
    messages.forEach(message => {
      store.add(message);
    });

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Load all chat messages from IndexedDB.
 */
export async function loadChatMessages(): Promise<ChatMessage[]> {
  const database = await openChatDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Clear all chat messages from IndexedDB.
 */
export async function clearChatMessages(): Promise<void> {
  const database = await openChatDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Append a single message to the stored chat.
 * More efficient than saveChatMessages for incremental updates.
 */
export async function appendChatMessage(message: ChatMessage): Promise<void> {
  const database = await openChatDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(message);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}