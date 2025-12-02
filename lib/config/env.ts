// Environment Configuration
// This file centralizes all environment variables

// Get API URL from environment or use default
// Priority: NEXT_PUBLIC_API_URL env var > default production server
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Default to production server
  // For local development, set NEXT_PUBLIC_API_URL=http://localhost:5000
  return "https://aidefcomapi.azurewebsites.net";
};

export const env = {
  // API Configuration
  // Backend runs on:
  // - Production: https://aidefcomapi.azurewebsites.net (default)
  // - Local development: http://localhost:5000 (set NEXT_PUBLIC_API_URL env var)
  // - Local HTTPS: https://localhost:7143 (set NEXT_PUBLIC_API_URL env var)
  // Set NEXT_PUBLIC_API_URL environment variable to override
  apiUrl: getApiUrl(),
  voiceApiUrl:
    process.env.NEXT_PUBLIC_VOICE_API_URL ||
    "https://aidefcomvoiceapi.azurewebsites.net",

  // App Configuration
  appName: process.env.NEXT_PUBLIC_APP_NAME || "AIDefCom",
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",

  // Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",

  // Feature Flags (if needed)
  features: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true",
  },
} as const;

// Type-safe environment access
export type EnvConfig = typeof env;
