"use client";

import React, { useState } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus } from "lucide-react"; // Icon thống nhất UI

export interface AccountFormData {
  fullName: string;
  email: string;
  role: string;
  department: string;
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
  const [department, setDepartment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ fullName, email, role, department });
    setFullName("");
    setEmail("");
    setRole("");
    setDepartment("");
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
            <option value="Moderator">Moderator</option>
            <option value="Chair">Chair</option>
            <option value="Member">Member</option>
            <option value="Secretary">Secretary</option>
            <option value="Student">Student</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="createDepartment">Department</label>
          <input
            id="createDepartment"
            type="text"
            placeholder="Computer Science"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
};

export default CreateAccountModal;
