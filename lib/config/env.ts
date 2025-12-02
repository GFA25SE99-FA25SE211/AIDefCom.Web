const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "https://aidefcomapi.azurewebsites.net";
};

export const env = {
  apiUrl: getApiUrl(),
  voiceApiUrl: process.env.VOICE_API_URL,
} as const;

export type EnvConfig = typeof env;
