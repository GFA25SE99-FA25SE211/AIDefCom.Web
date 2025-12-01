"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export interface ScoreNotification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  timestamp: Date;
}

interface ScoreNotificationsProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  maxNotifications?: number;
  autoHideDuration?: number;
}

export function ScoreNotifications({
  position = "top-right",
  maxNotifications = 5,
  autoHideDuration = 5000,
}: ScoreNotificationsProps) {
  const [notifications, setNotifications] = useState<ScoreNotification[]>([]);

  useEffect(() => {
    // Listen for custom score update events
    const handleScoreUpdate = (event: CustomEvent<{ message: string; type?: string }>) => {
      const notification: ScoreNotification = {
        id: `${Date.now()}-${Math.random()}`,
        type: (event.detail.type as "success" | "error" | "info") || "info",
        message: event.detail.message,
        timestamp: new Date(),
      };

      setNotifications((prev) => {
        const updated = [notification, ...prev].slice(0, maxNotifications);
        return updated;
      });

      // Auto-hide after duration
      if (autoHideDuration > 0) {
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notification.id)
          );
        }, autoHideDuration);
      }
    };

    window.addEventListener("scoreUpdate" as any, handleScoreUpdate as EventListener);

    return () => {
      window.removeEventListener("scoreUpdate" as any, handleScoreUpdate as EventListener);
    };
  }, [maxNotifications, autoHideDuration]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      default:
        return "top-4 right-4";
    }
  };

  const getIcon = (type: ScoreNotification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: ScoreNotification["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "info":
        return "bg-blue-50 border-blue-200";
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed ${getPositionClasses()} z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none`}
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getBgColor(
            notification.type
          )} border rounded-lg shadow-lg p-4 pointer-events-auto animate-in slide-in-from-right duration-300`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

