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
  const isConnectingRef = useRef(false); // Prevent multiple connection attempts
  const lastConnectAttemptRef = useRef<number>(0); // Track last connect attempt time
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null); // Heartbeat interval
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null); // Health check interval
  const startHealthCheckRef = useRef<(() => void) | null>(null); // Ref to startHealthCheck function

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
        // Đảm bảo connection đã connected trước khi subscribe
        if (connection.state !== signalR.HubConnectionState.Connected) {
          devWarn("⚠️ Cannot subscribe: connection not ready", connection.state);
          return;
        }

        if (subscribeToAll) {
          await connection.invoke("SubscribeToAllScores");
          devLog("✅ Subscribed to all scores");
        }

        // Subscribe to specific sessions
        for (const sessionId of sessionIds) {
          try {
            await connection.invoke("SubscribeToSession", sessionId);
            devLog(`✅ Subscribed to session ${sessionId}`);
          } catch (err) {
            devWarn(`⚠️ Failed to subscribe to session ${sessionId}:`, err);
          }
        }

        // Subscribe to specific students
        for (const studentId of studentIds) {
          try {
            await connection.invoke("SubscribeToStudent", studentId);
            devLog(`✅ Subscribed to student ${studentId}`);
          } catch (err) {
            devWarn(`⚠️ Failed to subscribe to student ${studentId}:`, err);
          }
        }

        // Subscribe to specific evaluators
        for (const evaluatorId of evaluatorIds) {
          try {
            await connection.invoke("SubscribeToEvaluator", evaluatorId);
            devLog(`✅ Subscribed to evaluator ${evaluatorId}`);
          } catch (err) {
            devWarn(`⚠️ Failed to subscribe to evaluator ${evaluatorId}:`, err);
          }
        }
      } catch (error) {
        console.error("❌ Error subscribing to groups:", error);
      }
    },
    [sessionIds, studentIds, evaluatorIds, subscribeToAll]
  );

  /**
   * Start heartbeat to keep connection alive
   * Sends a ping every 30 seconds to prevent connection timeout
   */
  const startHeartbeat = useCallback((connection: signalR.HubConnection) => {
    // Clear existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        // Send a ping to keep connection alive
        // SignalR automatically handles keepalive, but we can add custom logic here if needed
        devLog("SignalR heartbeat - connection active");
      } else {
        // Stop heartbeat if connection is not active
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      }
    }, 30000); // Every 30 seconds
  }, []);

  /**
   * Stop heartbeat and health check
   */
  const stopHeartbeatAndHealthCheck = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    // Prevent multiple connection attempts
    if (isConnectingRef.current) {
      devLog("SignalR connection already in progress, skipping...");
      return;
    }

    // Check if already connected
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    // Throttle connection attempts - wait at least 2 seconds between attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectAttemptRef.current;
    if (timeSinceLastAttempt < 2000 && lastConnectAttemptRef.current > 0) {
      devLog(`SignalR connection throttled, waiting ${2000 - timeSinceLastAttempt}ms...`);
      return;
    }

    isConnectingRef.current = true;
    lastConnectAttemptRef.current = now;

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
        .configureLogging(signalR.LogLevel.None) // Tắt tất cả logging của SignalR để tránh spam console
        .build();

      // Handle connection events
      connection.onclose((error) => {
        // Stop heartbeat and health check when connection closes
        stopHeartbeatAndHealthCheck();
        
        // Chỉ log trong dev mode và không log error nếu là connection issue thông thường
        if (error) {
          const errorMsg = error.message || String(error);
          // Chỉ log nếu không phải là connection errors thông thường
          if (!errorMsg.includes("WebSocket") && !errorMsg.includes("connection")) {
            devWarn("SignalR connection closed with error:", errorMsg);
          } else {
            devLog("SignalR connection closed (will reconnect)");
          }
        } else {
          devLog("SignalR connection closed");
        }
        setIsConnected(false);
        if (error) {
          const err = new Error(`SignalR connection closed: ${error.message}`);
          setConnectionError(err);
          // Chỉ call onError nếu không phải là connection errors thông thường
          const errorMsg = error.message || String(error);
          if (!errorMsg.includes("WebSocket") && !errorMsg.includes("connection")) {
            onError?.(err);
          }
        }
      });

      connection.onreconnecting((error) => {
        devLog("SignalR reconnecting...");
        setIsConnected(false);
      });

      connection.onreconnected(async (connectionId) => {
        devLog("SignalR reconnected", connectionId);
        setIsConnected(true);
        setConnectionError(null);
        // Re-subscribe to groups after reconnection
        await subscribeToGroups(connection);
        // Restart heartbeat after reconnection
        startHeartbeat(connection);
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
        // Tăng timeout lên 30 giây và không throw error - để automatic reconnect xử lý
        await Promise.race([
          connection.start(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 30000)
          ),
        ]);
        
        devLog("SignalR connected to ScoreHub");
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe to groups
        await subscribeToGroups(connection);

        connectionRef.current = connection;
        isConnectingRef.current = false; // Reset connecting flag
        
        // Start heartbeat to keep connection alive
        startHeartbeat(connection);
        
        // Start health check to ensure connection stays active
        // Use ref to avoid circular dependency
        if (startHealthCheckRef.current) {
          startHealthCheckRef.current();
        }
      } catch (startError: any) {
        // Log connection error but don't throw - let automatic reconnect handle it
        const errorMessage = startError?.message || String(startError);
        
        // Xử lý timeout và connection errors một cách graceful
        // KHÔNG log error vào console - chỉ log warning trong dev mode
        if (
          errorMessage.includes("WebSocket") || 
          errorMessage.includes("connection") ||
          errorMessage.includes("timeout") ||
          errorMessage.includes("Connection timeout") ||
          errorMessage.includes("Failed to start the transport") ||
          errorMessage.includes("Insufficient resources") ||
          errorMessage.includes("Handshake was canceled") ||
          errorMessage.includes("handshake") ||
          errorMessage.includes("canceled")
        ) {
          // Chỉ log warning trong dev mode, không log error
          devWarn("SignalR connection failed, will retry automatically:", errorMessage);
          // Don't throw - let automatic reconnect handle retries
          // The connection will be retried by automatic reconnect với exponential backoff
          setIsConnected(false);
          setConnectionError(new Error("Connection failed - will retry automatically"));
          // Cleanup connection reference
          connectionRef.current = null;
          isConnectingRef.current = false; // Reset connecting flag
          return;
        }
        
        // Chỉ throw các lỗi không phải connection/timeout
        throw startError;
      }
    } catch (error) {
      // Only log unexpected errors, not connection failures that are handled gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Xử lý timeout và connection errors một cách graceful
      // KHÔNG log error vào console - chỉ log warning trong dev mode
      if (
        errorMessage.includes("WebSocket") || 
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("Connection timeout") ||
        errorMessage.includes("Failed to start the transport") ||
        errorMessage.includes("Insufficient resources") ||
        errorMessage.includes("could not be found on the server") ||
        errorMessage.includes("Handshake was canceled") ||
        errorMessage.includes("handshake") ||
        errorMessage.includes("canceled")
      ) {
        // Chỉ log warning trong dev mode, không log error
        devWarn("SignalR connection error (will retry automatically):", errorMessage);
        // Không log error và không call onError - để automatic reconnect xử lý
        setIsConnected(false);
        setConnectionError(new Error("Connection error - will retry automatically"));
        connectionRef.current = null;
        isConnectingRef.current = false; // Reset connecting flag
        return;
      }
      
      // Chỉ log và call onError cho các lỗi không phải connection/timeout
      console.error("Unexpected error connecting to SignalR:", error);
      const err = error instanceof Error ? error : new Error(String(error));
      setConnectionError(err);
      setIsConnected(false);
      connectionRef.current = null;
      isConnectingRef.current = false; // Reset connecting flag
      onError?.(err);
    } finally {
      // Đảm bảo reset connecting flag trong mọi trường hợp
      // (nhưng chỉ nếu không phải đang connected)
      if (connectionRef.current?.state !== signalR.HubConnectionState.Connected) {
        // Không reset ở đây vì có thể đang retry
        // Chỉ reset trong các catch blocks
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
    subscribeToGroups,
    startHeartbeat,
    stopHeartbeatAndHealthCheck,
    // Note: startHealthCheck is not included here to avoid circular dependency
    // It's called via startHealthCheckRef.current instead
  ]);

  /**
   * Start health check to ensure connection and subscriptions are active
   * Checks every 60 seconds and re-subscribes if needed
   * Note: This must be defined after connect to avoid circular dependency
   */
  const startHealthCheck = useCallback(() => {
    // Clear existing health check
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    healthCheckIntervalRef.current = setInterval(async () => {
      const connection = connectionRef.current;
      if (!connection) {
        return;
      }

      // Check if connection is still active
      if (connection.state === signalR.HubConnectionState.Connected) {
        // Verify subscriptions are still active by re-subscribing
        // This ensures we don't miss updates if subscription was lost
        try {
          await subscribeToGroups(connection);
          devLog("SignalR health check - subscriptions verified");
        } catch (error) {
          devWarn("SignalR health check - re-subscription failed:", error);
        }
      } else if (connection.state === signalR.HubConnectionState.Disconnected) {
        // Connection lost, try to reconnect
        devLog("SignalR health check - connection lost, attempting reconnect");
        if (!isConnectingRef.current) {
          connect();
        }
      }
    }, 60000); // Every 60 seconds
  }, [subscribeToGroups, connect]);

  // Store ref for use in connect callback (after startHealthCheck is defined)
  startHealthCheckRef.current = startHealthCheck;

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

  // Retry connection when token becomes available or after timeout
  // This handles cases where the component mounts before authentication is complete
  useEffect(() => {
    if (!isConnected && connectionRef.current?.state !== signalR.HubConnectionState.Connecting) {
      const checkAndRetry = async () => {
        const token = await getToken();
        const currentState = connectionRef.current?.state;
        
        // Retry nếu:
        // 1. Có token và connection đang disconnected
        // 2. Hoặc connection bị timeout/error
        if (
          token && 
          (currentState === signalR.HubConnectionState.Disconnected || 
           currentState === signalR.HubConnectionState.Disconnecting ||
           !connectionRef.current)
        ) {
          devLog("🔄 Retrying SignalR connection...", { token: !!token, state: currentState });
          connect();
        }
      };

      // Check immediately
      checkAndRetry();

      // Also set up a periodic check (every 5 seconds) for longer time
      const intervalId = setInterval(checkAndRetry, 5000);
      
      // Stop checking after 60 seconds to avoid infinite retries
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
      }, 60000);

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
