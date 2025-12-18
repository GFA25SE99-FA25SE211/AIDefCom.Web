/**
 * Logger utility that only logs in development environment
 * Use this instead of console.log for debug messages
 */

const isDev = process.env.NODE_ENV !== "production";

export const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

// Note: console.error should always log (even in production) for debugging issues
// So we don't wrap it here - use console.error directly for errors
