"use client";

import React, { useState } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus } from "lucide-react";

interface AddMajorData {
  name: string;
  description: string;
}

interface AddMajorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddMajorData) => void;
}

const AddMajorModal: React.FC<AddMajorModalProps> = ({
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
      <button type="submit" form="add-major-form" className="btn-primary">
        <Plus className="w-4 h-4 mr-2" />
        Save
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Major"
      subtitle="Enter major details below"
      footerContent={footer}
    >
      <form id="add-major-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="major-name">Major Name</label>
          <input
            id="major-name"
            type="text"
            placeholder="e.g., Computer Science"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="major-description">Description</label>
          <textarea
            id="major-description"
            rows={4}
            placeholder="Bachelor of Computer Science program"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddMajorModal;
