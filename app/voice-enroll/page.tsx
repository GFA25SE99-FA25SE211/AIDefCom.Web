"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { voiceApi, VoiceEnrollmentStatus } from "@/lib/api/voice";
import { swalConfig } from "@/lib/utils/sweetAlert";

const SAMPLE_TEXTS = [
  "Xin chào, tôi là {NAME}. Hiện tại tôi đang thực hiện đoạn thu âm mẫu đầu tiên để cung cấp dữ liệu cho hệ thống AIDefCom nhằm phân tích và xác thực giọng nói. Tôi sẽ cố gắng duy trì tốc độ nói ổn định và phát âm rõ ràng để hạn chế sai số trong quá trình xử lý. Không gian xung quanh tôi tương đối yên tĩnh, nên hy vọng chất lượng âm thanh sẽ đủ tốt cho hệ thống học và nhận dạng đúng giọng của tôi trong những lần sử dụng tiếp theo.",
  "Đây là đoạn thu âm mẫu thứ hai để hỗ trợ AIDefCom xây dựng mô hình nhận diện giọng nói chính xác hơn. Tôi đang nói ở tốc độ tự nhiên, không quá nhanh, không quá chậm. Mục tiêu của đoạn này là tạo ra dữ liệu có tính ổn định và dễ phân tích. Trong thực tế, giọng nói có thể thay đổi tùy theo ngữ cảnh, cảm xúc hay môi trường, vì vậy bản thu này giúp hệ thống có thêm thông tin để nhận dạng tôi trong nhiều tình huống khác nhau.",
  "Đây là bản thu mẫu thứ ba dành cho quá trình huấn luyện và xác thực của AIDefCom. Tôi đang nói với giọng bình thường giống như khi trao đổi công việc hằng ngày. Nếu hệ thống nhận diện tốt, sau này những thao tác đăng nhập, phê duyệt hay xác minh danh tính của tôi sẽ trở nên nhanh chóng và thuận tiện hơn. Tôi hy vọng đoạn thu này có đủ độ dài và sự rõ ràng để hỗ trợ hệ thống cải thiện độ chính xác.",
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
    // Get user from localStorage
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);

    // Fetch status
    fetchStatus(userData.id);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  const fetchStatus = async (userId: string) => {
    try {
      const data = await voiceApi.getStatus(userId);
      setStatus(data);
      if (data.enrollment_status === "enrolled") {
        swalConfig.success(
          "Đã hoàn tất!",
          "Bạn đã đăng ký giọng nói thành công."
        );
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
      swalConfig.error("Lỗi", "Không thể tải trạng thái đăng ký giọng nói.");
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Convert to WAV before uploading
        try {
          const { convertToWav } = await import("@/lib/utils/audioConverter");
          const wavBlob = await convertToWav(webmBlob);
          await handleUpload(wavBlob);
        } catch (err) {
          console.error("WAV conversion failed:", err);
          swalConfig.error("Lỗi", "Không thể xử lý file âm thanh.");
        }
      };

      mediaRecorder.start();
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
        "Lỗi Micro",
        "Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập."
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
        swalConfig.error("Lỗi", result.error);
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
          swalConfig.success("Thành công", "Đăng ký giọng nói hoàn tất!");

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
            "Đã lưu",
            `Mẫu ${
              currentSampleIndex + 1
            } đã được lưu. Hãy tiếp tục mẫu tiếp theo.`
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
          "Đã hoàn tất",
          "Hệ thống ghi nhận bạn đã có đủ mẫu giọng nói từ trước."
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

      swalConfig.error("Lỗi", errorMessage || "Gửi mẫu giọng nói thất bại.");
      setTimeLeft(RECORDING_DURATION);
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("user");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback
      localStorage.removeItem("user");
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Đang tải thông tin...</div>
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-white shadow-sm rounded-md border hover:bg-gray-50"
        >
          Logout
        </button>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-purple-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Voice Registration
          </h1>
          <p className="text-purple-100 text-sm">
            Thiết lập bảo mật giọng nói cho tài khoản của bạn
          </p>
        </div>

        {/* Progress */}
        <div className="px-6 pt-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Tiến độ</span>
            <span>
              {completedCount}/{maxCount} samples đã lưu
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Sample indicator dots */}
          <div className="flex justify-center gap-3 mt-4">
            {samples.map((sample, idx) => (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full transition-all duration-300 ${
                  sample.status === "completed"
                    ? "bg-green-500"
                    : sample.status === "recording"
                    ? "bg-purple-500 animate-pulse"
                    : sample.status === "processing"
                    ? "bg-yellow-500"
                    : sample.status === "failed"
                    ? "bg-red-500"
                    : "bg-gray-300"
                }`}
                title={`Sample ${idx + 1}: ${sample.status}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-start gap-3">
              <span className="text-xl">🔊</span>
              <div>
                <p className="text-blue-800 font-medium text-sm mb-2">
                  Vui lòng đọc to và rõ ràng đoạn văn sau:
                </p>
                <p className="text-gray-700 text-sm leading-relaxed italic">
                  &quot;{displayText}&quot;
                </p>
              </div>
            </div>
          </div>

          {/* Timer Visualizer */}
          <div className="flex justify-center py-4">
            {recording ? (
              <div className="flex flex-col items-center gap-2">
                <div className="text-4xl font-bold text-purple-600 tabular-nums">
                  {timeLeft}s
                </div>
                <div className="flex items-center gap-1 h-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                  <span className="ml-2 text-red-500 font-medium text-xs">
                    Đang ghi âm...
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Hệ thống sẽ tự động lưu sau khi hết giờ
                </p>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                {showNextButton
                  ? "Đã lưu mẫu. Nhấn tiếp tục để sang mẫu tiếp theo."
                  : "Sẵn sàng ghi âm (15 giây)"}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            {processing ? (
              <button
                disabled
                className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center cursor-not-allowed"
              >
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              </button>
            ) : recording ? (
              // Disabled button during recording
              <button
                disabled
                className="w-16 h-16 rounded-full bg-gray-300 text-white flex items-center justify-center shadow-inner cursor-not-allowed"
              >
                <span className="font-bold text-lg">{timeLeft}</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                {showNextButton ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-8 h-8"
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
                    className="w-8 h-8"
                  >
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
                )}
              </button>
            )}
          </div>

          <p className="text-center text-xs text-gray-400">
            {recording
              ? "Vui lòng đọc đoạn văn trên"
              : showNextButton
              ? "Nhấn để tiếp tục"
              : "Nhấn để bắt đầu ghi âm (15s)"}
          </p>
        </div>
      </div>
    </div>
  );
}
