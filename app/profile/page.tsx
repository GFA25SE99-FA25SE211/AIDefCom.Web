"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Save,
  Edit2,
  X,
  Check,
  Mic,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { voiceApi, VoiceEnrollmentStatus } from "@/lib/api/voice";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import { AI_SERVICE_URL } from "@/lib/config/api-urls";

interface UserInfo {
  id: string;
  email: string;
  fullName?: string;
  userName?: string;
  phoneNumber?: string;
  role?: string;
  roles?: string[];
}

export default function ProfilePage() {
  const router = useRouter();

  // Voice enrollment check - must be enrolled to access this page
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Voice enrollment states
  const [voiceStatus, setVoiceStatus] = useState<VoiceEnrollmentStatus | null>(
    null
  );
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [resettingVoice, setResettingVoice] = useState(false);

  // Edit profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/auth/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setEditFullName(data.user.fullName || "");
        setEditPhoneNumber(data.user.phoneNumber || "");
        // Fetch voice status
        fetchVoiceStatus(data.user.id);
      } else {
        // Fallback: lấy userId từ accessToken
        const { authUtils } = await import("@/lib/utils/auth");
        const userId = authUtils.getCurrentUserId();
        if (userId) {
          // Tạo user tối thiểu với id
          setUser({ id: userId, email: "", fullName: "", phoneNumber: "" });
          fetchVoiceStatus(userId);
        } else {
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      const { authUtils } = await import("@/lib/utils/auth");
      const userId = authUtils.getCurrentUserId();
      if (userId) {
        setUser({ id: userId, email: "", fullName: "", phoneNumber: "" });
        fetchVoiceStatus(userId);
      } else {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchVoiceStatus = async (userId: string) => {
    try {
      setVoiceLoading(true);
      const status = await voiceApi.getStatus(userId);
      setVoiceStatus(status);
    } catch (error) {
      console.error("Failed to fetch voice status:", error);
      setVoiceStatus(null);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleResetVoice = async () => {
    if (!user) return;

    const result = await swalConfig.confirm(
      "Confirm Reset Voice Data",
      "Are you sure you want to delete all your voice enrollment data? You will need to re-enroll your voice before accessing the system."
    );

    if (!result.isConfirmed) return;

    try {
      setResettingVoice(true);

      // Call API DELETE to reset enrollment
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

      await response.json();

      swalConfig.success(
        "Voice Data Reset",
        "Your voice data has been deleted. Redirecting to voice enrollment..."
      );

      // Redirect to voice enrollment page
      setTimeout(() => {
        router.push("/voice-enroll");
      }, 1500);
    } catch (error: any) {
      swalConfig.error("Error", error.message || "Failed to reset voice data");
    } finally {
      setResettingVoice(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSavingProfile(true);

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: editFullName,
          phoneNumber: editPhoneNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      const updatedUser = {
        ...user,
        fullName: editFullName,
        phoneNumber: editPhoneNumber,
      };
      setUser(updatedUser);
      // Không lưu thông tin nhạy cảm vào localStorage
      setIsEditingProfile(false);
      swalConfig.success("Success", "Profile updated successfully");
    } catch (error: any) {
      swalConfig.error("Error", error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setEditFullName(user?.fullName || "");
    setEditPhoneNumber(user?.phoneNumber || "");
    setIsEditingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      swalConfig.error("Error", "New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      swalConfig.error("Error", "New password must be at least 6 characters");
      return;
    }

    try {
      setChangingPassword(true);

      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to change password");
      }

      swalConfig.success("Success", "Password changed successfully");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      swalConfig.error("Error", error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.fullName || user.userName || user.email || "User";
  const displayRole = user.role || (user.roles && user.roles[0]) || "Member";

  // Check if user is Admin or Moderator - they don't need voice enrollment
  const isAdminOrModerator =
    displayRole.toLowerCase() === "admin" ||
    displayRole.toLowerCase() === "moderator";

  const isVoiceEnrolled = voiceStatus?.enrollment_status === "enrolled";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/home"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-800">
            Account Settings
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden sticky top-24">
              {/* Avatar Section */}
              <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-blue-500 p-8 text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white/30">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <h2 className="mt-4 text-xl font-bold text-white">
                  {displayName}
                </h2>
                <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm text-white capitalize">
                  {displayRole}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm truncate">{user.email}</span>
                </div>
                {user.phoneNumber && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{user.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Card */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Personal Information
                  </h3>
                  <p className="text-sm text-gray-500">
                    Update your personal details
                  </p>
                </div>
                {!isEditingProfile ? (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition font-medium text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition text-sm disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-800">
                        {user.fullName || (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                      <span className="ml-2 text-xs text-gray-400 font-normal">
                        (Cannot be changed)
                      </span>
                    </label>
                    <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-600 cursor-not-allowed">
                      {user.email}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    {isEditingProfile ? (
                      <input
                        type="tel"
                        value={editPhoneNumber}
                        onChange={(e) => setEditPhoneNumber(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-800">
                        {user.phoneNumber || (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Role (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                      <span className="ml-2 text-xs text-gray-400 font-normal">
                        (Assigned by admin)
                      </span>
                    </label>
                    <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-600 capitalize cursor-not-allowed">
                      {displayRole}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Enrollment Card - Hidden for Admin and Moderator */}
            {!isAdminOrModerator && (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Voice Enrollment
                      </h3>
                      <p className="text-sm text-gray-500">
                        Manage your voice recognition data
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                          voiceLoading
                            ? "bg-gray-100"
                            : isVoiceEnrolled
                            ? "bg-green-100"
                            : "bg-amber-100"
                        }`}
                      >
                        {voiceLoading ? (
                          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        ) : isVoiceEnrolled ? (
                          <CheckCircle2 className="w-7 h-7 text-green-600" />
                        ) : (
                          <AlertCircle className="w-7 h-7 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {voiceLoading
                            ? "Checking status..."
                            : isVoiceEnrolled
                            ? "Voice Enrolled"
                            : "Not Enrolled"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {voiceLoading
                            ? "Please wait..."
                            : isVoiceEnrolled
                            ? `${
                                voiceStatus?.enrollment_count || 3
                              }/3 samples recorded`
                            : voiceStatus?.enrollment_status === "partial"
                            ? `${
                                voiceStatus?.enrollment_count || 0
                              }/3 samples recorded`
                            : "Voice enrollment required"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {!isVoiceEnrolled &&
                        voiceStatus?.enrollment_status !== "enrolled" && (
                          <Link
                            href="/voice-enroll"
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition font-medium text-sm"
                          >
                            <Mic className="w-4 h-4" />
                            Enroll Now
                          </Link>
                        )}
                      {(isVoiceEnrolled ||
                        voiceStatus?.enrollment_status === "partial") && (
                        <button
                          onClick={handleResetVoice}
                          disabled={resettingVoice || voiceLoading}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resettingVoice ? (
                            <>
                              <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                              Resetting...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Reset Data
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {isVoiceEnrolled && (
                    <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-sm text-green-700">
                        ✓ Your voice has been successfully enrolled. The system
                        can now recognize your voice during defense sessions.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Card */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Security</h3>
                  <p className="text-sm text-gray-500">Manage your password</p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition font-medium text-sm"
                >
                  <Lock className="w-4 h-4" />
                  {showPasswordForm ? "Cancel" : "Change Password"}
                </button>
              </div>

              <div className="p-6">
                {!showPasswordForm ? (
                  <div className="flex items-center gap-4 text-gray-500">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Password</p>
                      <p className="text-sm">••••••••••••</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12 transition"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12 transition"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12 transition"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Passwords do not match
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                          />
                        </svg>
                        Password Requirements
                      </p>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
                        <li
                          className={`flex items-center gap-2 ${
                            newPassword.length >= 8
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {newPassword.length >= 8 ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          At least 8 characters
                        </li>
                        <li
                          className={`flex items-center gap-2 ${
                            newPassword.length <= 16 && newPassword.length > 0
                              ? "text-green-600"
                              : newPassword.length > 16
                              ? "text-red-500"
                              : "text-gray-500"
                          }`}
                        >
                          {newPassword.length <= 16 &&
                          newPassword.length > 0 ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          Maximum 16 characters
                        </li>
                        <li
                          className={`flex items-center gap-2 ${
                            /[A-Z]/.test(newPassword)
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {/[A-Z]/.test(newPassword) ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          Uppercase letter (A-Z)
                        </li>
                        <li
                          className={`flex items-center gap-2 ${
                            /[a-z]/.test(newPassword)
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {/[a-z]/.test(newPassword) ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          Lowercase letter (a-z)
                        </li>
                        <li
                          className={`flex items-center gap-2 ${
                            /[0-9]/.test(newPassword)
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {/[0-9]/.test(newPassword) ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          At least one number (0-9)
                        </li>
                        <li
                          className={`flex items-center gap-2 ${
                            /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword)
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(
                            newPassword
                          ) ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          Special character (!@#$%^&*...)
                        </li>
                      </ul>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {changingPassword ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            Update Password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
