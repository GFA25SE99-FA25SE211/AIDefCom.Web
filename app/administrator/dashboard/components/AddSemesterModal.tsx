"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { CalendarPlus } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";

interface AddSemesterData {
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  majorID: string;
}

interface MajorOption {
  id: string;
  name: string;
}

interface AddSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddSemesterData) => void;
  majorOptions?: MajorOption[];
  existingSemesters?: { name: string }[];
}

const AddSemesterModal: React.FC<AddSemesterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  majorOptions = [],
  existingSemesters = [],
}) => {
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [majorID, setMajorID] = useState("");
  const [nameError, setNameError] = useState("");
  const [isCheckingName, setIsCheckingName] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (majorOptions.length > 0 && !majorID) {
      setMajorID(majorOptions[0].id);
    }
  }, [majorOptions, majorID]);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setYear(new Date().getFullYear());
      setStartDate("");
      setEndDate("");
      setNameError("");
      setIsCheckingName(false);
      if (majorOptions.length > 0) {
        setMajorID(majorOptions[0].id);
      }
    }
  }, [isOpen, majorOptions]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Check for duplicate semester name
  const checkNameDuplicate = async (nameValue: string) => {
    if (!nameValue.trim()) {
      setNameError("");
      setIsCheckingName(false);
      return;
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const isDuplicate = existingSemesters.some(
      (semester) =>
        semester.name.toLowerCase() === nameValue.trim().toLowerCase()
    );

    if (isDuplicate) {
      setNameError("Tên học kỳ này đã tồn tại trong hệ thống");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (nameError) {
      swalConfig.error("Tên học kỳ không hợp lệ", "Vui lòng sử dụng tên khác.");
      return;
    }

    if (!name || !startDate || !endDate || !majorID) {
      swalConfig.error("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin.");
      return;
    }

    onSubmit({ name, year, startDate, endDate, majorID });
    onClose();
  };

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="add-semester-form" className="btn-primary">
        <CalendarPlus className="w-4 h-4 mr-2" />
        Save
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Semester"
      subtitle="Enter semester details below"
      footerContent={footer}
    >
      <form
        id="add-semester-form"
        onSubmit={handleSubmit}
        className="form-grid"
      >
        <div className="flex gap-4">
          <div className="form-group flex-1">
            <label htmlFor="semester-name">Semester Name</label>
            <div className="relative">
              <input
                id="semester-name"
                type="text"
                placeholder="e.g., Fall 2025"
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
                Đang kiểm tra tên học kỳ...
              </span>
            )}
          </div>

          <div className="form-group w-32">
            <label htmlFor="semester-year">Year</label>
            <input
              id="semester-year"
              type="number"
              placeholder="2025"
              value={year}
              onChange={(e) => {
                const newYear = Number(e.target.value);
                setYear(newYear);

                // Auto-fill dates when year changes (only if dates are empty or don't match the new year)
                if (newYear >= 2000 && newYear <= 2100) {
                  const currentStartYear = startDate
                    ? new Date(startDate).getFullYear()
                    : null;
                  const currentEndYear = endDate
                    ? new Date(endDate).getFullYear()
                    : null;

                  // If start date is empty or doesn't match new year, suggest default
                  if (
                    !startDate ||
                    (currentStartYear !== null && currentStartYear !== newYear)
                  ) {
                    setStartDate(`${newYear}-01-01`);
                  }

                  // If end date is empty or doesn't match new year, suggest default
                  if (
                    !endDate ||
                    (currentEndYear !== null && currentEndYear !== newYear)
                  ) {
                    setEndDate(`${newYear}-05-31`);
                  }
                }
              }}
              min={2000}
              max={2100}
              required
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="form-group flex-1">
            <label htmlFor="start-date">Start Date</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                const selectedDate = e.target.value;
                const selectedYear = selectedDate
                  ? new Date(selectedDate).getFullYear()
                  : null;

                // Validate that date is in the selected year
                if (selectedDate && selectedYear && selectedYear !== year) {
                  swalConfig.warning(
                    "Invalid Date",
                    `Start date must be in year ${year}. Please select a date in ${year}.`
                  );
                  return;
                }
                setStartDate(selectedDate);
              }}
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              required
            />
          </div>
          <div className="form-group flex-1">
            <label htmlFor="end-date">End Date</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                const selectedDate = e.target.value;
                const selectedYear = selectedDate
                  ? new Date(selectedDate).getFullYear()
                  : null;

                // Validate that date is in the selected year
                if (selectedDate && selectedYear && selectedYear !== year) {
                  swalConfig.warning(
                    "Invalid Date",
                    `End date must be in year ${year}. Please select a date in ${year}.`
                  );
                  return;
                }

                // Validate that end date is after start date
                if (selectedDate && startDate && selectedDate < startDate) {
                  swalConfig.warning(
                    "Invalid Date",
                    "End date must be after start date."
                  );
                  return;
                }
                setEndDate(selectedDate);
              }}
              min={startDate || `${year}-01-01`}
              max={`${year}-12-31`}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="major-id">Major Name</label>
          <select
            id="major-id"
            value={majorID}
            onChange={(e) => setMajorID(e.target.value)}
            required
          >
            <option value="" disabled>
              Select Major
            </option>
            {majorOptions.length > 0 ? (
              majorOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))
            ) : (
              <option value="" disabled>
                No majors available
              </option>
            )}
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default AddSemesterModal;
