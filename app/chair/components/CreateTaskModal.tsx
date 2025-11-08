"use client";

export default function CreateTaskModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
        {/* Header */}
        <h2 className="text-lg font-semibold text-gray-800">Create New Task</h2>
        <p className="text-sm text-gray-500 mb-5">
          Assign tasks to committee members or secretary
        </p>

        {/* Form Fields */}
        <div className="form-grid">
          <div className="form-group">
            <label>Task Title</label>
            <input
              className="input-base"
              placeholder="e.g., Review Group 1 Report"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="input-base resize-none"
              placeholder="Task details..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Assign To</label>
            <select className="input-base">
              <option>Secretary</option>
              <option>Moderator</option>
              <option>Chair</option>
            </select>
          </div>

          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              className="input-base"
              placeholder="dd/mm/yyyy"
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary">Create</button>
        </div>
      </div>
    </div>
  );
}
