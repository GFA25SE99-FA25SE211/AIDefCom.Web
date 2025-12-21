"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";

interface Assignment {
  id: string;
  lecturerId: string;
  councilId: string;
  role: string;
  roleName?: string;
}

interface EditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: Omit<Assignment, "id">) => void;
  assignmentData: Assignment | null;
  lecturers: Array<{ id: string; fullName: string }>;
  councils: Array<{ id: string; councilName: string }>;
  councilRoles?: Array<{ id: number; roleName: string; description?: string }>;
}

const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assignmentData,
  lecturers,
  councils,
  councilRoles = [],
}) => {
  const [lecturerId, setLecturerId] = useState("");
  const [councilId, setCouncilId] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (assignmentData) {
      const stringCouncilId = String(assignmentData.councilId);
      const foundCouncil = councils.find((c) => c.id === stringCouncilId);

      setLecturerId(assignmentData.lecturerId || "");
      // Only set councilId if council exists in the array, otherwise empty
      setCouncilId(foundCouncil ? stringCouncilId : "");
      // Use roleName if available, otherwise use role
      const roleToSet = assignmentData.roleName || assignmentData.role || "";
      setRole(roleToSet);
    } else {
      setLecturerId("");
      setCouncilId("");
      setRole("");
    }
  }, [assignmentData, councils]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentData) return;
    onSubmit(assignmentData.id, { lecturerId, councilId, role });
    onClose();
  };

  if (!assignmentData) return null;

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="edit-assignment-form" className="btn-primary">
        Save Changes
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Assignment: ${assignmentData.id}`}
      subtitle="Update the details for this committee assignment."
      footerContent={footer}
    >
      <form
        id="edit-assignment-form"
        onSubmit={handleSubmit}
        className="form-grid"
      >
        <div className="form-group">
          <label htmlFor="lecturer-select">Lecturer</label>
          <select
            id="lecturer-select"
            value={lecturerId}
            onChange={(e) => setLecturerId(e.target.value)}
            required
          >
            <option value="">Select Lecturer</option>
            {lecturers.map((lecturer) => (
              <option key={lecturer.id} value={lecturer.id}>
                {lecturer.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="council-select">Council</label>
          <select
            id="council-select"
            value={councilId}
            onChange={(e) => {
              setCouncilId(e.target.value);
            }}
            required
          >
            <option value="">Select Council</option>
            {councils.map((council) => (
              <option key={council.id} value={council.id}>
                {council.councilName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="role-select">Role</label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="">Select Role</option>
            {councilRoles.length > 0 ? (
              councilRoles.map((councilRole) => (
                <option key={councilRole.id} value={councilRole.roleName}>
                  {councilRole.roleName}
                </option>
              ))
            ) : (
              // Fallback options if no council roles loaded
              <>
                <option value="Chair">Chair</option>
                <option value="Secretary">Secretary</option>
                <option value="Member">Member</option>
              </>
            )}
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default EditAssignmentModal;
