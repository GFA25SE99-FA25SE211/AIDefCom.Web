import { useState, useRef, useCallback, useEffect } from "react";

export type STTEvent = {
  event:
    | "session_started"
    | "recognizing"
    | "recognized"
    | "session_stopped"
    | "speaker_identified"
    | "error";
  text?: string;
  speaker?: string;
  user_id?: string;
  session_id?: string;
  timestamp?: string;
  total_lines?: number;
  message?: string;
  code?: string;
};

interface UseSTTWebSocketProps {
  url: string;
  onEvent?: (event: STTEvent) => void;
}

export const useSTTWebSocket = ({ url, onEvent }: UseSTTWebSocketProps) => {
  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("STT WebSocket Connected");
      setStatus("connected");

      // Start keep-alive ping
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000); // 10 seconds

      ws.onclose = (event) => {
        clearInterval(pingInterval);
        console.log(
          `STT WebSocket Disconnected: Code=${event.code}, Reason=${event.reason}`
        );
        setStatus("disconnected");
      };
    };

    ws.onerror = (error) => {
      console.error("STT WebSocket Error:", error);
      setStatus("error");
    };

    ws.onmessage = (event) => {
      try {
        // console.log("WS Message:", event.data); // Debug log
        const data = JSON.parse(event.data);
        console.log("Parsed WS Data:", data); // Debug log to see exact event structure

        // Map backend event types to frontend expected types
        if (data.type) {
          if (data.type === "partial") {
            data.event = "recognizing";
          } else if (data.type === "result") {
            data.event = "recognized";
          } else if (data.type === "speaker_identified") {
            // Optional: handle speaker identification event specifically if needed
            // For now, we can treat it as an info event or just pass it through
            data.event = "speaker_identified";
          } else {
            data.event = data.type;
          }
        }

        if (onEvent) {
          onEvent(data);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };
  }, [url, onEvent]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send("stop"); // Send stop command before closing
      }
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendAudio = useCallback((data: Blob | ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    sendAudio,
  };
};
