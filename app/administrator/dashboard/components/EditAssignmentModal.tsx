"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";

interface Assignment {
  id: string;
  lecturerId: string;
  councilId: string;
  role: string;
}

interface EditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: Omit<Assignment, "id">) => void;
  assignmentData: Assignment | null;
  lecturers: Array<{ id: string; fullName: string }>;
  councils: Array<{ id: string; councilName: string }>;
}

const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assignmentData,
  lecturers,
  councils,
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
      setRole(assignmentData.role || "");

      // Log warning if council not found
      if (!foundCouncil && councils.length > 0) {
        console.warn(
          `Council with ID ${stringCouncilId} not found in councils array. Available councils:`,
          councils.map((c) => c.id)
        );
      }
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
              console.log(
                "Council changed from",
                councilId,
                "to",
                e.target.value
              );
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
            <option value="Administrator">Administrator</option>
            <option value="Lecturer">Lecturer</option>
            <option value="Student">Student</option>
            <option value="Moderator">Moderator</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default EditAssignmentModal;
