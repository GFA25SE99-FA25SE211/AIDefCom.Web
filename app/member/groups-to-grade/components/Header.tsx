"use client";

import React from "react";
import { Languages } from "lucide-react";

interface HeaderProps {
  gradedCount: number;
  totalCount: number;
}

const Header: React.FC<HeaderProps> = ({ gradedCount, totalCount }) => {
  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Groups to Grade</h1>
        <p className="text-gray-500 text-sm">
          You have graded{" "}
          <span className="font-medium text-indigo-600">
            {gradedCount}/{totalCount}
          </span>{" "}
          groups
        </p>
      </div>

      <button className="flex items-center gap-2 mt-4 md:mt-0 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition">
        <Languages className="w-4 h-4" />
        <span>Tiếng Việt</span>
      </button>
    </header>
  );
};

export default Header;
