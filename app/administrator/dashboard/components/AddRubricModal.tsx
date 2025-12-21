"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { rubricsApi } from "@/lib/api/rubrics";

interface AddRubricData {
  name: string;
  description: string;
  majorId: number;
}

interface Major {
  id: number;
  majorName: string;
}

interface AddRubricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddRubricData) => void;
  existingRubrics?: { name: string }[];
  majors?: Major[];
}

const AddRubricModal: React.FC<AddRubricModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingRubrics = [],
  majors = [],
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [majorId, setMajorId] = useState<number>(0);
  const [nameError, setNameError] = useState("");
  const [isCheckingName, setIsCheckingName] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setMajorId(0);
      setNameError("");
      setIsCheckingName(false);
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

  // Check for duplicate rubric name using API
  const checkNameDuplicate = async (nameValue: string) => {
    if (!nameValue.trim()) {
      setNameError("");
      setIsCheckingName(false);
      return;
    }

    try {
      const exists = await rubricsApi.checkNameExists(nameValue.trim());
      if (exists) {
        setNameError("This rubric name already exists in the system");
      } else {
        setNameError("");
      }
    } catch (error) {
      setNameError("");
    } finally {
      setIsCheckingName(false);
    }
  };

  // Handle name change with debounce
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.trim()) {
      setIsCheckingName(true);
      setNameError("");

      // Set new timer
      debounceTimer.current = setTimeout(() => {
        checkNameDuplicate(value);
      }, 500);
    } else {
      setNameError("");
      setIsCheckingName(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (nameError) {
      swalConfig.error("Invalid Rubric Name", "Please use a different name.");
      return;
    }

    if (!name || !description || majorId === 0) {
      swalConfig.error("Missing Information", "Please fill in all required fields.");
      return;
    }

    onSubmit({ name, description, majorId });
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
        <div className="form-group col-span-2">
          <label htmlFor="rubric-name">Rubric Name</label>
          <div className="relative">
            <input
              id="rubric-name"
              type="text"
              placeholder="e.g., Presentation Skills"
              value={name}
              onChange={handleNameChange}
              className={`w-full ${
                nameError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : isCheckingName
                  ? "border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  : ""
              }`}
              required
            />
            {isCheckingName && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {nameError && (
            <span className="text-red-500 text-sm mt-1">{nameError}</span>
          )}
          {isCheckingName && (
            <span className="text-blue-500 text-sm mt-1">
              Checking rubric name...
            </span>
          )}
        </div>

        <div className="form-group col-span-2">
          <label htmlFor="major-select">Major</label>
          <select
            id="major-select"
            value={majorId}
            onChange={(e) => setMajorId(parseInt(e.target.value))}
            className="w-full"
            required
          >
            <option value={0}>Select a major...</option>
            {majors.map((major) => (
              <option key={major.id} value={major.id}>
                {major.majorName}
              </option>
            ))}
          </select>
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
