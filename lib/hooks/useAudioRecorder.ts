import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioRecorderProps {
  wsUrl: string;
  onWsEvent?: (msg: any) => void;
  autoConnect?: boolean;
}

// Resample audio from source sample rate to target sample rate
function resampleAudio(
  inputSamples: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return inputSamples;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(inputSamples.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputSamples.length - 1);
    const t = srcIndex - srcIndexFloor;

    // Linear interpolation
    output[i] =
      inputSamples[srcIndexFloor] * (1 - t) + inputSamples[srcIndexCeil] * t;
  }

  return output;
}

export const useAudioRecorder = ({
  wsUrl,
  onWsEvent,
  autoConnect = false,
}: UseAudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const onWsEventRef = useRef(onWsEvent);
  useEffect(() => {
    onWsEventRef.current = onWsEvent;
  }, [onWsEvent]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const isConnectingRef = useRef(false);

  const connectWs = useCallback(() => {
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

    if (!wsUrl || wsUrl.trim() === "") {
      console.warn("WS connect skipped: wsUrl is empty or invalid");
      return;
    }

    // Validate WebSocket URL format
    try {
      const url = new URL(wsUrl);
      if (url.protocol !== "ws:" && url.protocol !== "wss:") {
        console.error("WS connect failed: Invalid protocol. Expected ws:// or wss://", wsUrl);
        return;
      }
    } catch (e) {
      console.error("WS connect failed: Invalid URL format", wsUrl, e);
      return;
    }

    isConnectingRef.current = true;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (e) {
      console.error("WS connect failed: Cannot create WebSocket", wsUrl, e);
      setWsConnected(false);
      isConnectingRef.current = false;
      return;
    }

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
      // WebSocket error event doesn't provide much info, log what we can
      try {
        const readyState = ws.readyState;
        const readyStateText = readyState === WebSocket.CONNECTING ? 'CONNECTING' :
                              readyState === WebSocket.OPEN ? 'OPEN' :
                              readyState === WebSocket.CLOSING ? 'CLOSING' :
                              readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN';
        console.error("WS error - URL:", wsUrl);
        console.error("WS error - ReadyState:", readyState, `(${readyStateText})`);
      } catch (err) {
        // If we can't access readyState, just log the URL
        console.error("WS error - URL:", wsUrl);
        console.error("WS error - Exception:", err);
      }
      setWsConnected(false);
      isConnectingRef.current = false;
    };
    ws.onclose = () => {
      console.log("WS closed");
      setWsConnected(false);
      isConnectingRef.current = false;
      wsRef.current = null;
    };
  }, [wsUrl]);

  useEffect(() => {
    if (autoConnect && wsUrl) {
      const timer = setTimeout(() => {
        connectWs();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoConnect, wsUrl, connectWs]);

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
    // Connect WebSocket with 5-second timeout to prevent infinite blocking
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWs();
      await new Promise<void>((resolve) => {
        const startTime = Date.now();
        const TIMEOUT_MS = 5000; // 5 second timeout
        const check = () => {
          // Success - WebSocket connected
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            resolve();
            return;
          }
          // Timeout - proceed anyway (mic will work, WS may connect later)
          if (Date.now() - startTime > TIMEOUT_MS) {
            resolve();
            return;
          }
          // Failed - WebSocket closed or errored
          if (wsRef.current && wsRef.current.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          // Keep checking every 100ms (instead of 50ms)
          setTimeout(check, 100);
        };
        check();
      });
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // DON'T request specific sample rate - let browser use native rate
    // We will resample to 16kHz ourselves
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    if (audioContext.state === "suspended") await audioContext.resume();
    audioContextRef.current = audioContext;

    const actualSampleRate = audioContext.sampleRate;
    const TARGET_SAMPLE_RATE = 16000;

    console.log(
      `🎤 Audio: native=${actualSampleRate}Hz, target=${TARGET_SAMPLE_RATE}Hz, ratio=${(
        actualSampleRate / TARGET_SAMPLE_RATE
      ).toFixed(2)}`
    );

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    // Buffer for resampled audio - target ~20ms chunks at 16kHz = 320 samples = 640 bytes
    let buffer16: Int16Array = new Int16Array(0);
    const TARGET_SAMPLES = 320; // 20ms at 16kHz

    processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);

      // Step 1: Resample from native rate to 16kHz
      const resampled = resampleAudio(
        float32,
        actualSampleRate,
        TARGET_SAMPLE_RATE
      );

      // Step 2: Convert Float32 [-1..1] → PCM16
      const int16 = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        const s = Math.max(-1, Math.min(1, resampled[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Step 3: Append to buffer
      const merged = new Int16Array(buffer16.length + int16.length);
      merged.set(buffer16);
      merged.set(int16, buffer16.length);
      buffer16 = merged;

      // Step 4: Send in TARGET_SAMPLES chunks
      while (buffer16.length >= TARGET_SAMPLES) {
        const chunk = buffer16.slice(0, TARGET_SAMPLES);
        buffer16 = buffer16.slice(TARGET_SAMPLES);
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

  const toggleAsk = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WS not open");
      return;
    }
    if (!isAsking) {
      wsRef.current.send("q:start");
      setIsAsking(true);
    } else {
      wsRef.current.send("q:end");
      setIsAsking(false);
    }
  }, [isAsking]);

  const stopSession = useCallback(() => {
    console.log("Ending session and closing WebSocket...");

    if (isRecording) {
      stopRecording();
    }
    setIsAsking(false);

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
        wsRef.current.close(1000, "Session ended by user");
        console.log("WebSocket closed");
        wsRef.current = null;
      }
    } catch (e) {
      console.warn("Error closing WebSocket:", e);
    }
  }, [isRecording, stopRecording]);

  const broadcastSessionStart = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("session:start");
      console.log("Sent session:start to broadcast");
    }
  }, []);

  const broadcastSessionEnd = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("session:end");
      console.log("Sent session:end to broadcast");
    }
  }, []);

  const broadcastQuestionStarted = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("question:started");
      console.log("Sent question:started to broadcast");
    }
  }, []);

  const broadcastQuestionProcessing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("question:processing");
      console.log("Sent question:processing to broadcast");
    }
  }, []);

  const broadcastMicDisabled = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("mic:disabled");
      console.log("Sent mic:disabled to broadcast");
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
    broadcastMicDisabled,
  };
};