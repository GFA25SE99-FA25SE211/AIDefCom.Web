"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { CalendarPlus } from "lucide-react";

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
}

const AddSemesterModal: React.FC<AddSemesterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  majorOptions = [],
}) => {
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [majorID, setMajorID] = useState("");

  useEffect(() => {
    if (majorOptions.length > 0 && !majorID) {
      setMajorID(majorOptions[0].id);
    }
  }, [majorOptions, majorID]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate || !majorID) return;
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
            <input
              id="semester-name"
              type="text"
              placeholder="e.g., Fall 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group w-32">
            <label htmlFor="semester-year">Year</label>
            <input
              id="semester-year"
              type="number"
              placeholder="2025"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
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
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group flex-1">
            <label htmlFor="end-date">End Date</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="major-id">Major ID</label>
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
