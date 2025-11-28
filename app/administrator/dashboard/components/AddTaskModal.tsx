"use client";

import React, { useState } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus } from "lucide-react";

interface AddTaskData {
  title: string;
  description: string;
  assignedTo: string;
  status: "Pending" | "Completed" | "Inprogress";
}
interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddTaskData) => void;
  userOptions?: { id: string; name: string }[];
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userOptions = [],
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState<
    "Pending" | "Completed" | "Inprogress" | ""
  >("");

  const assignees =
    userOptions.length > 0
      ? userOptions.map((u) => ({ id: u.id, name: u.name }))
      : [
          { id: "chair", name: "Chair (No users found)" },
          { id: "secretary", name: "Secretary (No users found)" },
        ];
  const statuses = ["Pending", "Inprogress", "Completed"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo || !status) {
      alert("Please select 'Assigned To' and 'Status' before saving.");
      return;
    }
    onSubmit({
      title,
      description,
      assignedTo,
      status: status as "Pending" | "Completed" | "Inprogress",
    });
    onClose();
  };

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="add-task-form" className="btn-primary">
        <Plus className="w-4 h-4 mr-2" />
        Save
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      subtitle="Enter task details below"
      footerContent={footer}
    >
      <form id="add-task-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Review defense session reports"
          />
        </div>

        <div className="form-group">
          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description..."
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="form-group flex-1">
            <label htmlFor="task-assigned-by">Assigned By</label>
            <input
              id="task-assigned-by"
              type="text"
              value="Admin"
              disabled
              className="bg-gray-50 cursor-not-allowed"
            />
          </div>

          <div className="form-group flex-1">
            <label htmlFor="task-assigned-to">Assigned To</label>
            <select
              id="task-assigned-to"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
            >
              <option value="" disabled>
                Select assignee
              </option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="task-status">Status</label>
          <select
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            required
          >
            <option value="" disabled>
              Select status
            </option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default AddTaskModal;
