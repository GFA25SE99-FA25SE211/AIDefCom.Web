"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";

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
      setStartDate(semesterData.startDate);
      setEndDate(semesterData.endDate);
      setMajorID(semesterData.majorID);
    } else {
      setName("");
      setYear(String(new Date().getFullYear()));
      setStartDate("");
      setEndDate("");
      setMajorID("");
    }
  }, [semesterData]);

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
            onChange={(e) => setYear(e.target.value)}
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
