"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // ✅ cần để nhận cookie từ API
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      // ✅ Redirect theo role
      if (data.role === "administrator") router.push("/administrator");
      else if (data.role === "chair") router.push("/chair");
      else if (data.role === "secretary") router.push("/secretary");
      else if (data.role === "moderator") router.push("/moderator");
      else if (data.role === "member") router.push("/member");
      else router.push("/");
    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F3F6FB] p-4">
      {/* Logo + Title */}
      <div className="text-center mb-8">
        <img src="/favicon-new.ico" alt="logo" className="w-20 mx-auto mb-3" />
        <h1 className="text-2xl font-semibold">AIDefCom</h1>
        <p className="text-sm text-gray-600">
          AI Defense Committee Management System
        </p>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md px-8 py-6 rounded-2xl shadow-lg"
      >
        <h2 className="text-center text-lg font-semibold">Sign In</h2>
        <p className="text-center text-sm text-gray-500 mb-5">
          Access the Defense Committee Management System
        </p>

        {/* Sign in with Google */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition"
        >
          <img src="/google.png" className="w-5" alt="google" />
          <span>Sign in with Google</span>
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 border-t border-gray-200"></div>
          <span className="relative px-3 text-xs text-gray-500 bg-white">
            OR CONTINUE WITH
          </span>
        </div>

        {/* Email */}
        <label className="block mb-3 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your.email@example.com"
          />
        </label>

        {/* Password */}
        <label className="block mb-3 text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your password"
          />
        </label>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between text-sm mb-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" />
            Remember me
          </label>
          <a className="text-blue-600 hover:underline" href="#">
            Forgot password?
          </a>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-600 text-sm text-center mb-3">{error}</p>
        )}

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-lg text-white font-medium transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-6">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </div>
  );
}
