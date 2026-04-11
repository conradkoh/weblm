/**
 * Service Worker Registration and Offline Status.
 * 
 * Handles PWA installation, offline detection, and service worker lifecycle.
 */

/** Callback for offline status changes */
type OfflineCallback = (isOffline: boolean, isReady: boolean) => void;

/** Whether the service worker is active */
let swActive = false;

/** Whether the app is offline-ready */
let offlineReady = false;

/** Listeners for offline status changes */
const offlineListeners: OfflineCallback[] = [];

/**
 * Register the service worker.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Service worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available');
            // Optionally prompt user to refresh
          }
        });
      }
    });

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    swActive = true;
    offlineReady = true;
    notifyListeners();

    console.log('[SW] Service worker is ready');

    // Check if we're offline
    if (!navigator.onLine) {
      console.log('[SW] App is offline but service worker is active');
    }
  } catch (error) {
    console.error('[SW] Service worker registration failed:', error);
  }
}

/**
 * Check if the service worker is active.
 */
export function isServiceWorkerActive(): boolean {
  return swActive;
}

/**
 * Check if the app is offline-ready.
 */
export function isOfflineReady(): boolean {
  return offlineReady;
}

/**
 * Subscribe to offline status changes.
 */
export function onOfflineStatusChange(callback: OfflineCallback): () => void {
  offlineListeners.push(callback);
  // Immediately notify with current status
  callback(!navigator.onLine, offlineReady);
  
  // Return unsubscribe function
  return () => {
    const index = offlineListeners.indexOf(callback);
    if (index > -1) {
      offlineListeners.splice(index, 1);
    }
  };
}

/**
 * Notify all listeners of status change.
 */
function notifyListeners(): void {
  const isOffline = !navigator.onLine;
  offlineListeners.forEach(callback => callback(isOffline, offlineReady));
}

/**
 * Setup offline/online event listeners.
 */
export function setupOfflineDetection(): void {
  window.addEventListener('online', () => {
    console.log('[SW] App is online');
    notifyListeners();
  });

  window.addEventListener('offline', () => {
    console.log('[SW] App is offline');
    notifyListeners();
  });

  // Initial notification
  notifyListeners();
}

/**
 * Get current online status.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}