"use client";

import React, { useState, useEffect } from "react";

// --- Icons ---
const CouncilFormIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 00-3.741-.56L12 18.72m-3.741-.56A9.095 9.095 0 0112 13.093m0 0c-1.657 0-3.123.401-4.319 1.087m8.638 0C15.123 13.494 13.657 13.093 12 13.093"
    />
  </svg>
);
const AddMemberIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3M10 7a3.5 3.5 0 11-7 0"
    />
  </svg>
);
const RemoveIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
const SaveIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);
// --- End Icons ---

// Types
export interface CouncilMemberData {
  id: number;
  fullName: string;
  email: string;
  department: string;
  role: "Chair" | "Member" | "Secretary" | "";
}

export interface CouncilFormData {
  councilName: string;
  members: Omit<CouncilMemberData, "id">[];
}

interface CreateCouncilFormProps {
  onCancel: () => void;
  onSubmit: (formData: CouncilFormData) => void;
}

const CreateCouncilForm: React.FC<CreateCouncilFormProps> = ({
  onCancel,
  onSubmit,
}) => {
  const [councilName, setCouncilName] = useState("");
  const [members, setMembers] = useState<CouncilMemberData[]>([
    {
      id: 1,
      fullName: "Dr. John Doe",
      email: "johndoe@university.edu",
      department: "Computer Science",
      role: "",
    },
  ]);
  const [nextMemberId, setNextMemberId] = useState(2);
  const [roleCounts, setRoleCounts] = useState({
    Chair: 0,
    Members: 0,
    Secretary: 0,
  });

  useEffect(() => {
    const counts = { Chair: 0, Members: 0, Secretary: 0 };
    members.forEach((m) => {
      if (m.role === "Chair") counts.Chair++;
      else if (m.role === "Member") counts.Members++;
      else if (m.role === "Secretary") counts.Secretary++;
    });
    setRoleCounts(counts);
  }, [members]);

  const addMember = () => {
    setMembers([
      ...members,
      { id: nextMemberId, fullName: "", email: "", department: "", role: "" },
    ]);
    setNextMemberId((prev) => prev + 1);
  };

  const removeMember = (id: number) => {
    if (members.length > 1) setMembers(members.filter((m) => m.id !== id));
  };

  const handleMemberChange = (
    id: number,
    field: keyof CouncilMemberData,
    value: string
  ) => {
    setMembers(
      members.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedMembers = members.map(({ id: _id, ...rest }) => rest);
    const formData: CouncilFormData = {
      councilName,
      members: formattedMembers,
    };
    onSubmit(formData);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg shadow">
          <CouncilFormIcon />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Create New Defense Council</h2>
          <p className="text-sm text-gray-500">
            Add faculty members and assign roles to create a council
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Council Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Council Name
          </label>
          <input
            type="text"
            placeholder="e.g. Council for AI Projects - Fall 2025"
            value={councilName}
            onChange={(e) => setCouncilName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Members Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Council Members
            </label>
            <button
              type="button"
              onClick={addMember}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
            >
              <AddMemberIcon /> Add Member
            </button>
          </div>

          {/* Member cards */}
          {members.map((member, index) => (
            <div
              key={member.id}
              className="relative bg-gray-50 p-4 rounded-lg border border-gray-200 mb-3"
            >
              <h3 className="text-sm font-medium mb-3 text-gray-700">
                Member {index + 1}
              </h3>

              {members.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="absolute top-3 right-3 text-red-500 hover:bg-red-50 rounded-lg p-1 transition"
                  title="Remove Member"
                >
                  <RemoveIcon />
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={member.fullName}
                    onChange={(e) =>
                      handleMemberChange(member.id, "fullName", e.target.value)
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={member.email}
                    onChange={(e) =>
                      handleMemberChange(member.id, "email", e.target.value)
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="Enter department"
                    value={member.department}
                    onChange={(e) =>
                      handleMemberChange(
                        member.id,
                        "department",
                        e.target.value
                      )
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role in Council
                  </label>
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleMemberChange(
                        member.id,
                        "role",
                        e.target.value as CouncilMemberData["role"]
                      )
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    <option value="Chair">Chair</option>
                    <option value="Member">Member</option>
                    <option value="Secretary">Secretary</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Role Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
          <h4 className="font-medium mb-2">Role Summary:</h4>
          <div className="flex gap-6 text-gray-700">
            <div>
              <span className="font-medium text-purple-600">Chair:</span>{" "}
              {roleCounts.Chair}
            </div>
            <div>
              <span className="font-medium text-blue-600">Members:</span>{" "}
              {roleCounts.Members}
            </div>
            <div>
              <span className="font-medium text-green-600">Secretary:</span>{" "}
              {roleCounts.Secretary}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow hover:opacity-90 transition"
          >
            <SaveIcon /> Create Council
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCouncilForm;
