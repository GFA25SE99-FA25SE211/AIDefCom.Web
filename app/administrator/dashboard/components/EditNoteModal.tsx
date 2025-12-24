"use client";

import React, { useState, useEffect } from "react";
import Modal from "../../../moderator/create-sessions/components/Modal";
import { Save } from "lucide-react";
import type { NoteDto } from "@/lib/models";

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: number, data: { title: string; content: string }) => void;
  noteData: NoteDto | null;
  sessionName?: string;
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  noteData,
  sessionName,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (noteData) {
      setTitle(noteData.title);
      setContent(noteData.content);
    } else {
      setTitle("");
      setContent("");
    }
  }, [noteData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteData) return;

    if (!title.trim()) {
      return;
    }

    onSubmit(noteData.id, {
      title: title.trim(),
      content: content.trim(),
    });
    onClose();
  };

  if (!noteData) return null;

  const footer = (
    <div className="modal-footer">
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button
        type="submit"
        form="edit-note-form"
        className="btn-primary"
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
      title={`Edit Note: ${noteData.title || `ID ${noteData.id}`}`}
      subtitle="Update note details below"
      footerContent={footer}
    >
      <form id="edit-note-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="note-session">Session</label>
          <input
            id="note-session"
            type="text"
            value={sessionName || `Session ${noteData.sessionId}`}
            disabled
            className="bg-gray-50 cursor-not-allowed text-gray-600"
          />
        </div>

        <div className="form-group col-span-2">
          <label htmlFor="note-title">Title</label>
          <input
            id="note-title"
            type="text"
            placeholder="Enter note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group col-span-2">
          <label htmlFor="note-content">Content</label>
          <textarea
            id="note-content"
            rows={5}
            placeholder="Enter note content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditNoteModal;

