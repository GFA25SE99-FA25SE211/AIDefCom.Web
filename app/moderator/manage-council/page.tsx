"use client";

import React, { useState, useEffect } from "react";
import CreateCouncilForm, {
  CouncilFormData,
} from "../create-sessions/components/CreateCouncilForm";
import AddCouncilMemberModal from "../create-sessions/components/AddCouncilMemberModal";
import { councilsApi } from "@/lib/api/councils";
import { committeeAssignmentsApi } from "@/lib/api/committee-assignments";
import { authApi } from "@/lib/api/auth";
import { majorsApi } from "@/lib/api/majors";
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
  const [majors, setMajors] = useState<Array<{ id: number; name: string }>>([]);
  const [lecturers, setLecturers] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedCouncilId, setSelectedCouncilId] = useState<number | null>(null);
  const [roleMapping, setRoleMapping] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const fetchCouncils = async () => {
      try {
        setLoading(true);
        const [councilsRes, assignmentsRes, usersRes, majorsRes] = await Promise.all([
          councilsApi.getAll(false).catch(() => ({ data: [] })),
          committeeAssignmentsApi.getAll().catch(() => ({ data: [] })),
          authApi.getAllUsers().catch(() => ({ data: [] })),
          majorsApi.getAll().catch(() => ({ data: [] })),
        ]);

        const councilsData = councilsRes.data || [];
        const assignments = assignmentsRes.data || [];
        const users = usersRes.data || [];
        const majorsData = (majorsRes.data || []).map((m: any) => ({
          id: m.id,
          name: m.majorName || m.name || `Major ${m.id}`,
        }));
        setMajors(majorsData);

        // Filter lecturers from users - only show users with role Lecturer, Chair, or Member
        const allowedRoles = ["lecturer", "chair", "member"];
        const lecturersData = (users || [])
          .filter((u: any) => {
            // Handle role as string or array
            const roles = Array.isArray(u.role) 
              ? u.role.map((r: string) => r?.toLowerCase())
              : u.role 
                ? [u.role.toLowerCase()]
                : u.Role
                  ? [u.Role.toLowerCase()]
                  : u.roles
                    ? (Array.isArray(u.roles) ? u.roles.map((r: string) => r?.toLowerCase()) : [u.roles.toLowerCase()])
                    : [];
            
            // Check if user has any of the allowed roles
            return roles.some((role: string) => allowedRoles.includes(role));
          })
          .map((u: any) => ({
            id: u.id,
            fullName: u.fullName || u.name || "Unknown",
            email: u.email || "",
          }));
        setLecturers(lecturersData);

        // Build role mapping from existing assignments
        // Map role names to councilRoleId (default mapping if not found in assignments)
        const mapping = new Map<string, number>();
        assignments.forEach((a: any) => {
          const roleName = a.roleName || a.role;
          const councilRoleId = a.councilRoleId;
          if (roleName && councilRoleId) {
            // Map common role names
            if (roleName.toLowerCase().includes("chair") || roleName.toLowerCase().includes("chủ tịch")) {
              mapping.set("Chair", councilRoleId);
            } else if (roleName.toLowerCase().includes("secretary") || roleName.toLowerCase().includes("thư ký")) {
              mapping.set("Secretary", councilRoleId);
            } else if (roleName.toLowerCase().includes("member") || roleName.toLowerCase().includes("thành viên")) {
              mapping.set("Member", councilRoleId);
            }
          }
        });
        // Set default mappings if not found
        if (!mapping.has("Chair")) mapping.set("Chair", 1);
        if (!mapping.has("Member")) mapping.set("Member", 2);
        if (!mapping.has("Secretary")) mapping.set("Secretary", 3);
        setRoleMapping(mapping);

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
                  role: a.role || (a as any).roleName || "Member",
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

  const handleCreateCouncil = async (formData: CouncilFormData & { members?: any[] }) => {
    try {
      // Step 1: Create the council
      const councilResponse = await councilsApi.create({
        majorId: formData.majorId,
        description: formData.description,
        isActive: true,
      });

      const newCouncilId = councilResponse.data?.id;
      if (!newCouncilId) {
        throw new Error("Failed to get council ID after creation");
      }

      // Step 2: Create committee assignments for members
      if (formData.members && formData.members.length > 0) {
        const assignmentPromises = formData.members.map((member) => {
          const councilRoleId = roleMapping.get(member.role) || 
            (member.role === "Chair" ? 1 : member.role === "Secretary" ? 3 : 2);
          
          return committeeAssignmentsApi.create({
            lecturerId: member.lecturerId,
            councilId: newCouncilId,
            councilRoleId: councilRoleId,
          }).catch((err) => {
            console.error(`Failed to add member ${member.fullName}:`, err);
            return null;
          });
        });

        await Promise.all(assignmentPromises);
      }

      // Step 3: Refresh councils
      const response = await councilsApi.getAll(false);
      const councilsData = response.data || [];
      const assignmentsRes = await committeeAssignmentsApi.getAll();
      const assignments = assignmentsRes.data || [];
      const usersRes = await authApi.getAllUsers();
      const users = usersRes.data || [];

      // Filter lecturers from users - only show users with role Lecturer, Chair, or Member
      const allowedRoles = ["lecturer", "chair", "member"];
      const lecturersData = (users || [])
        .filter((u: any) => {
          // Handle role as string or array
          const roles = Array.isArray(u.role) 
            ? u.role.map((r: string) => r?.toLowerCase())
            : u.role 
              ? [u.role.toLowerCase()]
              : u.Role
                ? [u.Role.toLowerCase()]
                : u.roles
                  ? (Array.isArray(u.roles) ? u.roles.map((r: string) => r?.toLowerCase()) : [u.roles.toLowerCase()])
                  : [];
          
          // Check if user has any of the allowed roles
          return roles.some((role: string) => allowedRoles.includes(role));
        })
        .map((u: any) => ({
          id: u.id,
          fullName: u.fullName || u.name || "Unknown",
          email: u.email || "",
        }));
      setLecturers(lecturersData);

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
                role: a.role || (a as any).roleName || "Member",
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
        `The new defense council has been created with ${formData.members?.length || 0} member(s).`
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

  const handleAddMember = async (data: { lecturerId: string; role: string; councilRoleId: number }) => {
    if (!selectedCouncilId) return;

    try {
      await committeeAssignmentsApi.create({
        lecturerId: data.lecturerId,
        councilId: selectedCouncilId,
        councilRoleId: data.councilRoleId,
      });

      // Refresh councils
      const [councilsRes, assignmentsRes, usersRes] = await Promise.all([
        councilsApi.getAll(false).catch(() => ({ data: [] })),
        committeeAssignmentsApi.getAll().catch(() => ({ data: [] })),
        authApi.getAllUsers().catch(() => ({ data: [] })),
      ]);

      const councilsData = councilsRes.data || [];
      const assignments = assignmentsRes.data || [];
      const users = usersRes.data || [];

      // Filter lecturers from users - only show users with role Lecturer, Chair, or Member
      const allowedRoles = ["lecturer", "chair", "member"];
      const lecturersData = (users || [])
        .filter((u: any) => {
          // Handle role as string or array
          const roles = Array.isArray(u.role) 
            ? u.role.map((r: string) => r?.toLowerCase())
            : u.role 
              ? [u.role.toLowerCase()]
              : u.Role
                ? [u.Role.toLowerCase()]
                : u.roles
                  ? (Array.isArray(u.roles) ? u.roles.map((r: string) => r?.toLowerCase()) : [u.roles.toLowerCase()])
                  : [];
          
          // Check if user has any of the allowed roles
          return roles.some((role: string) => allowedRoles.includes(role));
        })
        .map((u: any) => ({
          id: u.id,
          fullName: u.fullName || u.name || "Unknown",
          email: u.email || "",
        }));
      setLecturers(lecturersData);

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
      setIsAddMemberModalOpen(false);
      setSelectedCouncilId(null);

      await swalConfig.success(
        "Member Added Successfully!",
        "The lecturer has been added to the council."
      );
    } catch (error: any) {
      console.error("Error adding member:", error);
      await swalConfig.error(
        "Failed to Add Member",
        error.message || "An unexpected error occurred while adding the member."
      );
    }
  };

  const handleOpenAddMemberModal = (councilId: number) => {
    setSelectedCouncilId(councilId);
    setIsAddMemberModalOpen(true);
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
          onClick={() => {
            console.log("Create New Council clicked, isFormVisible:", isFormVisible);
            setIsFormVisible(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm shadow hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Create New Council
        </button>
      </div>

      {/* Form tạo mới */}
      {isFormVisible && (
        <div className="bg-white rounded-xl shadow p-6 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {majors.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              Loading majors... Please wait.
            </div>
          )}
          <CreateCouncilForm
            onCancel={() => {
              console.log("Form cancelled");
              setIsFormVisible(false);
            }}
            onSubmit={handleCreateCouncil}
            majorOptions={majors}
            lecturers={lecturers}
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
                          <h3 className="font-medium">
                            {council.majorName || `Council ${council.id}`}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {council.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                          {council.memberCount} Members
                        </span>
                        <button
                          onClick={() => handleOpenAddMemberModal(council.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                        >
                          <Plus className="w-3 h-3" />
                          Add Member
                        </button>
                      </div>
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

      {/* Add Member Modal */}
      {selectedCouncilId && (
        <AddCouncilMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => {
            setIsAddMemberModalOpen(false);
            setSelectedCouncilId(null);
          }}
          onSubmit={handleAddMember}
          councilId={selectedCouncilId}
          lecturers={lecturers}
          existingMembers={
            councils
              .find((c) => c.id === selectedCouncilId)
              ?.members.map((m) => ({
                lecturerId: lecturers.find((l) => l.email === m.email)?.id || "",
              })) || []
          }
          roleMapping={roleMapping}
        />
      )}
    </div>
  );
}
