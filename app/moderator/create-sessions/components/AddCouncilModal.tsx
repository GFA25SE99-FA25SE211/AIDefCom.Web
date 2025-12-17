"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal"; // Base modal import
import { councilsApi } from "@/lib/api/councils";

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
  onSubmit: (data: { majorId: number; description: string; isActive: boolean }) => void;
  majorOptions: Array<{ id: number; name: string }>;
}

const AddCouncilModal: React.FC<AddCouncilModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  majorOptions,
}) => {
  const [majorId, setMajorId] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [descriptionError, setDescriptionError] = useState("");
  const [isCheckingDescription, setIsCheckingDescription] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMajorId("");
      setDescription("");
      setIsActive(true);
      setDescriptionError("");
      setIsCheckingDescription(false);
    }
  }, [isOpen]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Check for duplicate description
  const checkDescriptionDuplicate = async (descValue: string, majorIdValue: string) => {
    if (!descValue.trim() || !majorIdValue) {
      setDescriptionError("");
      setIsCheckingDescription(false);
      return;
    }

    try {
      const majorIdNum = Number(majorIdValue);
      if (isNaN(majorIdNum)) {
        setDescriptionError("");
        setIsCheckingDescription(false);
        return;
      }

      const exists = await councilsApi.checkDescriptionExists(descValue.trim(), majorIdNum);
      if (exists) {
        setDescriptionError("This description already exists for the selected major");
      } else {
        setDescriptionError("");
      }
    } catch (error) {
      console.error("Error checking description:", error);
      setDescriptionError("");
    } finally {
      setIsCheckingDescription(false);
    }
  };

  // Handle description change with debounce
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDescription(value);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.trim() && majorId) {
      setIsCheckingDescription(true);
      setDescriptionError("");

      // Set new timer
      debounceTimer.current = setTimeout(() => {
        checkDescriptionDuplicate(value, majorId);
      }, 500);
    } else {
      setDescriptionError("");
      setIsCheckingDescription(false);
    }
  };

  // Handle major change - also check description if description is already filled
  const handleMajorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setMajorId(value);

    // If description is already filled, check duplicate for new major
    if (description.trim() && value) {
      setIsCheckingDescription(true);
      setDescriptionError("");

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        checkDescriptionDuplicate(description, value);
      }, 500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (descriptionError) {
      return;
    }

    if (isCheckingDescription) {
      return;
    }

    if (!majorId) return;
    onSubmit({ 
      majorId: parseInt(majorId, 10), 
      description, 
      isActive 
    });
    setMajorId("");
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
            htmlFor="councilMajor"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Major <span className="text-red-500">*</span>
          </label>
          <select
            id="councilMajor"
            value={majorId}
            onChange={handleMajorChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
          <label
            htmlFor="councilDescription"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <div className="relative">
            <input
              type="text"
              id="councilDescription"
              placeholder="e.g. AI Defense Council - Fall 2025"
              value={description}
              onChange={handleDescriptionChange}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 outline-none ${
                descriptionError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : isCheckingDescription
                  ? "border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
            />
            {isCheckingDescription && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {descriptionError && (
            <span className="text-red-500 text-sm mt-1">{descriptionError}</span>
          )}
          {isCheckingDescription && !descriptionError && (
            <span className="text-blue-500 text-sm mt-1">
              Checking description...
            </span>
          )}
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
