import type { App } from 'vue';

/**
 * Global error handling utility to catch unhandled exceptions.
 * Prevents the application from crashing into a blank white screen.
 * 
 * @param app - The Vue application instance
 */
export function setupGlobalErrorHandler(app: App): void {
  app.config.errorHandler = (err, instance, info) => {
    // 1. Log the error for debugging purposes
    console.error('[Global Error Catcher]:', err);
    console.info('[Error Info]:', info);

    // 2. Prevent the app from freezing by handling the state
    // Future implementation: Trigger a global Pinia store action here to show a Toast Notification
  };

  // Catch unhandled promise rejections (e.g., API failures without try-catch)
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]:', event.reason);
  });
}