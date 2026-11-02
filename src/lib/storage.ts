/**
 * Safe Storage Utility for Cross-Browser Resilience
 * 
 * In Safari Private Browsing mode, Firefox Strict Tracking Protection,
 * or when the app is rendered in a third-party iframe (such as Cloud Run previews),
 * accessing or writing to window.localStorage can throw a DOMException:
 * "SecurityError: The operation is insecure" or "QuotaExceededError".
 * 
 * safeStorage intercepts any exceptions and falls back to an in-memory Map,
 * preventing any crashes or white-screen errors across all browsers.
 */

const memoryStore = new Map<string, string>();

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = typeof window !== 'undefined' ? isLocalStorageAvailable() : false;

export const safeStorage = {
  getItem(key: string): string | null {
    if (storageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Fallback to in-memory store
      }
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    if (storageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // Fallback to in-memory store on quota or security error
      }
    }
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    if (storageAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Fallback
      }
    }
    memoryStore.delete(key);
  },

  clear(): void {
    if (storageAvailable) {
      try {
        window.localStorage.clear();
      } catch {
        // Fallback
      }
    }
    memoryStore.clear();
  }
};
