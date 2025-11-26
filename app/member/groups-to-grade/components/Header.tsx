"use client";

import React from "react";
interface HeaderProps {
  gradedCount: number;
  totalCount: number;
}

const Header: React.FC<HeaderProps> = ({ gradedCount, totalCount }) => {
  return (
    <header className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
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

    </header>
  );
};

export default Header;
