"use client";

import React, { useState, useEffect } from "react";
import { Users, X } from "lucide-react";
import Modal from "./Modal";
import { swalConfig } from "@/lib/utils/sweetAlert";

interface AddCouncilMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    lecturerId: string;
    role: string;
    councilRoleId: number;
  }) => void;
  councilId: number;
  lecturers: Array<{ id: string; fullName: string; email: string }>;
  existingMembers?: Array<{ lecturerId: string }>;
  roleMapping?: Map<string, number>;
}

const AddCouncilMemberModal: React.FC<AddCouncilMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  councilId,
  lecturers,
  existingMembers = [],
  roleMapping = new Map(),
}) => {
  const [lecturerId, setLecturerId] = useState("");
  const [role, setRole] = useState("");

  const availableLecturers = lecturers.filter(
    (lecturer) =>
      !existingMembers.some((member) => member.lecturerId === lecturer.id)
  );

  const defaultRoleMapping = new Map<string, number>([
    ["Chair", 1],
    ["Member", 2],
    ["Secretary", 3],
  ]);
  const effectiveRoleMapping =
    roleMapping.size > 0 ? roleMapping : defaultRoleMapping;

  useEffect(() => {
    if (!isOpen) {
      setLecturerId("");
      setRole("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lecturerId || !role) return;
    const councilRoleId = effectiveRoleMapping.get(role);
    if (!councilRoleId) {
      swalConfig.error(
        "Invalid role",
        `Role "${role}" not found in mapping. Please contact administrator.`
      );
      return;
    }
    onSubmit({ lecturerId, role, councilRoleId });
    setLecturerId("");
    setRole("");
  };

  const footer = (
    <>
      <button
        type="button"
        className="px-3 py-2 rounded-md border text-sm"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="add-member-form"
        className="px-3 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm flex items-center gap-2"
      >
        <Users className="w-4 h-4" /> Add Member
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Council Member"
      subtitle="Select a lecturer and assign their role in the council"
      footerContent={footer}
    >
      <form id="add-member-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lecturer <span className="text-red-500">*</span>
          </label>
          <select
            value={lecturerId}
            onChange={(e) => setLecturerId(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="">Select a lecturer</option>
            {availableLecturers.map((lecturer) => (
              <option key={lecturer.id} value={lecturer.id}>
                {lecturer.fullName} ({lecturer.email})
              </option>
            ))}
          </select>
          {availableLecturers.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              All lecturers have been assigned to this council.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="">Select a role</option>
            <option value="Chair">Chair</option>
            <option value="Member">Member</option>
            <option value="Secretary">Secretary</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default AddCouncilMemberModal;
