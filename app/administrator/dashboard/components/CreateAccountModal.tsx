"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus, Eye, EyeOff } from "lucide-react"; // Icon thống nhất UI
import { swalConfig } from "@/lib/utils/sweetAlert";
import { authApi } from "@/lib/api/auth";

export interface AccountFormData {
  fullName: string;
  email: string;
  role: string;
  password: string;
  phoneNumber: string;
  confirmPassword?: string;
}

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => void;
  existingEmails?: string[];
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingEmails = [],
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset all states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset all form data when modal opens
      setFullName("");
      setEmail("");
      setRole("");
      setPassword("");
      setPhoneNumber("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setEmailError("");
      setIsCheckingEmail(false);
    }
  }, [isOpen]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Check for duplicate email using API
  const checkEmailDuplicate = async (emailValue: string) => {
    if (!emailValue || !emailValue.includes("@")) {
      setEmailError("");
      setIsCheckingEmail(false);
      return;
    }

    setIsCheckingEmail(true);
    setEmailError("");

    try {
      const exists = await authApi.checkEmailExists(emailValue.trim());
      if (exists) {
        setEmailError("This email already exists in the system");
      } else {
        setEmailError("");
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setEmailError("");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const emailValue = e.target.value;
    setEmail(emailValue);

    // Clear previous debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      checkEmailDuplicate(emailValue);
    }, 500); // 500ms debounce
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check email duplicate before submitting
    if (emailError) {
      swalConfig.error("Invalid Email", "Please use a different email.");
      return;
    }

    if (password !== confirmPassword) {
      swalConfig.error(
        "Password mismatch",
        "Passwords do not match. Please re-enter."
      );
      return;
    }
    onSubmit({ fullName, email, role, password, phoneNumber });
    setFullName("");
    setEmail("");
    setRole("");
    setPassword("");
    setPhoneNumber("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmailError("");
  };

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button
        type="submit"
        form="create-account-form"
        className="btn-primary"
        disabled={!!emailError || isCheckingEmail}
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Account
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Account"
      subtitle="Enter user account details below"
      footerContent={footer}
    >
      <form
        id="create-account-form"
        onSubmit={handleSubmit}
        className="form-grid"
      >
        <div className="form-group">
          <label htmlFor="createFullName">Full Name</label>
          <input
            id="createFullName"
            type="text"
            placeholder="Nguyen Van A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="createEmail">Email</label>
          <div className="relative">
            <input
              id="createEmail"
              type="email"
              placeholder="example@university.edu"
              value={email}
              onChange={handleEmailChange}
              required
              className={`${emailError ? "border-red-500" : ""} ${
                isCheckingEmail ? "pr-8" : ""
              }`}
            />
            {isCheckingEmail && (
              <div className="absolute inset-y-0 right-2 flex items-center">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
          {emailError && (
            <span className="text-red-500 text-sm mt-1">{emailError}</span>
          )}
          {isCheckingEmail && (
            <span className="text-blue-500 text-sm mt-1">
              Checking email...
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="createRole">Role</label>
          <select
            id="createRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="" disabled>
              Select role
            </option>
            <option value="Administrator">Administrator</option>
            <option value="Lecturer">Lecturer</option>
            <option value="Student">Student</option>
            <option value="Moderator">Moderator</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="createPassword">Password</label>
          <div className="relative">
            <input
              id="createPassword"
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 flex items-center text-gray-500"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 flex items-center text-gray-500"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="createPhone">Phone Number</label>
          <input
            id="createPhone"
            type="tel"
            placeholder="+84 912 345 678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
};

export default CreateAccountModal;
