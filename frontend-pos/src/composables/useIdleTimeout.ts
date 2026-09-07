import { onMounted, onUnmounted } from 'vue';

/**
 * Tracks user activity and triggers a callback after a specified idle time.
 * 
 * @param {number} timeoutMinutes - The idle time limit in minutes.
 * @param {Function} onTimeout - The callback function to execute when idle.
 */
export function useIdleTimeout(timeoutMinutes: number, onTimeout: () => void) {
  let timeoutId: number | undefined;

  const resetTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      onTimeout();
    }, timeoutMinutes * 60 * 1000);
  };

  const setupListeners = () => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
  };

  const cleanupListeners = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.removeEventListener(event, resetTimer);
    });
  };

  onMounted(() => {
    setupListeners();
    resetTimer();
  });

  onUnmounted(() => {
    cleanupListeners();
  });

  return { resetTimer };
}