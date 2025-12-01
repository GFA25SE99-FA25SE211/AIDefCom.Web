"use client";

import React from "react";
interface HeaderProps {
  totalCount: number;
}

const Header: React.FC<HeaderProps> = ({ totalCount }) => {
  return (
    <header className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Defense Sessions List</h1>
        <p className="text-gray-500 text-sm">
          Total{" "}
          <span className="font-medium text-indigo-600">
            {totalCount}
          </span>{" "}
          defense sessions
        </p>
      </div>

    </header>
  );
};

export default Header;

