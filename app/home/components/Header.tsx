"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  totalCount?: number;
  userName?: string;
  userRole?: string;
  groupName?: string;
  groupInfo?: string;
  showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  totalCount, 
  userName, 
  userRole,
  groupName,
  groupInfo,
  showBackButton = false
}) => {
  const router = useRouter();
  const isDetailPage = !!userName || !!groupName;

  return (
    <header className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button
            onClick={() => router.push("/home")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-gray-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </button>
        )}
        
        <div className="flex-1">
          {isDetailPage ? (
            <>
              {groupName && (
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {groupName}
                </h1>
              )}
              {groupInfo && (
                <p className="text-gray-500 text-sm mb-3">
                  {groupInfo}
                </p>
              )}
              {userName && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {userName}
                      </p>
                      {userRole && (
                        <p className="text-xs text-gray-500 capitalize">
                          {userRole}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-800">Defense Sessions List</h1>
              {totalCount !== undefined && (
                <p className="text-gray-500 text-sm">
                  Total{" "}
                  <span className="font-medium text-indigo-600">
                    {totalCount}
                  </span>{" "}
                  defense sessions
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

