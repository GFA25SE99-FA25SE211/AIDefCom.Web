"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";

interface Rubric {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}
interface EditRubricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: Omit<Rubric, "id" | "createdAt">) => void;
  rubricData: Rubric | null;
}

const EditRubricModal: React.FC<EditRubricModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  rubricData,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (rubricData) {
      setName(rubricData.name);
      setDescription(rubricData.description);
    } else {
      setName("");
      setDescription("");
    }
  }, [rubricData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rubricData) return;
    onSubmit(rubricData.id, { name, description });
    onClose();
  };

  if (!rubricData) return null;

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="edit-rubric-form" className="btn-primary">
        Save Changes
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Rubric: ${rubricData.id}`}
      subtitle="Update the details for this evaluation rubric."
      footerContent={footer}
    >
      <form id="edit-rubric-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="rubric-name">Rubric Name</label>
          <input
            id="rubric-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Thesis Evaluation 2024"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rubric-desc">Description</label>
          <textarea
            id="rubric-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the rubric's purpose and scope."
            required
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditRubricModal;
