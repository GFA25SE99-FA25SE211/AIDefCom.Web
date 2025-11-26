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

      // FE chỉ dùng role trả về từ API route
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      redirectByRole(data.role, router);
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

      redirectByRole(data.role, router);
    } catch {
      setError("Google login failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FB] py-10 px-4">
      {/* Logo */}
      <div className="text-center mb-10">
        <img
          src="/favicon-new.ico"
          alt="logo"
          className="w-24 mx-auto mb-4 drop-shadow-md"
        />
        <h1 className="text-3xl font-semibold text-gray-800">AIDefCom</h1>
        <p className="text-base text-gray-600 mt-2">
          AI Defense Committee Management System
        </p>
      </div>

      {/* Card */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg border border-gray-100 px-10 py-8 transition-all">
        <h2 className="text-center text-xl font-semibold text-gray-800">
          Sign In
        </h2>

        <p className="text-center text-sm text-gray-500 mb-6 mt-2">
          Access the Defense Committee Management System
        </p>

        {/* GOOGLE LOGIN */}
        <div className="flex justify-center mb-5">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google login failed")}
            shape="pill"
            size="large"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="mx-4 text-xs text-gray-500">OR CONTINUE WITH</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <a
              href="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-500"
            >
              Forgot password?
            </a>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 text-center mt-1">{error}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-white font-medium transition shadow ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-500 hover:opacity-95"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
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
function redirectByRole(role: string, router: any) {
  const r = role?.toLowerCase();

  switch (r) {
    case "admin":
      router.push("/administrator");
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
