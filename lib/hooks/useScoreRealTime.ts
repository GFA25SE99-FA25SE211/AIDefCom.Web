import { useState, useEffect, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { env } from "@/lib/config";

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
      const hubUrl = `${env.apiUrl}/hubs/score`;

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: async () => token || "",
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
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Handle connection events
      connection.onclose((error) => {
        console.log("SignalR connection closed", error);
        setIsConnected(false);
        if (error) {
          const err = new Error(`SignalR connection closed: ${error.message}`);
          setConnectionError(err);
          onError?.(err);
        }
      });

      connection.onreconnecting((error) => {
        console.log("SignalR reconnecting...", error);
        setIsConnected(false);
      });

      connection.onreconnected((connectionId) => {
        console.log("SignalR reconnected", connectionId);
        setIsConnected(true);
        setConnectionError(null);
        // Re-subscribe to groups after reconnection
        subscribeToGroups(connection);
      });

      // Listen for score updates
      connection.on("ScoreUpdated", (update: ScoreUpdate) => {
        console.log("Score update received:", update);
        onScoreUpdate?.(update);
      });

      connection.on("ScoreCreated", (update: ScoreUpdate) => {
        console.log("Score created:", update);
        onScoreUpdate?.(update);
      });

      connection.on("ScoreDeleted", (update: ScoreUpdate) => {
        console.log("Score deleted:", update);
        onScoreUpdate?.(update);
      });

      // Start connection
      await connection.start();
      console.log("SignalR connected to ScoreHub");
      setIsConnected(true);
      setConnectionError(null);

      // Subscribe to groups
      await subscribeToGroups(connection);

      connectionRef.current = connection;
    } catch (error) {
      console.error("Error connecting to SignalR:", error);
      const err = error instanceof Error ? error : new Error(String(error));
      setConnectionError(err);
      setIsConnected(false);
      onError?.(err);
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
