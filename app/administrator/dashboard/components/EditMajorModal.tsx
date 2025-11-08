"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";

interface Major {
  id: string;
  name: string;
  description: string;
}
interface EditMajorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: Omit<Major, "id">) => void;
  majorData: Major | null;
}

const EditMajorModal: React.FC<EditMajorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  majorData,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (majorData) {
      setName(majorData.name);
      setDescription(majorData.description);
    } else {
      setName("");
      setDescription("");
    }
  }, [majorData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!majorData) return;
    onSubmit(majorData.id, { name, description });
    onClose();
  };

  if (!majorData) return null;

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="edit-major-form" className="btn-primary">
        Save Changes
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Major: ${majorData.id}`}
      subtitle="Update the details for this major."
      footerContent={footer}
    >
      <form id="edit-major-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="major-name">Major Name</label>
          <input
            id="major-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Computer Science"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="major-desc">Description</label>
          <textarea
            id="major-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the major requirements."
            required
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditMajorModal;
