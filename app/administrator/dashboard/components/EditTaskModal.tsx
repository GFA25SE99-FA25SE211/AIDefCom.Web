"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Save } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";

interface Task {
  id: number;
  title: string;
  description: string;
  assignedBy: string;
  assignedByName?: string;
  assignedTo: string;
  assignedToName?: string;
  rubricId?: number;
  sessionId?: number;
  status: "Pending" | "Completed" | "Inprogress";
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    id: number,
    data: Omit<Task, "id" | "assignedBy" | "assignedTo" | "status">
  ) => void;
  taskData: Task | null;
  userOptions?: { id: string; name: string }[];
  existingTasks?: { title: string }[];
  rubricOptions?: { id: number; name: string }[];
  sessionOptions?: { id: number; name: string }[];
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  taskData,
  userOptions = [],
  existingTasks = [],
  rubricOptions = [],
  sessionOptions = [],
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rubricId, setRubricId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [assignedBy, setAssignedBy] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [titleError, setTitleError] = useState("");
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (taskData) {
      setTitle(taskData.title);
      setDescription(taskData.description);
      setRubricId(taskData.rubricId ? String(taskData.rubricId) : "");
      setSessionId(taskData.sessionId ? String(taskData.sessionId) : "");
      setAssignedBy(taskData.assignedBy);
      setAssignedTo(taskData.assignedTo);
      setTitleError("");
      setIsCheckingTitle(false);
    } else {
      setTitle("");
      setDescription("");
      setRubricId("");
      setSessionId("");
      setAssignedBy("");
      setAssignedTo("");
      setTitleError("");
      setIsCheckingTitle(false);
    }
  }, [taskData]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Check for duplicate task title (exclude current task)
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
        (task) =>
          task.title.toLowerCase() === titleValue.toLowerCase() &&
          task.title.toLowerCase() !== taskData?.title.toLowerCase() // Exclude current task
      );

      if (titleExists) {
        setTitleError("Task name already exists");
      } else {
        setTitleError("");
      }
    } catch (error) {
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
    if (!taskData) return;

    if (titleError) {
      swalConfig.error("Tên task không hợp lệ", "Vui lòng sử dụng tên khác.");
      return;
    }

    if (!rubricId || !sessionId) {
      swalConfig.error(
        "Missing fields",
        "Please select Rubric and Defense Session."
      );
      return;
    }

    onSubmit(taskData.id, {
      title,
      description,
      rubricId: Number(rubricId),
      sessionId: Number(sessionId),
    });
    onClose();
  };

  if (!taskData) return null;

  // Get assigned by name - prioritize assignedByName from taskData, then userOptions, then fallback to ID
  const assignedByUser = userOptions.find((u) => u.id === taskData.assignedBy);
  const assignedByDisplayName = taskData.assignedByName || assignedByUser?.name || taskData.assignedBy;

  // Get assigned to name - prioritize assignedToName from taskData, then userOptions, then fallback to ID
  const assignedToUser = userOptions.find((u) => u.id === taskData.assignedTo);
  const assignedToDisplayName = taskData.assignedToName || assignedToUser?.name || taskData.assignedTo;

  const assignedToOptions =
    userOptions.length > 0
      ? userOptions.map((u) => ({ id: u.id, name: u.name }))
      : [
          { id: "chair", name: "Chair (No users found)" },
          { id: "secretary", name: "Secretary (No users found)" },
        ];

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button
        type="submit"
        form="edit-task-form"
        className="btn-primary"
        disabled={!!titleError || isCheckingTitle}
      >
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
        <div className="form-group col-span-2">
          <label htmlFor="task-title">Title</label>
          <div className="relative">
            <input
              id="task-title"
              type="text"
              placeholder="Review defense session reports"
              value={title}
              onChange={handleTitleChange}
              required
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

        <div className="form-group col-span-2">
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
          <label htmlFor="task-rubric">Rubric</label>
          <select
            id="task-rubric"
            value={rubricId}
            onChange={(e) => setRubricId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select rubric
            </option>
            {rubricOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
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
      </form>
    </Modal>
  );
};

export default EditTaskModal;
