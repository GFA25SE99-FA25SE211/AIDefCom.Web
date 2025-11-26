"use client";

import React, { useState, useEffect } from "react";
import Modal from "./Modal";

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
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface Council {
  id: number;
  description: string;
  createdDate: string;
  status: "Active" | "Inactive";
  majorId?: number;
}

interface EditCouncilModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    id: number,
    data: { majorId: number; description: string; isActive: boolean }
  ) => void;
  councilData: Council | null;
  majorOptions: Array<{ id: number; name: string }>;
}

const EditCouncilModal: React.FC<EditCouncilModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  councilData,
  majorOptions,
}) => {
  const [majorId, setMajorId] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (councilData) {
      setMajorId(councilData.majorId ? String(councilData.majorId) : "");
      setDescription(councilData.description);
      setIsActive(councilData.status === "Active");
    } else {
      setMajorId("");
      setDescription("");
      setIsActive(true);
    }
  }, [councilData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!councilData || !majorId) return;
    onSubmit(councilData.id, { 
      majorId: parseInt(majorId, 10), 
      description, 
      isActive 
    });
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
        form="edit-council-form"
        className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm flex items-center gap-2"
      >
        <SaveIcon /> Save Changes
      </button>
    </>
  );

  if (!councilData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Council (ID: ${councilData.id})`}
      subtitle="Update council details below"
      footerContent={footer}
    >
      <form
        id="edit-council-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Major <span className="text-red-500">*</span>
          </label>
          <select
            value={majorId}
            onChange={(e) => setMajorId(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="">Select a major</option>
            {majorOptions.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Active</label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditCouncilModal;
