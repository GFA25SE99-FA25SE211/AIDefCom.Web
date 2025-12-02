const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "https://aidefcomapi.azurewebsites.net";
};

export const env = {
  apiUrl: getApiUrl(),
} as const;

// Fetch voice API URL từ server-side API route
export const getVoiceApiUrl = async (): Promise<string> => {
  try {
    const response = await fetch("/api/config/voice");
    if (!response.ok) {
      throw new Error("Failed to fetch voice API URL");
    }
    const data = await response.json();
    return data.voiceApiUrl;
  } catch (error) {
    console.error("Error fetching voice API URL:", error);
    throw error;
  }
};

export type EnvConfig = typeof env;
