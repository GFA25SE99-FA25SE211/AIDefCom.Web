// Centralized API URLs Configuration
// All external API URLs should be defined here for easy maintenance

// ===========================================
// BACKEND API (Azure Web App)
// ===========================================
export const BACKEND_API_URL = "https://aidefcomapi.azurewebsites.net";

// ===========================================
// AI SERVICE (Azure Container Apps)
// Used for: Voice enrollment, WebSocket STT
// ===========================================
export const AI_SERVICE_URL =
  "https://ai-service.thankfultree-4b6bfec6.southeastasia.azurecontainerapps.io";

// ===========================================
// WEBSOCKET URL BUILDER
// ===========================================
export const getWebSocketUrl = (sessionId: string | number, role?: string) => {
  const baseUrl = `wss://ai-service.thankfultree-4b6bfec6.southeastasia.azurecontainerapps.io/ws/stt?defense_session_id=${sessionId}`;
  return role ? `${baseUrl}&role=${role}` : baseUrl;
};
