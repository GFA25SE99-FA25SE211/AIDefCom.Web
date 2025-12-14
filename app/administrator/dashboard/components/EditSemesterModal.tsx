"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { swalConfig } from "@/lib/utils/sweetAlert";

interface Semester {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  majorID: string;
}
interface EditSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: Omit<Semester, "id">) => void;
  semesterData: Semester | null;
  majorOptions?: { id: string; name: string }[];
}

const formatDateInputValue = (value?: string) => {
  if (!value) return "";
  if (value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

const EditSemesterModal: React.FC<EditSemesterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  semesterData,
  majorOptions = [],
}) => {
  const [name, setName] = useState("");
  const [year, setYear] = useState("2025");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [majorID, setMajorID] = useState("");

  useEffect(() => {
    if (semesterData) {
      setName(semesterData.name);
      setYear(String(semesterData.year));
      setStartDate(formatDateInputValue(semesterData.startDate));
      setEndDate(formatDateInputValue(semesterData.endDate));
      setMajorID(
        semesterData.majorID ||
          (majorOptions.length > 0 ? majorOptions[0].id : "")
      );
    } else {
      const currentYear = new Date().getFullYear();
      setName("");
      setYear(String(currentYear));
      setStartDate("");
      setEndDate("");
      setMajorID("");
    }
  }, [semesterData, majorOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterData) return;
    onSubmit(semesterData.id, {
      name,
      year: Number(year),
      startDate,
      endDate,
      majorID,
    });
    onClose();
  };

  if (!semesterData) return null;

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="edit-semester-form" className="btn-primary">
        Save Changes
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Semester"
      subtitle="Enter semester details below"
      footerContent={footer}
    >
      <form
        id="edit-semester-form"
        onSubmit={handleSubmit}
        className="form-grid"
      >
        <div className="form-group">
          <label htmlFor="semester-name">Semester Name</label>
          <input
            id="semester-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="semester-year">Year</label>
          <input
            id="semester-year"
            type="number"
            value={year}
            onChange={(e) => {
              const newYear = e.target.value;
              const yearNum = parseInt(newYear, 10);
              setYear(newYear);
              
              // Auto-update dates when year changes (only if dates are empty or don't match the new year)
              if (newYear && yearNum >= 2000 && yearNum <= 2100) {
                const currentStartYear = startDate ? new Date(startDate).getFullYear() : null;
                const currentEndYear = endDate ? new Date(endDate).getFullYear() : null;
                
                // If start date is empty or doesn't match new year, suggest default
                if (!startDate || (currentStartYear !== null && currentStartYear !== yearNum)) {
                  setStartDate(`${yearNum}-01-01`);
                }
                
                // If end date is empty or doesn't match new year, suggest default
                if (!endDate || (currentEndYear !== null && currentEndYear !== yearNum)) {
                  setEndDate(`${yearNum}-05-31`);
                }
              }
            }}
            min={2000}
            max={2100}
            required
          />
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
                const selectedYear = selectedDate ? new Date(selectedDate).getFullYear() : null;
                const yearNum = parseInt(year, 10);
                
                // Validate that date is in the selected year
                if (selectedDate && selectedYear && selectedYear !== yearNum) {
                  swalConfig.warning(
                    "Invalid Date",
                    `Start date must be in year ${yearNum}. Please select a date in ${yearNum}.`
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
                const selectedYear = selectedDate ? new Date(selectedDate).getFullYear() : null;
                const yearNum = parseInt(year, 10);
                
                // Validate that date is in the selected year
                if (selectedDate && selectedYear && selectedYear !== yearNum) {
                  swalConfig.warning(
                    "Invalid Date",
                    `End date must be in year ${yearNum}. Please select a date in ${yearNum}.`
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
            {majorOptions.length > 0
              ? majorOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.id}
                  </option>
                ))
              : // fallback sample options if none passed
                ["CS001", "SE001", "BA001"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default EditSemesterModal;
