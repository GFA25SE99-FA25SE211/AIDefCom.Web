"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Plus } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";

interface AddTaskData {
  title: string;
  description: string;
  assignedTo: string;
  sessionId: string;
  status: "Pending" | "Completed" | "InProgress";
}
interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddTaskData) => void;
  userOptions?: { id: string; name: string }[];
  existingTasks?: { title: string }[];
  sessionOptions?: { id: number; name: string }[];
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userOptions = [],
  existingTasks = [],
  sessionOptions = [],
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState<
    "Pending" | "Completed" | "InProgress" | ""
  >("");
  const [titleError, setTitleError] = useState("");
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const assignees =
    userOptions.length > 0
      ? userOptions.map((u) => ({ id: u.id, name: u.name }))
      : [
          { id: "chair", name: "Chair (No users found)" },
          { id: "secretary", name: "Secretary (No users found)" },
        ];
  const statuses = ["Pending", "InProgress", "Completed"];

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setSessionId("");
      setStatus("");
      setTitleError("");
      setIsCheckingTitle(false);
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

  // Check for duplicate task title
  const checkTitleDuplicate = async (titleValue: string) => {
    if (!titleValue.trim()) {
      setTitleError("");
      setIsCheckingTitle(false);
      return;
    }

    setIsCheckingTitle(true);
    setTitleError("");

    // Simulate delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const titleExists = existingTasks.some(
        (task) => task.title.toLowerCase() === titleValue.toLowerCase()
      );

      if (titleExists) {
        setTitleError("Tên task này đã tồn tại trong hệ thống");
      } else {
        setTitleError("");
      }
    } catch (error) {
      console.error("Error checking title:", error);
      setTitleError("");
    } finally {
      setIsCheckingTitle(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const titleValue = e.target.value;
    setTitle(titleValue);

    // Clear previous debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      checkTitleDuplicate(titleValue);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (titleError) {
      swalConfig.error("Tên task không hợp lệ", "Vui lòng sử dụng tên khác.");
      return;
    }

    if (!assignedTo || !status || !sessionId) {
      swalConfig.error(
        "Missing fields",
        "Please select 'Assigned To', 'Defense Session', and 'Status' before saving."
      );
      return;
    }
    onSubmit({
      title,
      description,
      assignedTo,
      sessionId,
      status: status as "Pending" | "Completed" | "InProgress",
    });
    onClose();
  };

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button
        type="submit"
        form="add-task-form"
        className="btn-primary"
        disabled={!!titleError || isCheckingTitle}
      >
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
        <div className="form-group col-span-2">
          <label htmlFor="task-title">Title</label>
          <div className="relative">
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              required
              placeholder="Review defense session reports"
              className={`w-full ${titleError ? "border-red-500" : ""} ${
                isCheckingTitle ? "pr-8" : ""
              }`}
            />
            {isCheckingTitle && (
              <div className="absolute inset-y-0 right-2 flex items-center">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
          {titleError && (
            <span className="text-red-500 text-sm mt-1">{titleError}</span>
          )}
          {isCheckingTitle && (
            <span className="text-blue-500 text-sm mt-1">
              Đang kiểm tra tên task...
            </span>
          )}
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
          <label htmlFor="task-session">Defense Session</label>
          <select
            id="task-session"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select defense session
            </option>
            {sessionOptions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
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
