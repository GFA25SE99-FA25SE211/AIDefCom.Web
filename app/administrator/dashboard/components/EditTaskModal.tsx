"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Save } from "lucide-react";

interface Task {
  id: number;
  title: string;
  description: string;
  assignedBy: string;
  assignedTo: string;
  status: "Pending" | "Completed" | "Inprogress";
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    id: number,
    data: Omit<Task, "id" | "assignedBy" | "assignedTo">
  ) => void;
  taskData: Task | null;
  userOptions?: { id: string; name: string }[];
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  taskData,
  userOptions = [],
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedBy, setAssignedBy] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState<"Pending" | "Completed" | "Inprogress">(
    "Pending"
  );

  useEffect(() => {
    if (taskData) {
      setTitle(taskData.title);
      setDescription(taskData.description);
      setAssignedBy(taskData.assignedBy);
      setAssignedTo(taskData.assignedTo);
      setStatus(taskData.status);
    } else {
      setTitle("");
      setDescription("");
      setAssignedBy("");
      setAssignedTo("");
      setStatus("Pending");
    }
  }, [taskData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskData) return;
    onSubmit(taskData.id, {
      title,
      description,
      status,
    });
    onClose();
  };

  if (!taskData) return null;

  // Get assigned by name from userOptions
  const assignedByUser = userOptions.find((u) => u.id === taskData.assignedBy);
  const assignedByDisplayName = assignedByUser?.name || taskData.assignedBy;

  // Get assigned to name from userOptions
  const assignedToUser = userOptions.find((u) => u.id === taskData.assignedTo);
  const assignedToDisplayName = assignedToUser?.name || taskData.assignedTo;

  const assignedToOptions =
    userOptions.length > 0
      ? userOptions.map((u) => ({ id: u.id, name: u.name }))
      : [
          { id: "chair", name: "Chair (No users found)" },
          { id: "secretary", name: "Secretary (No users found)" },
        ];
  const statusOptions: ("Pending" | "Completed" | "Inprogress")[] = [
    "Pending",
    "Inprogress",
    "Completed",
  ];

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form="edit-task-form" className="btn-primary">
        <Save className="w-4 h-4 mr-2" />
        Save Changes
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Task"
      subtitle="Update task details below"
      footerContent={footer}
    >
      <form id="edit-task-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            type="text"
            placeholder="Review defense session reports"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            rows={3}
            placeholder="Task description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="form-group flex-1">
            <label htmlFor="task-assigned-by">Assigned By</label>
            <input
              id="task-assigned-by"
              type="text"
              value={assignedByDisplayName}
              disabled
              className="bg-gray-50 cursor-not-allowed text-gray-600"
            />
          </div>

          <div className="form-group flex-1">
            <label htmlFor="task-assigned-to">Assigned To</label>
            <input
              id="task-assigned-to"
              type="text"
              value={assignedToDisplayName}
              disabled
              className="bg-gray-50 cursor-not-allowed text-gray-600"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="task-status">Status</label>
          <select
            id="task-status"
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value as "Pending" | "Completed" | "Inprogress"
              )
            }
            required
          >
            {statusOptions.map((s) => (
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

export default EditTaskModal;
