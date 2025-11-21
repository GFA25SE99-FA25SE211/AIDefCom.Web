"use client";

import React, { useState, useEffect } from "react";
import CreateCouncilForm, {
  CouncilFormData,
} from "../create-sessions/components/CreateCouncilForm";
import { councilsApi } from "@/lib/api/councils";
import { committeeAssignmentsApi } from "@/lib/api/committee-assignments";
import { authApi } from "@/lib/api/auth";
import type { CouncilDto, CommitteeAssignmentDto } from "@/lib/models";
import { Plus, Shield, Users, UserCircle2 } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";

const IconBadge = ({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "accent";
}) => (
  <div
    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
      variant === "primary"
        ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white"
        : "bg-purple-50 text-purple-600"
    }`}
  >
    {children}
  </div>
);

interface CouncilWithMembers extends CouncilDto {
  memberCount: number;
  members: Array<{
    name: string;
    department: string;
    email: string;
    role: string;
  }>;
}

export default function ManageCouncilPage() {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [councils, setCouncils] = useState<CouncilWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCouncils = async () => {
      try {
        setLoading(true);
        const [councilsRes, assignmentsRes, usersRes] = await Promise.all([
          councilsApi.getAll(false).catch(() => ({ data: [] })),
          committeeAssignmentsApi.getAll().catch(() => ({ data: [] })),
          authApi.getAllUsers().catch(() => ({ data: [] })),
        ]);

        const councilsData = councilsRes.data || [];
        const assignments = assignmentsRes.data || [];
        const users = usersRes.data || [];

        const councilsWithMembers: CouncilWithMembers[] = councilsData.map(
          (council: CouncilDto) => {
            const councilAssignments = assignments.filter(
              (a: CommitteeAssignmentDto) => a.councilId === council.id
            );
            const members = councilAssignments.map(
              (a: CommitteeAssignmentDto) => {
                const user = users.find((u: any) => u.id === a.lecturerId);
                return {
                  name: user?.fullName || "Unknown",
                  department: "N/A",
                  email: user?.email || "",
                  role: a.role,
                };
              }
            );

            return {
              ...council,
              memberCount: members.length,
              members,
            };
          }
        );

        setCouncils(councilsWithMembers);
      } catch (error) {
        console.error("Error fetching councils:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCouncils();
  }, []);

  const handleCreateCouncil = async (formData: CouncilFormData) => {
    try {
      await councilsApi.create({
        councilName:
          (formData as any).name ||
          (formData as any).councilName ||
          "New Council",
        description: (formData as any).description || "",
      });

      // Refresh councils
      const response = await councilsApi.getAll(false);
      const councilsData = response.data || [];
      const assignmentsRes = await committeeAssignmentsApi.getAll();
      const assignments = assignmentsRes.data || [];
      const usersRes = await authApi.getAllUsers();
      const users = usersRes.data || [];

      const councilsWithMembers: CouncilWithMembers[] = councilsData.map(
        (council: CouncilDto) => {
          const councilAssignments = assignments.filter(
            (a: CommitteeAssignmentDto) => a.councilId === council.id
          );
          const members = councilAssignments.map(
            (a: CommitteeAssignmentDto) => {
              const user = users.find((u: any) => u.id === a.lecturerId);
              return {
                name: user?.fullName || "Unknown",
                department: "N/A",
                email: user?.email || "",
                role: a.role,
              };
            }
          );

          return {
            ...council,
            memberCount: members.length,
            members,
          };
        }
      );

      setCouncils(councilsWithMembers);
      setIsFormVisible(false);

      await swalConfig.success(
        "Council Created Successfully!",
        "The new defense council has been created and is ready for member assignments."
      );
    } catch (error: any) {
      console.error("Error creating council:", error);
      await swalConfig.error(
        "Failed to Create Council",
        error.message ||
          "An unexpected error occurred while creating the council."
      );
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Manage Defense Councils</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage defense councils with faculty members
          </p>
        </div>

        <button
          onClick={() => setIsFormVisible(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm shadow hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Create New Council
        </button>
      </div>

      {/* Form tạo mới */}
      {isFormVisible && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <CreateCouncilForm
            onCancel={() => setIsFormVisible(false)}
            onSubmit={handleCreateCouncil}
          />
        </div>
      )}

      {/* Danh sách hội đồng */}
      {!isFormVisible && (
        <>
          {/* Tổng quan */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between mb-6">
            <div>
              <div className="text-xl font-semibold">{councils.length}</div>
              <div className="text-sm text-gray-500">Total Councils</div>
            </div>
            <IconBadge>
              <Shield className="w-5 h-5" />
            </IconBadge>
          </div>

          {/* Danh sách */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading councils...
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-3">Existing Councils</h2>
              <div className="space-y-4">
                {councils.map((council) => (
                  <div
                    key={council.id}
                    className="bg-white rounded-lg shadow p-4 border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <IconBadge variant="accent">
                          <Users className="w-5 h-5" />
                        </IconBadge>
                        <div>
                          <h3 className="font-medium">{council.councilName}</h3>
                          <p className="text-xs text-gray-500">
                            {council.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                        {council.memberCount} Members
                      </span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {council.members.map((member) => (
                        <div
                          key={member.email}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                              <UserCircle2 className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <h4 className="font-medium">{member.name}</h4>
                              <p className="text-gray-500">
                                {member.department}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              member.role === "Chair"
                                ? "bg-purple-100 text-purple-700"
                                : member.role === "Secretary"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="text-xs text-gray-400 mt-10 text-center">
        © 2025 AIDefCom · Smart Graduation Defense
      </footer>
    </div>
  );
}
