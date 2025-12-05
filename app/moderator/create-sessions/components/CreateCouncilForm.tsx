"use client";

import React, { useState } from "react";
import { Shield, X, Plus, UserMinus } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";

export interface CouncilMemberData {
  id: number;
  lecturerId: string;
  fullName: string;
  email: string;
  department: string;
  role: "Chair" | "Member" | "Secretary" | "";
}

export interface CouncilFormData {
  majorId: number;
  description?: string;
  members: Omit<CouncilMemberData, "id">[];
}

interface CreateCouncilFormProps {
  onCancel: () => void;
  onSubmit: (formData: CouncilFormData) => void;
  majorOptions: Array<{ id: number; name: string }>;
  lecturers: Array<{ id: string; fullName: string; email: string }>;
}

const CreateCouncilForm: React.FC<CreateCouncilFormProps> = ({
  onCancel,
  onSubmit,
  majorOptions,
  lecturers,
}) => {
  const [majorId, setMajorId] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<CouncilMemberData[]>([
    {
      id: 1,
      lecturerId: "",
      fullName: "",
      email: "",
      department: "",
      role: "",
    },
  ]);
  const [nextMemberId, setNextMemberId] = useState(2);
  const [roleCounts, setRoleCounts] = useState({
    Chair: 0,
    Members: 0,
    Secretary: 0,
  });

  React.useEffect(() => {
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
      {
        id: nextMemberId,
        lecturerId: "",
        fullName: "",
        email: "",
        department: "",
        role: "",
      },
    ]);
    setNextMemberId((prev) => prev + 1);
  };

  const removeMember = (id: number) => {
    if (members.length > 1) {
      setMembers(members.filter((m) => m.id !== id));
    }
  };

  const handleMemberChange = (
    id: number,
    field: keyof CouncilMemberData,
    value: string
  ) => {
    setMembers(
      members.map((m) => {
        if (m.id === id) {
          const updated = { ...m, [field]: value };

          if (field === "lecturerId" && value) {
            const lecturer = lecturers.find((l) => l.id === value);
            if (lecturer) {
              updated.fullName = lecturer.fullName;
              updated.email = lecturer.email;
            }
          }
          return updated;
        }
        return m;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!majorId) {
      swalConfig.error("Missing major", "Please select a major for this council.");
      return;
    }

    const validMembers = members.filter(
      (m) => m.lecturerId && m.role && m.fullName
    );

    if (validMembers.length === 0) {
      swalConfig.error(
        "No members",
        "Please add at least one council member with an assigned role."
      );
      return;
    }

    const formData: CouncilFormData = {
      majorId: parseInt(majorId, 10),
      description: description || undefined,
      members: validMembers.map(({ id, ...rest }) => rest),
    };
    onSubmit(formData);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg shadow">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Create New Defense Council
            </h2>
            <p className="text-sm text-gray-500">
              Add faculty members and assign roles to create a council
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Major Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Major <span className="text-red-500">*</span>
          </label>
          <select
            value={majorId}
            onChange={(e) => setMajorId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select a major</option>
            {majorOptions.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            placeholder="Enter council description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
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
              <Plus className="w-4 h-4" /> Add Member
            </button>
          </div>

          {/* Member cards */}
          <div className="space-y-3">
            {members.map((member, index) => (
              <div
                key={member.id}
                className="relative bg-gray-50 p-4 rounded-lg border border-gray-200"
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
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lecturer Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lecturer <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={member.lecturerId}
                      onChange={(e) =>
                        handleMemberChange(
                          member.id,
                          "lecturerId",
                          e.target.value
                        )
                      }
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select a lecturer</option>
                      {lecturers.map((lecturer) => (
                        <option key={lecturer.id} value={lecturer.id}>
                          {lecturer.fullName} ({lecturer.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Full Name (auto-filled but editable) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={member.fullName}
                      onChange={(e) =>
                        handleMemberChange(
                          member.id,
                          "fullName",
                          e.target.value
                        )
                      }
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Email (auto-filled but editable) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Role */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role in Council <span className="text-red-500">*</span>
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

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow hover:opacity-90 transition"
          >
            <Shield className="w-4 h-4" /> Create Council
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCouncilForm;
