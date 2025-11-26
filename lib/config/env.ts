// Environment Configuration
// This file centralizes all environment variables

export const env = {
  // API Configuration
  // Backend runs on:
  // - HTTPS: https://localhost:7143 (profile "https")
  // Default to HTTP for development
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://aidefcomapi.azurewebsites.net',
  
  // App Configuration
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'AIDefCom',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Feature Flags (if needed)
  features: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
  },
} as const;

// Type-safe environment access
export type EnvConfig = typeof env;

