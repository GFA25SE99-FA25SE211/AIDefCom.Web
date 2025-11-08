"use client";

import React, { useState } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus } from "lucide-react";

interface AddRubricData {
  name: string;
  description: string;
}

interface AddRubricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddRubricData) => void;
}

const AddRubricModal: React.FC<AddRubricModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;
    onSubmit({ name, description });
    onClose();
  };

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="add-rubric-form" className="btn-primary">
        <Plus className="w-4 h-4 mr-2" />
        Save
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Rubric"
      subtitle="Enter rubric details below"
      footerContent={footer}
    >
      <form id="add-rubric-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="rubric-name">Rubric Name</label>
          <input
            id="rubric-name"
            type="text"
            placeholder="e.g., Presentation Skills"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rubric-description">Description</label>
          <textarea
            id="rubric-description"
            rows={4}
            placeholder="Evaluates presentation delivery and clarity"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddRubricModal;
