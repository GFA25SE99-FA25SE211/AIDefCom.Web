"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { majorsApi } from "@/lib/api/majors";

interface AddMajorData {
  name: string;
  description: string;
}

interface AddMajorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddMajorData) => void;
  existingMajors?: { majorName: string }[];
}

const AddMajorModal: React.FC<AddMajorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingMajors = [],
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [isCheckingName, setIsCheckingName] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setNameError("");
      setDescriptionError("");
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

  // Check for duplicate major name
  const checkNameDuplicate = async (nameValue: string) => {
    if (!nameValue.trim()) {
      setNameError("");
      setIsCheckingName(false);
      return;
    }

    // Check for invalid characters - only allow letters (including Vietnamese) and spaces
    const invalidCharsRegex =
      /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỂưăạảấầẩẫậắằẳẵặẹẻẽềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễếệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;
    if (!invalidCharsRegex.test(nameValue.trim())) {
      setNameError("Major name can only contain letters and spaces");
      setIsCheckingName(false);
      return;
    }

    // Check length (2-200 characters as per backend)
    if (nameValue.trim().length < 2) {
      setNameError("Major name must be at least 2 characters");
      setIsCheckingName(false);
      return;
    }

    if (nameValue.trim().length > 200) {
      setNameError("Major name cannot exceed 200 characters");
      setIsCheckingName(false);
      return;
    }

    // Check duplicate using API
    try {
      const exists = await majorsApi.checkNameExists(nameValue.trim());
      if (exists) {
        setNameError("This major name already exists in the system");
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

  // Handle description change with validation
  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setDescription(value);

    // Validate description length (max 1000 characters based on backend)
    if (value.length > 1000) {
      setDescriptionError("Description cannot exceed 1000 characters");
    } else {
      setDescriptionError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (nameError) {
      swalConfig.error(
        "Invalid Major Name",
        "Please use a different name."
      );
      return;
    }

    if (descriptionError) {
      swalConfig.error(
        "Invalid Description",
        "Please check and fix the description."
      );
      return;
    }

    if (!name.trim() || !description.trim()) {
      swalConfig.error("Missing Information", "Please fill in all required fields.");
      return;
    }

    onSubmit({ name: name.trim(), description: description.trim() });
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
        <div className="form-group col-span-2">
          <label htmlFor="major-name">Major Name</label>
          <div className="relative">
            <input
              id="major-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Ví dụ: Đồ Họa, Công Nghệ Thông Tin... (chỉ chữ cái và khoảng trắng)"
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
              Checking major name...
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="major-description">Description</label>
          <div className="relative">
            <textarea
              id="major-description"
              rows={3}
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Mô tả chi tiết về chuyên ngành... (tối đa 1000 ký tự)"
              className={`w-full ${
                descriptionError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              required
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {description.length}/1000
            </div>
          </div>
          {descriptionError && (
            <span className="text-red-500 text-sm mt-1">
              {descriptionError}
            </span>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default AddMajorModal;
