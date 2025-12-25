"use client";

import React, { useState, useEffect, useMemo } from "react";
import CreateCouncilForm, {
  CouncilFormData,
} from "../create-sessions/components/CreateCouncilForm";
import AddCouncilMemberModal from "../create-sessions/components/AddCouncilMemberModal";
import EditCouncilMemberModal from "../create-sessions/components/EditCouncilMemberModal";
import { councilsApi } from "@/lib/api/councils";
import { councilRolesApi } from "@/lib/api/council-roles";
import { committeeAssignmentsApi } from "@/lib/api/committee-assignments";
import { authApi } from "@/lib/api/auth";
import { majorsApi } from "@/lib/api/majors";
import type { CouncilDto, CommitteeAssignmentDto } from "@/lib/models";
import { Plus, Shield, Users, UserCircle2, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { authUtils } from "@/lib/utils/auth";

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
    assignmentId?: number | string;
    name: string;
    department: string;
    email: string;
    role: string;
    lecturerId: string;
  }>;
}

const PAGE_SIZE = 8;

export default function ManageCouncilPage() {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [councils, setCouncils] = useState<CouncilWithMembers[]>([]);
  const [majors, setMajors] = useState<Array<{ id: number; name: string }>>([]);
  const [lecturers, setLecturers] = useState<
    Array<{ id: string; fullName: string; email: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [selectedCouncilId, setSelectedCouncilId] = useState<number | null>(
    null
  );
  const [editingMember, setEditingMember] = useState<{
    assignmentId: number | string;
    lecturerId: string;
    role: string;
    name: string;
    email: string;
  } | null>(null);
  const [roleMapping, setRoleMapping] = useState<Map<string, number>>(
    new Map()
  );
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCouncils = async () => {
    try {
      // Check if user is authenticated before fetching
      const userInfo = authUtils.getCurrentUserInfo();
      if (!userInfo.userId) {
        window.location.href = "/login";
        return;
      }

      // Small delay to ensure token is available
      await new Promise(resolve => setTimeout(resolve, 100));

      setLoading(true);
      const [councilsRes, assignmentsRes, usersRes, majorsRes] =
        await Promise.all([
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
            ? Array.isArray(u.roles)
              ? u.roles.map((r: string) => r?.toLowerCase())
              : [u.roles.toLowerCase()]
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

      // Try to get council roles from API (getAll), filter standard roles, use fallback if needed
      let roles: any[] = [];
      const standardRoleNames = [
        "Chair",
        "Member",
        "Secretary",
        "Chủ tịch",
        "Thành viên",
        "Thư ký",
      ];
      try {
        const rolesRes = await councilRolesApi.getAll();
        const apiRoles = rolesRes.data || [];
        roles = apiRoles.filter((r: any) =>
          standardRoleNames.some(
            (name) => (r.roleName || "").toLowerCase() === name.toLowerCase()
          )
        );
      } catch (error) {
        // Use fallback roles if API fails
        roles = [
          { id: 1, roleName: "Chair" },
          { id: 2, roleName: "Member" },
          { id: 3, roleName: "Secretary" },
        ];
      }

      // Build role mapping from council roles API or fallback
      const roleMap = new Map<string, number>();
      roles.forEach((role: any) => {
        roleMap.set(role.roleName, role.id);
      });

      // Set additional fallback mappings if still not found
      if (!roleMap.has("Chair") && !roleMap.has("Chủ tịch")) {
        roleMap.set("Chair", 1);
      }
      if (!roleMap.has("Member") && !roleMap.has("Thành viên")) {
        roleMap.set("Member", 2);
      }
      if (!roleMap.has("Secretary") && !roleMap.has("Thư ký")) {
        roleMap.set("Secretary", 3);
      }
      setRoleMapping(roleMap);

      const councilsWithMembers: CouncilWithMembers[] = councilsData.map(
        (council: CouncilDto) => {
          const councilAssignments = assignments.filter(
            (a: CommitteeAssignmentDto) => a.councilId === council.id
          );
          const members = councilAssignments.map(
            (a: CommitteeAssignmentDto) => {
              const user = users.find((u: any) => u.id === a.lecturerId);
              return {
                assignmentId: a.id,
                name: user?.fullName || "Unknown",
                department: "N/A",
                email: user?.email || "",
                role: a.role || (a as any).roleName || "Member",
                lecturerId: a.lecturerId,
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
      setCurrentPage(1); // Reset to first page when councils change
    } catch (error: any) {
      // Check if it's an authentication error
      if (error?.message?.includes("Authentication required") || 
          error?.status === 401 ||
          error?.errorData?.code === "DEF401") {
        window.location.href = "/login";
        return;
      }
      await swalConfig.error("Load Failed", "Failed to load council information");
    } finally {
      setLoading(false);
    }
  };

  // Paginated councils
  const paginatedCouncils = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return councils.slice(startIndex, endIndex);
  }, [councils, currentPage]);

  const totalPages = Math.ceil(councils.length / PAGE_SIZE);

  useEffect(() => {
    fetchCouncils();
  }, []);

  const handleCreateCouncil = async (
    formData: CouncilFormData & { members?: any[] }
  ) => {
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
          const councilRoleId =
            roleMapping.get(member.role) ||
            (member.role === "Chair" ? 1 : member.role === "Secretary" ? 3 : 2);

          return committeeAssignmentsApi
            .create({
              lecturerId: member.lecturerId,
              councilId: newCouncilId,
              councilRoleId: councilRoleId,
            })
            .catch((err) => {
              // Failed to add member
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
            ? Array.isArray(u.roles)
              ? u.roles.map((r: string) => r?.toLowerCase())
              : [u.roles.toLowerCase()]
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
                assignmentId: a.id,
                name: user?.fullName || "Unknown",
                department: "N/A",
                email: user?.email || "",
                role: a.role || (a as any).roleName || "Member",
                lecturerId: a.lecturerId,
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
        `The new defense council has been created with ${
          formData.members?.length || 0
        } member(s).`
      );
    } catch (error: any) {
      await swalConfig.error("Creation Failed", "Council creation failed");
    }
  };

  const handleAddMember = async (data: {
    lecturerId: string;
    role: string;
    councilRoleId: number;
  }) => {
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
            ? Array.isArray(u.roles)
              ? u.roles.map((r: string) => r?.toLowerCase())
              : [u.roles.toLowerCase()]
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
                assignmentId: a.id,
                name: user?.fullName || "Unknown",
                department: "N/A",
                email: user?.email || "",
                role: a.role,
                lecturerId: a.lecturerId,
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
      await swalConfig.error("Add Failed", "Member addition failed");
    }
  };

  const handleOpenAddMemberModal = (councilId: number) => {
    setSelectedCouncilId(councilId);
    setIsAddMemberModalOpen(true);
  };

  const handleOpenEditMemberModal = (
    councilId: number,
    member: {
      assignmentId: number | string;
      lecturerId: string;
      role: string;
      name: string;
      email: string;
    }
  ) => {
    setSelectedCouncilId(councilId);
    setEditingMember(member);
    setIsEditMemberModalOpen(true);
  };

  const handleEditMember = async (data: {
    assignmentId: number | string;
    lecturerId: string;
    role: string;
    councilRoleId: number;
  }) => {
    try {
      await committeeAssignmentsApi.update(data.assignmentId, {
        lecturerId: data.lecturerId,
        councilId: selectedCouncilId!,
        councilRoleId: data.councilRoleId,
      });

      // Close modal and reset state
      setIsEditMemberModalOpen(false);
      setEditingMember(null);
      setSelectedCouncilId(null);

      // Refresh data
      await fetchCouncils();

      await swalConfig.success(
        "Member Updated Successfully!",
        "The council member information has been updated."
      );
    } catch (error: any) {
      await swalConfig.error("Update Failed", "Member update failed");
    }
  };

  const handleDeleteMember = async (
    assignmentId: number | string,
    memberName: string
  ) => {
    try {
      const result = await swalConfig.confirm(
        "Delete Member",
        `Are you sure you want to remove ${memberName} from the council?`,
        "Yes, remove member"
      );

      if (result.isConfirmed) {
        await committeeAssignmentsApi.delete(assignmentId);

        // Refresh data
        await fetchCouncils();

        await swalConfig.success(
          "Member Removed",
          "The member has been successfully removed from the council."
        );
      }
    } catch (error: any) {
      await swalConfig.error("Delete Failed", "Member removal failed");
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
          onClick={() => {
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
                {paginatedCouncils.map((council) => (
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
                          key={`${member.email}-${member.assignmentId}`}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                              <UserCircle2 className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <h4 className="font-medium">{member.name}</h4>
                              {member.department && member.department !== "N/A" && (
                                <p className="text-gray-500">
                                  {member.department}
                                </p>
                              )}
                              <p className="text-gray-400 text-xs">
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
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
                            <button
                              onClick={() =>
                                handleOpenEditMemberModal(council.id, {
                                  assignmentId: member.assignmentId!,
                                  lecturerId: member.lecturerId,
                                  role: member.role,
                                  name: member.name,
                                  email: member.email,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit member"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteMember(
                                  member.assignmentId!,
                                  member.name
                                )
                              }
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Remove member"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {councils.length > PAGE_SIZE && (
                <div className="mt-6 flex items-center justify-between">
                  {/* Page Info */}
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                    {Math.min(currentPage * PAGE_SIZE, councils.length)} of{" "}
                    {councils.length} councils
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first page, last page, current page, and pages around current
                          return (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                          );
                        })
                        .map((page, index, array) => {
                          // Add ellipsis if there's a gap
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                  currentPage === page
                                    ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white"
                                    : "border border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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
                lecturerId: m.lecturerId,
                assignmentId: m.assignmentId,
              })) || []
          }
          roleMapping={roleMapping}
        />
      )}

      {/* Edit Member Modal */}
      {selectedCouncilId && editingMember && (
        <EditCouncilMemberModal
          isOpen={isEditMemberModalOpen}
          onClose={() => {
            setIsEditMemberModalOpen(false);
            setEditingMember(null);
            setSelectedCouncilId(null);
          }}
          onSubmit={handleEditMember}
          councilId={selectedCouncilId}
          lecturers={lecturers}
          existingMembers={
            councils
              .find((c) => c.id === selectedCouncilId)
              ?.members.filter(
                (m) => m.assignmentId !== editingMember.assignmentId
              )
              .map((m) => ({
                lecturerId: m.lecturerId,
                assignmentId: m.assignmentId,
              })) || []
          }
          roleMapping={roleMapping}
          editingMember={editingMember}
        />
      )}
    </div>
  );
}
