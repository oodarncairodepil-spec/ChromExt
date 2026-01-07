/**
 * Console logger utility that captures console logs and sends them to the debug endpoint
 * This works in background scripts, content scripts, and the side panel
 */

const DEBUG_ENDPOINT = 'http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a';

interface LogData {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: any[];
  location: string;
  timestamp: number;
  context: 'background' | 'content' | 'sidepanel' | 'unknown';
}

function getContext(): 'background' | 'content' | 'sidepanel' | 'unknown' {
  // Check if we're in a service worker (background)
  // Service workers have self but no window
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    return 'background';
  }
  
  if (typeof window !== 'undefined') {
    const url = window.location?.href || '';
    // Side panel has chrome-extension:// URL
    if (url.startsWith('chrome-extension://') && (url.includes('sidepanel') || url.includes('side-panel'))) {
      return 'sidepanel';
    }
    // Content scripts run on web pages (http/https)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return 'content';
    }
    // Default to sidepanel for other chrome-extension:// URLs
    if (url.startsWith('chrome-extension://')) {
      return 'sidepanel';
    }
  }
  
  return 'unknown';
}

function getLocation(): string {
  try {
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split('\n');
      // Skip the first few lines (Error, getLocation, sendLog)
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (line && !line.includes('consoleLogger.ts')) {
          // Extract file and line number
          const match = line.match(/([^/]+\.(ts|tsx|js|jsx)):(\d+):(\d+)/);
          if (match) {
            return `${match[1]}:${match[3]}`;
          }
        }
      }
    }
  } catch (e) {
    // Ignore errors in stack trace parsing
  }
  return 'unknown';
}

function sendLog(logData: LogData): void {
  try {
    // Send to debug endpoint
    // Use keepalive for service workers to ensure request completes
    const fetchPromise = fetch(DEBUG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
      keepalive: true // Important for service workers
    });
    
    // Log fetch errors to help debug
    fetchPromise.catch((err) => {
      // Only log fetch errors in development/debugging
      // Use original console methods to avoid infinite loop
      if (typeof console !== 'undefined' && (console as any).__originalError) {
        (console as any).__originalError('❌ Console logger fetch failed:', err, 'Context:', logData.context);
      }
    });
  } catch (e) {
    // Log to console if fetch is not available
    if (typeof console !== 'undefined' && (console as any).__originalError) {
      (console as any).__originalError('❌ Console logger sendLog exception:', e, 'Context:', logData.context);
    }
  }
}

function createLogInterceptor(originalMethod: typeof console.log, level: LogData['level']) {
  return function(...args: any[]) {
    // Call original console method first
    originalMethod.apply(console, args);
    
    // Capture and send log
    try {
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      const logData: LogData = {
        level,
        message,
        args: args.map(arg => {
          // Serialize args, but limit size to avoid huge payloads
          try {
            const str = JSON.stringify(arg);
            return str.length > 1000 ? str.substring(0, 1000) + '...' : JSON.parse(str);
          } catch {
            return String(arg).substring(0, 1000);
          }
        }),
        location: getLocation(),
        timestamp: Date.now(),
        context: getContext()
      };
      
      sendLog(logData);
    } catch (e) {
      // Silently fail if logging fails
    }
  };
}

/**
 * Initialize console logging to capture all console output
 * Call this early in your script/entry point
 */
export function initConsoleLogger(): void {
  // Only initialize once
  if ((console as any).__loggerInitialized) {
    return;
  }
  
  // Store original methods (also store for error logging)
  const originalLog = console.log.bind(console);
  const originalInfo = console.info.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalDebug = console.debug.bind(console);
  
  // Store originals for use in error handlers (to avoid infinite loops)
  (console as any).__originalLog = originalLog;
  (console as any).__originalError = originalError;
  
  // Replace with interceptors
  console.log = createLogInterceptor(originalLog, 'log');
  console.info = createLogInterceptor(originalInfo, 'info');
  console.warn = createLogInterceptor(originalWarn, 'warn');
  console.error = createLogInterceptor(originalError, 'error');
  console.debug = createLogInterceptor(originalDebug, 'debug');
  
  // Mark as initialized
  (console as any).__loggerInitialized = true;
  
  // Log initialization - this will now be captured by the interceptor
  console.log('🔍 Console logger initialized for', getContext());
  
  // Also send a test log to verify the endpoint is reachable
  const testLog: LogData = {
    level: 'log',
    message: 'Console logger test - endpoint reachable',
    args: [],
    location: 'consoleLogger.ts:init',
    timestamp: Date.now(),
    context: getContext()
  };
  sendLog(testLog);
}

