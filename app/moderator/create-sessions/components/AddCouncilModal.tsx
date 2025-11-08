"use client";

import React, { useState } from "react";
import Modal from "./Modal"; // Base modal import

const SaveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

interface AddCouncilModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { description: string; isActive: boolean }) => void;
}

const AddCouncilModal: React.FC<AddCouncilModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ description, isActive });
    setDescription("");
    setIsActive(true);
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-100"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="add-council-form"
        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90"
      >
        <SaveIcon />
        Save
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Council"
      subtitle="Enter council details below"
      footerContent={footer}
    >
      <form id="add-council-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="councilDescription"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <input
            type="text"
            id="councilDescription"
            placeholder="e.g. AI Defense Council - Fall 2025"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
        </div>
      </form>
    </Modal>
  );
};

export default AddCouncilModal;
