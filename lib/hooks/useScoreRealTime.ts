import { useState, useEffect, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { env } from "@/lib/config";
import { devLog } from "@/lib/utils/logger";

export interface ScoreUpdate {
  sessionId?: number;
  studentId?: string;
  evaluatorId?: string;
  scoreId?: number;
  value?: number;
  rubricName?: string;
  comment?: string;
  timestamp?: string;
}

interface UseScoreRealTimeProps {
  onScoreUpdate?: (update: ScoreUpdate) => void;
  onError?: (error: Error) => void;
  sessionIds?: number[];
  studentIds?: string[];
  evaluatorIds?: string[];
  subscribeToAll?: boolean;
}

export const useScoreRealTime = ({
  onScoreUpdate,
  onError,
  sessionIds = [],
  studentIds = [],
  evaluatorIds = [],
  subscribeToAll = false,
}: UseScoreRealTimeProps = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find((c) => c.trim().startsWith("token="));
    if (tokenCookie) {
      return tokenCookie.split("=")[1];
    }
    return localStorage.getItem("token");
  }, []);

  const connect = useCallback(async () => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.warn("No token available for SignalR connection");
        return;
      }

      // Use HTTP/HTTPS URL - SignalR will handle WebSocket negotiation automatically
      // Add token as query parameter (backend expects access_token)
      const hubUrl = `${env.apiUrl}/hubs/score?access_token=${encodeURIComponent(token)}`;

      // Build connection with multiple transport fallbacks
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          // Token is already in URL, but keep accessTokenFactory as fallback
          accessTokenFactory: async () => token || "",
          // Try WebSockets first, then fallback to ServerSentEvents and LongPolling
          transport: signalR.HttpTransportType.WebSockets | 
                     signalR.HttpTransportType.ServerSentEvents |
                     signalR.HttpTransportType.LongPolling,
          skipNegotiation: false, // Let SignalR negotiate the best transport
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0s, 2s, 10s, 30s, then 30s intervals
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 10000;
            return 30000;
          },
        })
        .configureLogging(signalR.LogLevel.Warning) // Reduce logging to warnings only
        .build();

      // Handle connection events
      connection.onclose((error) => {
        devLog("SignalR connection closed", error);
        setIsConnected(false);
        if (error) {
          const err = new Error(`SignalR connection closed: ${error.message}`);
          setConnectionError(err);
          onError?.(err);
        }
      });

      connection.onreconnecting((error) => {
        devLog("SignalR reconnecting...", error);
        setIsConnected(false);
      });

      connection.onreconnected((connectionId) => {
        devLog("SignalR reconnected", connectionId);
        setIsConnected(true);
        setConnectionError(null);
        // Re-subscribe to groups after reconnection
        subscribeToGroups(connection);
      });

      // Listen for score updates
      connection.on("ScoreUpdated", (update: ScoreUpdate) => {
        devLog("Score update received:", update);
        onScoreUpdate?.(update);
      });

      connection.on("ScoreCreated", (update: ScoreUpdate) => {
        devLog("Score created:", update);
        onScoreUpdate?.(update);
      });

      connection.on("ScoreDeleted", (update: ScoreUpdate) => {
        devLog("Score deleted:", update);
        onScoreUpdate?.(update);
      });

      // Start connection with timeout
      try {
        await Promise.race([
          connection.start(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 15000)
          ),
        ]);
        
        devLog("SignalR connected to ScoreHub");
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe to groups
        await subscribeToGroups(connection);

        connectionRef.current = connection;
      } catch (startError: any) {
        // Log connection error but don't throw - let automatic reconnect handle it
        const errorMessage = startError?.message || String(startError);
        if (errorMessage.includes("WebSocket") || errorMessage.includes("connection")) {
          devLog("SignalR connection failed, will retry automatically:", errorMessage);
          // Don't throw - let automatic reconnect handle retries
          // The connection will be retried by automatic reconnect
          return;
        }
        throw startError;
      }
    } catch (error) {
      // Only log unexpected errors, not connection failures that are handled gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("WebSocket") && !errorMessage.includes("connection")) {
        console.error("Error connecting to SignalR:", error);
      }
      const err = error instanceof Error ? error : new Error(String(error));
      setConnectionError(err);
      setIsConnected(false);
      // Don't call onError for connection failures - they're expected in some environments
      if (!errorMessage.includes("WebSocket") && !errorMessage.includes("connection")) {
        onError?.(err);
      }
    }
  }, [
    getToken,
    onScoreUpdate,
    onError,
    sessionIds,
    studentIds,
    evaluatorIds,
    subscribeToAll,
  ]);

  const subscribeToGroups = useCallback(
    async (connection: signalR.HubConnection) => {
      try {
        if (subscribeToAll) {
          await connection.invoke("SubscribeToAllScores");
        }

        // Subscribe to specific sessions
        for (const sessionId of sessionIds) {
          await connection.invoke("SubscribeToSession", sessionId);
        }

        // Subscribe to specific students
        for (const studentId of studentIds) {
          await connection.invoke("SubscribeToStudent", studentId);
        }

        // Subscribe to specific evaluators
        for (const evaluatorId of evaluatorIds) {
          await connection.invoke("SubscribeToEvaluator", evaluatorId);
        }
      } catch (error) {
        console.error("Error subscribing to groups:", error);
      }
    },
    [sessionIds, studentIds, evaluatorIds, subscribeToAll]
  );

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      const connection = connectionRef.current;
      const state = connection.state;

      // If already disconnected, just cleanup
      if (state === signalR.HubConnectionState.Disconnected) {
        connectionRef.current = null;
        setIsConnected(false);
        return;
      }

      // Helper to safely invoke without throwing errors
      const safeInvoke = async (methodName: string, ...args: any[]) => {
        try {
          if (connection.state === signalR.HubConnectionState.Connected) {
            await Promise.race([
              connection.invoke(methodName, ...args),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 500)
              ),
            ]).catch(() => {
              // Silently ignore all errors
            });
          }
        } catch (error: any) {
          // Silently ignore all errors during disconnect
          // Connection might be closing or already closed
        }
      };

      // Helper to safely stop connection
      const safeStop = async () => {
        try {
          const currentState = connection.state;
          if (
            currentState === signalR.HubConnectionState.Connected ||
            currentState === signalR.HubConnectionState.Connecting
          ) {
            // Use stop() with error handling
            await connection.stop().catch((error: any) => {
              // Silently ignore all stop errors
              // Common errors: "Invocation canceled", "connection being closed"
            });
          }
        } catch (error) {
          // Silently ignore
        }
      };

      try {
        // Try to unsubscribe (non-blocking, ignore all errors)
        if (subscribeToAll && state === signalR.HubConnectionState.Connected) {
          safeInvoke("UnsubscribeFromAllScores");
        }

        if (state === signalR.HubConnectionState.Connected) {
          for (const sessionId of sessionIds) {
            safeInvoke("UnsubscribeFromSession", sessionId);
          }

          for (const studentId of studentIds) {
            safeInvoke("UnsubscribeFromStudent", studentId);
          }

          for (const evaluatorId of evaluatorIds) {
            safeInvoke("UnsubscribeFromEvaluator", evaluatorId);
          }
        }

        // Stop connection (non-blocking, ignore all errors)
        await safeStop();
      } catch (error) {
        // Silently ignore all errors during disconnect
      } finally {
        // Always cleanup refs and state
        connectionRef.current = null;
        setIsConnected(false);
      }
    }
  }, [sessionIds, studentIds, evaluatorIds, subscribeToAll]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Re-subscribe when sessionIds, studentIds, or evaluatorIds change
  useEffect(() => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      subscribeToGroups(connectionRef.current);
    }
  }, [sessionIds, studentIds, evaluatorIds, subscribeToAll, subscribeToGroups]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
  };
};
