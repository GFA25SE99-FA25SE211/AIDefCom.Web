"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";

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
      setNameError("Tên chuyên ngành chỉ được chứa chữ cái và khoảng trắng");
      setIsCheckingName(false);
      return;
    }

    // Check length (2-200 characters as per backend)
    if (nameValue.trim().length < 2) {
      setNameError("Tên chuyên ngành phải có ít nhất 2 ký tự");
      setIsCheckingName(false);
      return;
    }

    if (nameValue.trim().length > 200) {
      setNameError("Tên chuyên ngành không được vượt quá 200 ký tự");
      setIsCheckingName(false);
      return;
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const isDuplicate = existingMajors.some(
      (major) =>
        major.majorName.toLowerCase() === nameValue.trim().toLowerCase()
    );

    if (isDuplicate) {
      setNameError("Tên chuyên ngành này đã tồn tại trong hệ thống");
    } else {
      setNameError("");
    }
    setIsCheckingName(false);
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
      setDescriptionError("Mô tả không được vượt quá 1000 ký tự");
    } else {
      setDescriptionError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (nameError) {
      swalConfig.error(
        "Tên chuyên ngành không hợp lệ",
        "Vui lòng sử dụng tên khác."
      );
      return;
    }

    if (descriptionError) {
      swalConfig.error(
        "Mô tả không hợp lệ",
        "Vui lòng kiểm tra và sửa lỗi mô tả."
      );
      return;
    }

    if (!name.trim() || !description.trim()) {
      swalConfig.error("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin.");
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
              Đang kiểm tra tên chuyên ngành...
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
