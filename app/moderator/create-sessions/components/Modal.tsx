"use client";

import React from "react";

// Close Icon
const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerContent,
  className = "",
}) => {
  if (!isOpen) return null;

  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={handleContentClick}
        className={`relative bg-white w-full max-w-lg rounded-2xl shadow-xl transform transition-all p-6 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5">{children}</div>

        {/* Footer */}
        {footerContent && (
          <div className="mt-6 border-t pt-4 flex justify-end gap-3">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
