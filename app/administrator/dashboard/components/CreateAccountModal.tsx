"use client";

import React, { useState } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus, Eye, EyeOff } from "lucide-react"; // Icon thống nhất UI

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
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match. Please re-enter.");
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
  };

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="create-account-form" className="btn-primary">
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
          <input
            id="createEmail"
            type="email"
            placeholder="example@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
            <option value="Moderator">Moderator</option>
            <option value="Chair">Chair</option>
            <option value="Member">Member</option>
            <option value="Secretary">Secretary</option>
            <option value="Student">Student</option>
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
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
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
