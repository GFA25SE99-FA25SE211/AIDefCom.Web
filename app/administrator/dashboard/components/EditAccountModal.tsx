"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Save, Eye, EyeOff } from "lucide-react";

interface UserAccount {
  id: number | string;
  name: string;
  email: string;
  primaryRole: string;
  roles?: string[];
  status: string;
  createdDate: string;
}

export interface AccountEditFormData {
  fullName: string;
  email: string;
  role: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: number | string, data: AccountEditFormData) => void;
  accountData: UserAccount | null;
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accountData,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (accountData) {
      setFullName(accountData.name);
      setEmail(accountData.email);
      setRole(accountData.primaryRole || accountData.roles?.[0] || "");
    } else {
      setFullName("");
      setEmail("");
      setRole("");
    }
    // Reset password fields when modal opens/closes
    setNewPassword("");
    setConfirmNewPassword("");
  }, [accountData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountData) return;

    // Validate password if provided
    if (newPassword || confirmNewPassword) {
      if (newPassword !== confirmNewPassword) {
        alert("New password and confirm password do not match. Please re-enter.");
        return;
      }
      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }
    }

    const formData: AccountEditFormData = {
      fullName,
      email,
      role,
    };

    // Only include password fields if they are provided
    if (newPassword && confirmNewPassword) {
      formData.newPassword = newPassword;
      formData.confirmNewPassword = confirmNewPassword;
    }

    onSubmit(accountData.id, formData);
  };

  if (!accountData) return null;

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="edit-account-form" className="btn-primary">
        <Save className="w-4 h-4 mr-2" />
        Save Changes
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Account"
      subtitle="Update user account information"
      footerContent={footer}
    >
      <form
        id="edit-account-form"
        onSubmit={handleSubmit}
        className="form-grid"
      >
        <div className="form-group">
          <label htmlFor="editFullName">Full Name</label>
          <input
            id="editFullName"
            type="text"
            placeholder="Dr. Nguyen Van A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="editEmail">Email</label>
          <input
            id="editEmail"
            type="email"
            placeholder="nguyenvana@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="editRole">Role</label>
          <select
            id="editRole"
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
          <label htmlFor="editNewPassword">New Password (Optional)</label>
          <div className="relative">
            <input
              id="editNewPassword"
              type={showNewPassword ? "text" : "password"}
              placeholder="Leave blank to keep current password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 flex items-center text-gray-500"
              onClick={() => setShowNewPassword((prev) => !prev)}
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="editConfirmPassword">Confirm New Password</label>
          <div className="relative">
            <input
              id="editConfirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter new password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
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
      </form>
    </Modal>
  );
};

export default EditAccountModal;
