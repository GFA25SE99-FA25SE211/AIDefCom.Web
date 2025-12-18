"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff } from "lucide-react";
import { jwtDecode } from "jwt-decode";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ============================
  // EMAIL LOGIN
  // ============================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError("Invalid Email or Password");
        return;
      }

      // Kiểm tra role student
      if (data.role?.toLowerCase() === "student") {
        setError(
          "This account is not authorized to access the system. Please contact your administrator."
        );
        return;
      }

      // Lưu accessToken và refreshToken vào Local Storage
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      redirectByRole(data.role, router, data.user);
    } catch {
      setError("Invalid Email or Password");
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // GOOGLE LOGIN
  // ============================
  const handleGoogleSuccess = async (response: any) => {
    try {
      const googleToken = response.credential;

      const res = await fetch("/api/auth/login/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: googleToken }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Google login failed");
        return;
      }

      // Kiểm tra role student
      if (data.role?.toLowerCase() === "student") {
        setError(
          "This account is not authorized to access the system. Please contact your administrator."
        );
        return;
      }

      // Lưu accessToken và refreshToken vào Local Storage
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      redirectByRole(data.role, router, data.user);
    } catch {
      setError("Google login failed");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl">
              <img src="/favicon-new.ico" alt="logo" className="w-16 h-16" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold mb-4 text-center">AIDefCom</h1>
          <p className="text-xl text-white/90 text-center mb-12 max-w-md">
            AI Defense Committee Management System
          </p>

          {/* Features */}
          <div className="space-y-6 max-w-md">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Secure Authentication
                </h3>
                <p className="text-white/80 text-sm">
                  Voice biometric and multi-factor authentication
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
                  <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Smart Management</h3>
                <p className="text-white/80 text-sm">
                  AI-powered defense committee coordination
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z"
                    clipRule="evenodd"
                  />
                  <path
                    fillRule="evenodd"
                    d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Real-time Analytics
                </h3>
                <p className="text-white/80 text-sm">
                  Track and monitor defense sessions efficiently
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="/favicon-new.ico"
              alt="logo"
              className="w-16 mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold text-gray-800">AIDefCom</h1>
            <p className="text-sm text-gray-600 mt-1">
              AI Defense Committee Management System
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 lg:p-10">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2 flex justify-center">
                Welcome Back
              </h2>
              <p className="text-gray-600 flex justify-center">
                Sign in to access your account
              </p>
            </div>

            {/* GOOGLE LOGIN */}
            <div className="mb-6 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google login failed")}
                shape="pill"
                size="large"
                width="100%"
                locale="en"
              />
            </div>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="mx-4 text-xs font-medium text-gray-500">
                OR CONTINUE WITH
              </span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:outline-none transition-all"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:outline-none transition-all"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <a
                  href="/forgot-password"
                  className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl text-white font-semibold transition-all shadow-lg ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:shadow-xl transform hover:-translate-y-0.5"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            © 2025 AIDefCom · Smart Graduation Defense
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================
// JWT ROLE EXTRACTOR
// ============================
function extractRole(token: string) {
  const decoded: any = jwtDecode(token);

  return (
    decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    "member"
  );
}

// ============================
// REDIRECT
// ============================
// ============================
// REDIRECT
// ============================
async function redirectByRole(role: string, router: any, user?: any) {
  const r = role?.toLowerCase();

  // Check voice enrollment for non-admin and non-moderator users
  if (user && r !== "admin" && r !== "administrator" && r !== "moderator") {
    try {
      // Import dynamically to avoid circular dependencies if any, or just use global import
      const { voiceApi } = await import("@/lib/api/voice");
      const status = await voiceApi.getStatus(user.id);

      if (status.enrollment_status !== "enrolled") {
        router.push("/voice-enroll");
        return;
      }
    } catch (e) {
      console.error("Failed to check voice status", e);
      // Fallback to normal redirect if check fails (or maybe block? defaulting to allow for now)
    }
  }

  switch (r) {
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
}
