"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { voiceApi, VoiceEnrollmentStatus } from "@/lib/api/voice";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { AI_SERVICE_URL } from "@/lib/config/api-urls";

const SAMPLE_TEXTS = [
  "Xin chào, tôi là {NAME}. Đây là đoạn thu mẫu để hỗ trợ hệ thống AIDefCom, một nền tảng AI được thiết kế giúp số hóa và tối ưu hóa toàn bộ quy trình chấm điểm và ghi biên bản bảo vệ khóa luận. Hệ thống sử dụng giọng nói của tôi để cải thiện khả năng tương tác và hỗ trợ hội đồng trong các phiên bảo vệ sau này.",
  "Tôi đang thu âm đoạn mẫu để AIDefCom xây dựng hồ sơ nhận diện giọng nói của tôi. Trong khoảng thời gian này, tôi sẽ nói với tốc độ ổn định và phát âm rõ ràng để hệ thống thu thập dữ liệu chất lượng cao. Các bản thu giúp AI nhận dạng chính xác hơn khi tôi đặt câu hỏi, ghi chú hoặc thực hiện các thao tác khác trong buổi bảo vệ.",
  "Đây là bản thu mẫu cho AIDefCom theo đúng yêu cầu về bảo mật và quyền riêng tư. Tôi xác nhận rằng giọng nói của tôi được sử dụng phục vụ cho mục đích học thuật và sẽ được lưu trữ, mã hóa và xử lý theo các chính sách bảo vệ dữ liệu tương tự chuẩn GDPR. Tôi đồng ý cung cấp dữ liệu để hệ thống nhận diện thuận tiện và an toàn hơn.",
];

const RECORDING_DURATION = 15; // seconds

export default function VoiceEnrollPage() {
  const router = useRouter();
  const [status, setStatus] = useState<VoiceEnrollmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(RECORDING_DURATION);
  const [showNextButton, setShowNextButton] = useState(false);
  const [resetting, setResetting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sample tracking (like mobile app)
  type SampleStatus =
    | "pending"
    | "recording"
    | "processing"
    | "completed"
    | "failed";
  interface SampleInfo {
    status: SampleStatus;
    index: number;
  }

  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
  const [samples, setSamples] = useState<SampleInfo[]>([
    { status: "pending", index: 0 },
    { status: "pending", index: 1 },
    { status: "pending", index: 2 },
  ]);

  useEffect(() => {
    // Get userId from accessToken and fetch user info from API
    const initUser = async () => {
      // Import authUtils to get userId from token
      const { authUtils } = await import("@/lib/utils/auth");
      const userId = authUtils.getCurrentUserId();

      if (!userId) {
        router.push("/login");
        return;
      }

      // Fetch user info from API
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch("/api/auth/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          // Fetch voice status
          fetchStatus(data.user.id);
        } else {
          // Fallback: use minimal user data
          setUser({ id: userId });
          fetchStatus(userId);
        }
      } catch (err) {
        console.error("Failed to fetch user info:", err);
        // Fallback: use minimal user data
        setUser({ id: userId });
        fetchStatus(userId);
      }
    };

    initUser();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  const fetchStatus = async (userId: string) => {
    try {
      const data = await voiceApi.getStatus(userId);
      setStatus(data);

      // Restore progress based on enrollment_count
      const enrolledCount = data.enrollment_count || 0;

      if (data.enrollment_status === "enrolled") {
        swalConfig.success(
          "Completed!",
          "You have successfully registered your voice."
        );
        router.push("/home");
      } else if (enrolledCount > 0) {
        // User has partial enrollment, restore their progress
        setCurrentSampleIndex(enrolledCount);

        // Mark completed samples
        setSamples((prev) => {
          const updated = [...prev];
          for (let i = 0; i < enrolledCount && i < 3; i++) {
            updated[i] = { ...updated[i], status: "completed" };
          }
          return updated;
        });

        // Notify user about resuming
        swalConfig.info(
          "Continue Recording",
          `You have recorded ${enrolledCount}/3 samples. Please continue with sample ${
            enrolledCount + 1
          }.`
        );
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
      swalConfig.error("Error", "Unable to load voice registration status.");
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      // Request microphone with specific constraints for better quality
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Match backend expected sample rate
        },
      });

      // Use audio/webm;codecs=opus for better compatibility
      const options = { mimeType: "audio/webm;codecs=opus" };
      let mediaRecorder: MediaRecorder;

      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback to default if codec not supported
        console.warn("Opus codec not supported, using default");
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Convert to WAV before uploading
        try {
          const { convertToWav } = await import("@/lib/utils/audioConverter");
          const wavBlob = await convertToWav(audioBlob);

          // Verify WAV blob has content
          if (wavBlob.size < 100) {
            throw new Error("WAV file too small - no audio data");
          }

          console.log(
            `Audio recorded: ${audioBlob.size} bytes (${mediaRecorder.mimeType}) -> WAV: ${wavBlob.size} bytes`
          );

          await handleUpload(wavBlob);
        } catch (err) {
          console.error("Audio processing failed:", err);
          swalConfig.error(
            "Error",
            "Unable to process audio file. Please try again."
          );
          setRecording(false);
        }
      };

      // Start recording with timeslice for better data capture
      mediaRecorder.start(100); // Capture data every 100ms
      setRecording(true);
      setTimeLeft(RECORDING_DURATION);
      setShowNextButton(false);

      // Mark current sample as recording
      setSamples((prev) => {
        const updated = [...prev];
        updated[currentSampleIndex] = {
          ...updated[currentSampleIndex],
          status: "recording",
        };
        return updated;
      });

      // Start Countdown
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Stop automatically when time reaches 0 (or 1 -> 0)
            if (mediaRecorder.state === "recording") {
              mediaRecorder.stop();
            }
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      swalConfig.error(
        "Microphone Error",
        "Unable to access microphone. Please check permissions."
      );
    }
  };

  // No manual stop allowed
  // const stopRecording = () => { ... }

  const handleUpload = async (audioBlob: Blob) => {
    if (!user) return;
    setRecording(false);
    setProcessing(true);

    // Mark current sample as processing
    setSamples((prev) => {
      const updated = [...prev];
      updated[currentSampleIndex] = {
        ...updated[currentSampleIndex],
        status: "processing",
      };
      return updated;
    });

    try {
      const result = await voiceApi.enroll(user.id, audioBlob);

      if (result.error) {
        swalConfig.error("Error", result.error);
        // Mark as failed
        setSamples((prev) => {
          const updated = [...prev];
          updated[currentSampleIndex] = {
            ...updated[currentSampleIndex],
            status: "failed",
          };
          return updated;
        });
        setTimeLeft(RECORDING_DURATION);
      } else {
        // Mark current sample as completed
        setSamples((prev) => {
          const updated = [...prev];
          updated[currentSampleIndex] = {
            ...updated[currentSampleIndex],
            status: "completed",
          };
          return updated;
        });

        if (result.completed) {
          swalConfig.success("Success", "Voice registration completed!");

          // Redirect based on role
          const role =
            user?.roles?.[0]?.toLowerCase() ||
            user?.role?.toLowerCase() ||
            "member";
          switch (role) {
            case "admin":
            case "administrator":
              router.push("/administrator");
              break;
            case "lecturer":
              router.push("/home");
              break;
            case "chair":
              router.push("/chair");
              break;
            case "secretary":
              router.push("/secretary");
              break;
            case "moderator":
              router.push("/moderator");
              break;
            default:
              router.push("/member");
          }
        } else {
          swalConfig.success(
            "Saved",
            `Sample ${
              currentSampleIndex + 1
            } has been saved. Please continue with the next sample.`
          );

          // Move to next sample (simple increment)
          const nextIndex = currentSampleIndex + 1;
          if (nextIndex < 3) {
            setCurrentSampleIndex(nextIndex);
          }

          // Refresh status
          await fetchStatus(user.id);
          setShowNextButton(true);
          setTimeLeft(RECORDING_DURATION);
        }
      }
    } catch (error: any) {
      console.error("Upload failed:", error);

      // Mark as failed
      setSamples((prev) => {
        const updated = [...prev];
        updated[currentSampleIndex] = {
          ...updated[currentSampleIndex],
          status: "failed",
        };
        return updated;
      });

      // Check for "Maximum enrollment limit reached" error
      const errorMessage = error.message || "";
      if (
        errorMessage.includes("Maximum enrollment limit") ||
        errorMessage.includes("Đã đủ 3 samples") ||
        errorMessage.includes("Đã đủ 3 mẫu")
      ) {
        swalConfig.success(
          "Completed",
          "System records that you already have enough voice samples."
        );

        // Redirect based on role
        const role =
          user?.roles?.[0]?.toLowerCase() ||
          user?.role?.toLowerCase() ||
          "member";
        switch (role) {
          case "admin":
          case "administrator":
            router.push("/administrator");
            break;
          case "lecturer":
            router.push("/home");
            break;
          case "chair":
            router.push("/chair");
            break;
          case "secretary":
            router.push("/secretary");
            break;
          case "moderator":
            router.push("/moderator");
            break;
          default:
            router.push("/member");
        }
        return;
      }

      swalConfig.error(
        "Error",
        errorMessage || "Failed to submit voice sample."
      );
      setTimeLeft(RECORDING_DURATION);
    } finally {
      setProcessing(false);
    }
  };

  // Reset enrollment - xóa tất cả dữ liệu voice enrollment trên Azure
  const handleResetEnrollment = async () => {
    if (!user) return;

    // Confirm với user
    const result = await swalConfig.confirm(
      "Confirm Reset",
      "Are you sure you want to delete all recording data and start over?"
    );

    if (!result.isConfirmed) return;

    try {
      setResetting(true);

      // Gọi API DELETE để reset enrollment
      const response = await fetch(
        `${AI_SERVICE_URL}/voice/users/${user.id}/enrollment`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Reset failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Reset enrollment response:", data);

      // Reset local state
      setCurrentSampleIndex(0);
      setSamples([
        { status: "pending", index: 0 },
        { status: "pending", index: 1 },
        { status: "pending", index: 2 },
      ]);
      setShowNextButton(false);
      setTimeLeft(RECORDING_DURATION);
      setStatus(null);

      swalConfig.success(
        "Reset Complete",
        "Data has been deleted. You can start recording again."
      );

      // Refresh status
      await fetchStatus(user.id);
    } catch (error: any) {
      console.error("Reset enrollment failed:", error);
      swalConfig.error(
        "Error",
        error.message || "Unable to reset data. Please try again."
      );
    } finally {
      setResetting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const completedCount = samples.filter((s) => s.status === "completed").length;
  const maxCount = 3;
  const progress = (completedCount / maxCount) * 100;

  // Determine text to display based on currentSampleIndex
  const textIndex = Math.min(currentSampleIndex, 2);
  const rawText = SAMPLE_TEXTS[textIndex];
  const displayText = rawText.replace(
    "{NAME}",
    user?.fullName || (user as any)?.FullName || user?.name || "bạn"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col relative">
      {/* Header Bar */}
      <div className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-6 h-6"
              >
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Voice Registration
              </h1>
              <p className="text-sm text-gray-500">Voice security setup</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Reset Button */}
            <button
              onClick={handleResetEnrollment}
              disabled={resetting || recording || processing}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow ${
                resetting || recording || processing
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
              }`}
            >
              {resetting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Reset Data"
              )}
            </button>
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all shadow-sm hover:shadow"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-6xl w-full">
          {/* Progress Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  Registration Progress
                </h2>
                <p className="text-gray-600">
                  {completedCount}/{maxCount} voice samples completed
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-purple-600">
                  {Math.round(progress)}%
                </div>
                <p className="text-sm text-gray-500 mt-1">Completed</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            {/* Sample Indicators */}
            <div className="grid grid-cols-3 gap-4">
              {samples.map((sample, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    sample.status === "completed"
                      ? "bg-green-50 border-green-500"
                      : sample.status === "recording"
                      ? "bg-purple-50 border-purple-500 animate-pulse"
                      : sample.status === "processing"
                      ? "bg-yellow-50 border-yellow-500"
                      : sample.status === "failed"
                      ? "bg-red-50 border-red-500"
                      : "bg-gray-50 border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        sample.status === "completed"
                          ? "bg-green-500"
                          : sample.status === "recording"
                          ? "bg-purple-500"
                          : sample.status === "processing"
                          ? "bg-yellow-500"
                          : sample.status === "failed"
                          ? "bg-red-500"
                          : "bg-gray-300"
                      }`}
                    >
                      {sample.status === "completed" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6"
                        >
                          <path
                            fillRule="evenodd"
                            d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        Sample {idx + 1}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">
                        {sample.status === "completed"
                          ? "Completed"
                          : sample.status === "recording"
                          ? "Recording"
                          : sample.status === "processing"
                          ? "Processing"
                          : sample.status === "failed"
                          ? "Failed"
                          : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recording Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Instructions */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🔊</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Recording Instructions
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Please read the text below clearly and loudly
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                <div className="flex items-start gap-2 mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm font-semibold text-blue-800">
                    Sample text {currentSampleIndex + 1}:
                  </p>
                </div>
                <p className="text-gray-700 leading-relaxed italic text-base">
                  &quot;{displayText}&quot;
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Read naturally at a moderate pace
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Ensure a quiet environment while recording
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Recording time: 15 seconds (auto-stop)
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Recording Controls */}
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* Timer Display */}
                {recording ? (
                  <div className="flex flex-col items-center gap-6 mb-8">
                    <div className="relative">
                      <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-2xl animate-pulse">
                        <div className="text-6xl font-bold text-white tabular-nums">
                          {timeLeft}
                        </div>
                      </div>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-4 py-1 rounded-full shadow-lg">
                        <span className="text-sm font-medium text-gray-600">
                          sec
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 h-8">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-2 bg-red-500 rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 100}%`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-red-600 font-semibold text-lg">
                        Recording...
                      </span>
                    </div>

                    <p className="text-gray-500 text-center max-w-xs">
                      System will auto-save when time is up. Please read the
                      text on the left.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 mb-8">
                    <div className="w-40 h-40 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-20 h-20 text-gray-400"
                      >
                        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                        <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                      </svg>
                    </div>

                    <div className="text-center">
                      <p className="text-xl font-semibold text-gray-700 mb-2">
                        {showNextButton
                          ? "Sample saved successfully!"
                          : "Ready to record"}
                      </p>
                      <p className="text-gray-500">
                        {showNextButton
                          ? "Press the button below to continue with the next sample"
                          : "Recording time: 15 seconds"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex flex-col items-center gap-4">
                  {processing ? (
                    <button
                      disabled
                      className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center cursor-not-allowed shadow-lg"
                    >
                      <div className="w-10 h-10 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    </button>
                  ) : recording ? (
                    <button
                      disabled
                      className="w-24 h-24 rounded-full bg-gray-300 text-white flex items-center justify-center shadow-lg cursor-not-allowed"
                    >
                      <span className="font-bold text-2xl">{timeLeft}</span>
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 group"
                    >
                      {showNextButton ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-12 h-12 group-hover:translate-x-1 transition-transform"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-12 h-12"
                        >
                          <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                          <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                        </svg>
                      )}
                    </button>
                  )}

                  <p className="text-center text-sm font-medium text-gray-600">
                    {recording
                      ? "Recording - Please read the text"
                      : showNextButton
                      ? "Tap to continue"
                      : "Tap to start recording"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
