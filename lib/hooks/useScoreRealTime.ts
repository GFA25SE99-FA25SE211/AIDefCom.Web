import { useState, useEffect, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { env } from "@/lib/config";
import { devLog, devWarn } from "@/lib/utils/logger";
import type { ScoreReadDto } from "@/lib/models";

/**
 * ScoreUpdate interface - matches ScoreReadDto from backend
 * This is the payload sent via SignalR when score events occur
 */
export interface ScoreUpdate extends Partial<ScoreReadDto> {
  // Additional fields that might be sent
  scoreId?: number; // Alias for id
  timestamp?: string; // Alias for createdAt
}

/**
 * Props for useScoreRealTime hook
 */
interface UseScoreRealTimeProps {
  /** Callback when a score is created, updated, or deleted */
  onScoreUpdate?: (update: ScoreUpdate) => void;
  /** Callback when connection error occurs */
  onError?: (error: Error) => void;
  /** Array of session IDs to subscribe to */
  sessionIds?: number[];
  /** Array of student IDs to subscribe to */
  studentIds?: string[];
  /** Array of evaluator IDs to subscribe to */
  evaluatorIds?: string[];
  /** Subscribe to all score updates (admin/monitoring mode) */
  subscribeToAll?: boolean;
}

/**
 * React hook for real-time score updates via SignalR
 * 
 * @example
 * ```tsx
 * const { isConnected } = useScoreRealTime({
 *   sessionIds: [1, 2, 3],
 *   onScoreUpdate: (update) => {
 *     console.log('Score updated:', update);
 *     // Refresh your data here
 *   }
 * });
 * ```
 * 
 * Backend events:
 * - ScoreCreated: When a new score is created
 * - ScoreUpdated: When an existing score is updated
 * - ScoreDeleted: When a score is deleted
 * 
 * All events are sent to subscribers based on:
 * - Session ID (session_{sessionId})
 * - Student ID (student_{studentId})
 * - Evaluator ID (evaluator_{evaluatorId})
 * - All scores (all_scores) - if subscribeToAll is true
 */
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

  /**
   * Get authentication token from multiple sources
   * Priority: accessToken (localStorage) > token (localStorage) > token (cookie)
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    
    // Try accessToken first (matches authUtils.getCurrentUserInfo)
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken && accessToken !== "dummy-token-chair") {
      return accessToken;
    }
    
    // Try token in localStorage
    const token = localStorage.getItem("token");
    if (token) {
      return token;
    }
    
    // Try token in cookies
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find((c) => c.trim().startsWith("token="));
    if (tokenCookie) {
      return tokenCookie.split("=")[1].trim();
    }
    
    return null;
  }, []);

  const connect = useCallback(async () => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        // Only warn in development, and only once per mount
        // React Strict Mode causes double-invocation, so we use a ref to track
        devWarn("⚠️ No token available for SignalR connection. Will retry when token is available.");
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

      // Listen for score updates from backend
      // Backend sends ScoreReadDto via SignalR groups:
      // - all_scores: All subscribers
      // - session_{sessionId}: Session-specific subscribers
      // - student_{studentId}: Student-specific subscribers
      // - evaluator_{evaluatorId}: Evaluator-specific subscribers
      
      connection.on("ScoreUpdated", (update: ScoreReadDto) => {
        devLog("📝 ScoreUpdated event received:", update);
        onScoreUpdate?.(update as ScoreUpdate);
      });

      connection.on("ScoreCreated", (update: ScoreReadDto) => {
        devLog("🆕 ScoreCreated event received:", update);
        onScoreUpdate?.(update as ScoreUpdate);
      });

      connection.on("ScoreDeleted", (update: ScoreReadDto) => {
        devLog("🗑️ ScoreDeleted event received:", update);
        onScoreUpdate?.(update as ScoreUpdate);
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

  /**
   * Subscribe to SignalR groups based on sessionIds, studentIds, evaluatorIds
   * Backend ScoreHub methods:
   * - SubscribeToAllScores: Subscribe to all score updates
   * - SubscribeToSession(sessionId): Subscribe to a specific defense session
   * - SubscribeToStudent(studentId): Subscribe to a specific student's scores
   * - SubscribeToEvaluator(evaluatorId): Subscribe to a specific evaluator's scores
   */
  const subscribeToGroups = useCallback(
    async (connection: signalR.HubConnection) => {
      try {
        if (subscribeToAll) {
          await connection.invoke("SubscribeToAllScores");
          devLog("✅ Subscribed to all scores");
        }

        // Subscribe to specific sessions
        for (const sessionId of sessionIds) {
          await connection.invoke("SubscribeToSession", sessionId);
          devLog(`✅ Subscribed to session ${sessionId}`);
        }

        // Subscribe to specific students
        for (const studentId of studentIds) {
          await connection.invoke("SubscribeToStudent", studentId);
          devLog(`✅ Subscribed to student ${studentId}`);
        }

        // Subscribe to specific evaluators
        for (const evaluatorId of evaluatorIds) {
          await connection.invoke("SubscribeToEvaluator", evaluatorId);
          devLog(`✅ Subscribed to evaluator ${evaluatorId}`);
        }
      } catch (error) {
        console.error("❌ Error subscribing to groups:", error);
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

  // Initial connection attempt
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Retry connection when token becomes available
  // This handles cases where the component mounts before authentication is complete
  useEffect(() => {
    if (!isConnected && connectionRef.current?.state !== signalR.HubConnectionState.Connecting) {
      const checkAndRetry = async () => {
        const token = await getToken();
        if (token && connectionRef.current?.state === signalR.HubConnectionState.Disconnected) {
          devLog("🔄 Token now available, retrying SignalR connection...");
          connect();
        }
      };

      // Check immediately
      checkAndRetry();

      // Also set up a periodic check (every 2 seconds) for a short time
      const intervalId = setInterval(checkAndRetry, 2000);
      
      // Stop checking after 10 seconds to avoid infinite retries
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
      }, 10000);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, [isConnected, getToken, connect]);

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
