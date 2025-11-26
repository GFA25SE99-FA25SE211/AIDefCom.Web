"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Save } from "lucide-react";

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
  }, [accountData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountData) return;
    onSubmit(accountData.id, { fullName, email, role });
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
            <option value="Moderator">Moderator</option>
            <option value="Chair">Chair</option>
            <option value="Member">Member</option>
            <option value="Secretary">Secretary</option>
            <option value="Student">Student</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default EditAccountModal;
