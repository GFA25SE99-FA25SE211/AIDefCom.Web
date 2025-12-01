import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioRecorderProps {
  wsUrl: string; // ví dụ: ws://localhost:8000/ws/stt?speaker=Khach&defense_session_id=DEF123
  onWsEvent?: (msg: any) => void; // nhận event JSON từ server (partial/final/question_mode_result...)
  autoConnect?: boolean; // Tự động kết nối WS khi load trang (cho member để nhận session_started)
}

export const useAudioRecorder = ({
  wsUrl,
  onWsEvent,
  autoConnect = false,
}: UseAudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAsking, setIsAsking] = useState(false); // chế độ câu hỏi
  const [wsConnected, setWsConnected] = useState(false); // WebSocket connection status
  const wsRef = useRef<WebSocket | null>(null);
  
  // Dùng ref để tránh dependency loop - callback không thay đổi reference
  const onWsEventRef = useRef(onWsEvent);
  useEffect(() => {
    onWsEventRef.current = onWsEvent;
  }, [onWsEvent]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Flag để tránh reconnect liên tục
  const isConnectingRef = useRef(false);

  // Kết nối WebSocket
  const connectWs = useCallback(() => {
    // Tránh reconnect nếu đang connecting hoặc đã connected
    if (isConnectingRef.current) {
      return;
    }
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    
    if (!wsUrl) {
      return;
    }
    
    isConnectingRef.current = true;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS connected:", wsUrl);
      setWsConnected(true);
      isConnectingRef.current = false;
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        onWsEventRef.current?.(msg);
      } catch {
        console.log("WS raw:", evt.data);
      }
    };
    ws.onerror = (e) => {
      console.error("WS error:", e);
      setWsConnected(false);
      isConnectingRef.current = false;
    };
    ws.onclose = () => {
      console.log("WS closed");
      setWsConnected(false);
      isConnectingRef.current = false;
      wsRef.current = null;
    };
  }, [wsUrl]); // Chỉ phụ thuộc wsUrl, không phụ thuộc onWsEvent

  // Tự động kết nối WS khi autoConnect=true (cho member để nhận session_started)
  useEffect(() => {
    if (autoConnect && wsUrl) {
      // Delay nhỏ để tránh race condition
      const timer = setTimeout(() => {
        connectWs();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoConnect, wsUrl, connectWs]);
  
  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWs();
      // Đợi WS mở
      await new Promise((resolve) => {
        const check = () => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)
            resolve(null);
          else setTimeout(check, 50);
        };
        check();
      });
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)({
      sampleRate: 16000, // yêu cầu 16kHz nếu có thể (sẽ downsample nếu khác)
    });
    // Safari/Chrome có thể suspended ban đầu
    if (audioContext.state === "suspended") await audioContext.resume();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    // Buffer size 4096 (≈256ms @16k), ta vẫn chunk lại thành ~20ms (1600 samples)
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    let buffer16: Int16Array = new Int16Array(0);
    const TARGET_SAMPLES = 1600; // ~20ms @16k → 1600 samples → 3200 bytes

    processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);
      // Convert Float32 [-1..1] → PCM16
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Append vào buffer nội bộ
      const merged = new Int16Array(buffer16.length + int16.length);
      merged.set(buffer16);
      merged.set(int16, buffer16.length);
      buffer16 = merged;

      // Gửi theo chunk TARGET_SAMPLES
      while (buffer16.length >= TARGET_SAMPLES) {
        const chunk = buffer16.slice(0, TARGET_SAMPLES);
        buffer16 = buffer16.slice(TARGET_SAMPLES);
        // Gửi binary raw PCM16
        try {
          wsRef.current?.send(chunk.buffer);
        } catch (err) {
          console.error("WS send error:", err);
          break;
        }
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    setIsRecording(true);
  }, [connectWs]);

  const stopRecording = useCallback(() => {
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      if (processorRef.current) processorRef.current.onaudioprocess = null;
      audioContextRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (e) {
      console.warn("Stop recording error:", e);
    }
    setIsRecording(false);
    console.log("Microphone stopped (WebSocket still open)");
  }, []);

  // Toggle chế độ câu hỏi: q:start / q:end
  const toggleAsk = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WS not open");
      return;
    }
    if (!isAsking) {
      wsRef.current.send("q:start");
      setIsAsking(true);
    } else {
      wsRef.current.send("q:end"); // server sẽ tự check-and-register theo defense_session_id/session_id
      setIsAsking(false);
    }
  }, [isAsking]);

  // Kết thúc phiên hội đồng: gửi "stop" để server flush/close
  const stopSession = useCallback(() => {
    console.log("Ending session and closing WebSocket...");
    
    // Stop recording if still recording
    if (isRecording) {
      stopRecording();
    }
    setIsAsking(false);

    // Close WebSocket
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send("stop");
        console.log("Sent stop command to WebSocket");
      }
    } catch (e) {
      console.warn("Error sending stop command:", e);
    }

    try {
      if (wsRef.current) {
        wsRef.current.close(1000, "Session ended by user"); // 1000 = normal closure
        console.log("WebSocket closed");
        wsRef.current = null;
      }
    } catch (e) {
      console.warn("Error closing WebSocket:", e);
    }
  }, [isRecording, stopRecording]);

  // Broadcast session start (thư ký gọi khi bắt đầu ghi âm)
  const broadcastSessionStart = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("session:start");
      console.log("Sent session:start to broadcast");
    }
  }, []);

  // Broadcast session end (thư ký gọi khi kết thúc phiên)
  const broadcastSessionEnd = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("session:end");
      console.log("Sent session:end to broadcast");
    }
  }, []);

  // Broadcast question started (member bắt đầu đặt câu hỏi)
  const broadcastQuestionStarted = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("question:started");
      console.log("Sent question:started to broadcast");
    }
  }, []);

  // Broadcast question processing (member kết thúc đặt câu hỏi, đang xử lý)
  const broadcastQuestionProcessing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("question:processing");
      console.log("Sent question:processing to broadcast");
    }
  }, []);

  return {
    isRecording,
    isAsking,
    wsConnected,
    startRecording,
    stopRecording,
    toggleAsk,
    stopSession,
    broadcastSessionStart,
    broadcastSessionEnd,
    broadcastQuestionStarted,
    broadcastQuestionProcessing,
  };
};
