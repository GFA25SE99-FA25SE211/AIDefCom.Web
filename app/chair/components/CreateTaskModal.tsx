import { useState } from "react";
import { projectTasksApi } from "@/lib/api/project-tasks";
import { swalConfig } from "@/lib/utils/sweetAlert";
import type { RubricDto } from "@/lib/models";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  lecturers: any[];
  rubrics: RubricDto[];
  currentUserId: string;
  sessionId?: number;
}

export default function CreateTaskModal({
  open,
  onClose,
  lecturers,
  rubrics,
  currentUserId,
  sessionId,
}: CreateTaskModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedToId: "",
    rubricId: "" as string | number,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!currentUserId) {
        throw new Error("Current user not identified. Please relogin.");
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        assignedById: currentUserId,
        assignedToId: formData.assignedToId,
        rubricId: formData.rubricId ? Number(formData.rubricId) : null,
        status: "Pending",
        sessionId: sessionId || 1, // Default to sessionId 1 if not provided
      };

      console.log("Creating task with payload:", payload);
      await projectTasksApi.create(payload);

      // Reset form
      setFormData({
        title: "",
        description: "",
        assignedToId: "",
        rubricId: "",
      });

      onClose();
      swalConfig.success(
        "Task Created Successfully!",
        `Task "${formData.title}" has been created and assigned to ${
          lecturers.find((l) => l.id === formData.assignedToId)?.fullName ||
          "member"
        }.`
      );
    } catch (err: any) {
      console.error("Failed to create task:", err);
      setError(err.message || "Failed to create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              className="input-base w-full"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input-base w-full h-24 resize-none"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter task description"
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To *
            </label>
            <select
              className="input-base w-full"
              value={formData.assignedToId}
              onChange={(e) =>
                setFormData({ ...formData, assignedToId: e.target.value })
              }
              required
            >
              <option value="">Select a member</option>
              {lecturers
                .filter((l) => l.id !== currentUserId)
                .map((lecturer) => (
                  <option key={lecturer.id} value={lecturer.id}>
                    {lecturer.fullName || lecturer.userName} (
                    {lecturer.role || "Member"})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rubric (Optional)
            </label>
            <select
              className="input-base w-full"
              value={formData.rubricId}
              onChange={(e) =>
                setFormData({ ...formData, rubricId: e.target.value })
              }
            >
              <option value="">Select a rubric</option>
              {rubrics.map((rubric) => (
                <option key={rubric.id} value={rubric.id}>
                  {rubric.rubricName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
