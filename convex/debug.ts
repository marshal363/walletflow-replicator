export const debug = {
  startGroup: (label: string) => {
    console.group(`[${new Date().toISOString()}] ${label}`);
  },
  endGroup: () => {
    console.groupEnd();
  },
  log: (message: string, data?: Record<string, unknown>) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '');
  },
  error: (message: string, error?: Error | Record<string, unknown>) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error || '');
  }
}; 