const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "https://aidefcomapi.azurewebsites.net";
};

export const env = {
  apiUrl: getApiUrl(),
} as const;

// Voice API URL - fixed constant (no need to fetch)
export const VOICE_API_URL =
  "https://ai-service.thankfultree-4b6bfec6.southeastasia.azurecontainerapps.io";

export type EnvConfig = typeof env;
