"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import AdminSidebar from "../dashboard/components/AdminSidebar";
import CreateAccountModal, {
  AccountFormData as CreateAccountData,
} from "../dashboard/components/CreateAccountModal";
import EditAccountModal, {
  AccountEditFormData,
} from "../dashboard/components/EditAccountModal";
import {
  Plus,
  Users,
  Search,
  Pencil,
  Trash2,
  Upload,
  Download,
  GraduationCap,
  UserRound,
  X,
  ArrowLeft,
} from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { studentsApi } from "@/lib/api/students";
import { lecturersApi } from "@/lib/api/lecturers";
import { semestersApi } from "@/lib/api/semesters";
import { majorsApi } from "@/lib/api/majors";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { getSimpleErrorMessage } from "@/lib/utils/apiError";
import { authUtils } from "@/lib/utils/auth";
import type { SemesterDto, MajorDto } from "@/lib/models";

// --- Types ---
interface UserAccount {
  id: string;
  name: string;
  email: string;
  roles: string[];
  primaryRole: string;
  status: "Active" | "Inactive";
  createdDate: string;
}

const ROLE_FALLBACK = "Student";
const ROLE_ALIASES: Record<string, string> = {
  admin: "Administrator",
  administrator: "Administrator",
  moderator: "Moderator",
  chair: "Chair",
  member: "Member",
  secretary: "Secretary",
  student: "Student",
  lecturer: "Lecturer",
  "no role": "No Role",
};

const allRoles = [
  "All Roles",
  "Administrator",
  "Lecturer",
  "Student",
  "Moderator",
];

const PAGE_SIZE = 8;

const normalizeRoles = (rawRoles: unknown): string[] => {
  if (!rawRoles) return [];
  if (Array.isArray(rawRoles)) {
    return rawRoles
      .filter((role): role is string => typeof role === "string")
      .map((role) => role.trim())
      .map((role) => ROLE_ALIASES[role.toLowerCase()] || role)
      .filter(Boolean);
  }
  if (typeof rawRoles === "string") {
    return rawRoles
      .split(",")
      .map((role) => role.trim())
      .map((role) => ROLE_ALIASES[role.toLowerCase()] || role)
      .filter(Boolean);
  }
  return [];
};

const mapUserFromApi = (user: any): UserAccount => {
  const rawRoles =
    user?.roles ??
    user?.Roles ??
    user?.role ??
    user?.Role ??
    (user?.role ? [user.role] : undefined);
  const normalizedRoles = normalizeRoles(rawRoles);
  const roles = normalizedRoles.length ? normalizedRoles : [ROLE_FALLBACK];
  const primaryRole = roles[0];
  const createdSource =
    user?.createdDate ??
    user?.CreatedDate ??
    user?.createdAt ??
    user?.CreatedAt;
  const createdDate = createdSource
    ? new Date(createdSource).toLocaleDateString("en-GB")
    : new Date().toLocaleDateString("en-GB");

  return {
    id: user?.id || user?.Id || "",
    name:
      user?.fullName ||
      user?.FullName ||
      user?.email ||
      user?.Email ||
      "Unknown",
    email: user?.email || user?.Email || "",
    roles,
    primaryRole,
    status: user?.isDelete ? "Inactive" : "Active",
    createdDate,
  };
};

const mapUsersFromApi = (apiUsers: any[] = []): UserAccount[] =>
  apiUsers.map(mapUserFromApi);

export default function AccountManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<null | "student" | "lecturer">(
    null
  );
  const [studentUploadParams, setStudentUploadParams] = useState({
    semesterId: "",
    majorId: "",
  });

  // Loading states for download/import operations
  const [isDownloadingStudentTemplate, setIsDownloadingStudentTemplate] =
    useState(false);
  const [isDownloadingLecturerTemplate, setIsDownloadingLecturerTemplate] =
    useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [semesters, setSemesters] = useState<SemesterDto[]>([]);
  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [uploadMetaLoading, setUploadMetaLoading] = useState(false);
  const studentFileInputRef = useRef<HTMLInputElement | null>(null);
  const lecturerFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await authApi.getAllUsers();

        // Check if response has the expected structure
        if (!response || !response.data) {
          console.warn("Unexpected response structure:", response);
          setUsers([]);
          return;
        }

        setUsers(mapUsersFromApi(response.data));
      } catch (error: any) {
        console.error("Error fetching users:", error);
        // Show user-friendly error message
        swalConfig.error("Load Failed", "Unable to load users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Function to automatically select the most appropriate semester based on current date
  const getDefaultSemesterId = (semesterList: SemesterDto[]): string => {
    if (!semesterList.length) return "";

    const currentDate = new Date();

    // Find semester where current date is between startDate and endDate
    const activeSemester = semesterList.find((semester) => {
      const startDate = new Date(semester.startDate);
      const endDate = new Date(semester.endDate);
      return currentDate >= startDate && currentDate <= endDate;
    });

    if (activeSemester) {
      return String(activeSemester.id);
    }

    // If no active semester, find the nearest upcoming semester
    const upcomingSemesters = semesterList
      .filter((semester) => new Date(semester.startDate) > currentDate)
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

    if (upcomingSemesters.length > 0) {
      return String(upcomingSemesters[0].id);
    }

    // If no upcoming semester, get the most recent semester
    const pastSemesters = semesterList
      .filter((semester) => new Date(semester.endDate) < currentDate)
      .sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      );

    if (pastSemesters.length > 0) {
      return String(pastSemesters[0].id);
    }

    // Fallback to first semester
    return String(semesterList[0].id);
  };

  useEffect(() => {
    const fetchUploadMeta = async () => {
      try {
        setUploadMetaLoading(true);
        const [semestersRes, majorsRes] = await Promise.all([
          semestersApi.getAll().catch(() => ({ data: [] })),
          majorsApi.getAll().catch(() => ({ data: [] })),
        ]);
        const semesterList = semestersRes.data || [];
        const majorList = majorsRes.data || [];
        setSemesters(semesterList);
        setMajors(majorList);
        setStudentUploadParams((prev) => ({
          semesterId: prev.semesterId || getDefaultSemesterId(semesterList),
          majorId:
            prev.majorId || (majorList.length ? String(majorList[0].id) : ""),
        }));
      } catch (error) {
        console.error("Error loading upload metadata:", error);
      } finally {
        setUploadMetaLoading(false);
      }
    };

    fetchUploadMeta();
  }, []);

  const roleSummary = useMemo(() => {
    const counts: { [key: string]: number } = {
      Total: users.length,
      Administrator: 0,
      Lecturer: 0,
      Moderator: 0,
      Chair: 0,
      Member: 0,
      Secretary: 0,
      Student: 0,
    };
    users.forEach((user) => {
      user.roles.forEach((role) => {
        if (role === "Administrator") counts.Administrator++;
        else if (role === "Lecturer") counts.Lecturer++;
        else if (role === "Moderator") counts.Moderator++;
        else if (role === "Chair") counts.Chair++;
        else if (role === "Member") counts.Member++;
        else if (role === "Secretary") counts.Secretary++;
        else if (role === "Student") counts.Student++;
      });
    });
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchTerm === "" ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole =
        selectedRole === "All Roles" || user.roles.includes(selectedRole);
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRole]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handleCreateAccount = async (data: CreateAccountData) => {
    try {
      // Generate a proper UUID for the account
      const generateUUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }
        );
      };

      const accountId = generateUUID();

      // Try creating account with ID first, fallback to without ID if needed
      let createAccountData: any = {
        id: accountId, // Add proper UUID
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
      };

      let response;
      try {
        response = await authApi.createAccount(createAccountData);
      } catch (firstError: any) {
        // If ID field causes error, try without ID
        if (firstError.response?.data?.errors?.Id) {
          console.log("ID field caused error, trying without ID...");
          const { id, ...dataWithoutId } = createAccountData;
          response = await authApi.createAccount(dataWithoutId);
        } else {
          throw firstError;
        }
      }

      console.log("Create account response:", response);

      if (data.role && data.role !== "Student") {
        // Gửi "Admin" thay vì "Administrator" cho backend
        const roleToSend = data.role === "Administrator" ? "Admin" : data.role;
        await authApi.assignRole(data.email, roleToSend);
      }

      // Refresh users list
      const usersResponse = await authApi.getAllUsers();
      setUsers(mapUsersFromApi(usersResponse.data || []));
      setIsCreateModalOpen(false);
      swalConfig.success("Success", "Account created");
    } catch (error: any) {
      console.error("Error creating account:", error);

      const errorMessage = getSimpleErrorMessage(error, "Failed to create account");
      swalConfig.error("Create Failed", errorMessage);
    }
  };

  const handleEditAccount = async (
    id: number | string,
    data: AccountEditFormData
  ) => {
    try {
      // Find the original user to get email (required by backend)
      const originalUser = users.find((u) => u.id === id);
      if (!originalUser) {
        await swalConfig.error("Error", "User not found");
        return;
      }

      const updateData: any = {
        fullName: data.fullName,
        email: originalUser.email, // Email is required by backend
      };

      // Include password if provided
      if (data.newPassword && data.confirmNewPassword) {
        updateData.newPassword = data.newPassword;
        updateData.confirmNewPassword = data.confirmNewPassword;
      }

      await authApi.updateAccount(String(id), updateData);

      if (data.role && editingUser && data.role !== editingUser.primaryRole) {
        // Gửi "Admin" thay vì "Administrator" cho backend
        const roleToSend = data.role === "Administrator" ? "Admin" : data.role;
        await authApi.assignRole(editingUser.email, roleToSend);
      }

      // Refresh users list
      const response = await authApi.getAllUsers();
      setUsers(mapUsersFromApi(response.data || []));
      setIsEditModalOpen(false);
      setEditingUser(null);
      swalConfig.success("Success", "Account updated");
    } catch (error: any) {
      console.error("Error updating account:", error);
      const errorMessage = getSimpleErrorMessage(error, "Failed to update account");
      swalConfig.error("Update Failed", errorMessage);
    }
  };

  const handleDeleteAccount = async (id: number | string) => {
    const user = users.find((u) => u.id === id);
    if (!user) {
      swalConfig.error("Error", "User not found");
      return;
    }

    // Lấy thông tin user hiện tại đang login
    const currentUser = authUtils.getCurrentUserInfo();

    // Kiểm tra xem user đang được xóa có phải là admin không
    const isUserAdmin =
      user.roles?.some((r) => {
        const roleLower = r?.toLowerCase();
        return roleLower === "administrator" || roleLower === "admin";
      }) ||
      user.primaryRole?.toLowerCase() === "administrator" ||
      user.primaryRole?.toLowerCase() === "admin";

    // Kiểm tra xem có phải đang xóa chính mình không
    let isDeletingSelf = false;

    // So sánh bằng userId (chuyển về string để so sánh chính xác)
    if (currentUser.userId) {
      const currentUserIdStr = String(currentUser.userId).trim();
      const userToDeleteIdStr = String(user.id).trim();
      const idToDeleteStr = String(id).trim();
      if (
        currentUserIdStr === userToDeleteIdStr ||
        currentUserIdStr === idToDeleteStr
      ) {
        isDeletingSelf = true;
      }
    }

    // So sánh bằng email (case-insensitive) nếu chưa match bằng id
    if (!isDeletingSelf && currentUser.email && user.email) {
      const currentEmailLower = currentUser.email.toLowerCase().trim();
      const userEmailLower = user.email.toLowerCase().trim();
      if (currentEmailLower === userEmailLower) {
        isDeletingSelf = true;
      }
    }

    // Nếu đang cố xóa chính mình và là admin, chặn lại
    if (isDeletingSelf && isUserAdmin) {
      console.log("BLOCKED: Admin trying to delete themselves", {
        currentUser: currentUser,
        userToDelete: { id: user.id, email: user.email, roles: user.roles },
        isDeletingSelf,
        isUserAdmin,
      });
      await swalConfig.error("Cannot Delete", "Cannot delete your own admin account");
      return;
    }

    const result = await swalConfig.confirm(
      "Delete Account?",
      `Are you sure you want to delete account for "${user.name}" (${user.email})?`,
      "Yes, delete it!"
    );

    if (result.isConfirmed) {
      setDeletingUserId(String(id));
      try {
        // Try the soft delete API call
        const response = await authApi.softDeleteAccount(user.email);
        console.log("Delete response:", response);

        // Remove the user from the local state
        setUsers((prevUsers) => prevUsers.filter((u) => u.id !== id));
        swalConfig.success("Success", "Account deleted");
      } catch (error: any) {
        console.error("Error deleting account:", error);

        const errorMessage = getSimpleErrorMessage(error, "Failed to delete account");
        swalConfig.error("Delete Failed", errorMessage);
      } finally {
        setDeletingUserId(null);
      }
    }
  };

  const handleDownloadStudentTemplate = async () => {
    try {
      setIsDownloadingStudentTemplate(true);
      swalConfig.loading("Downloading", "Please wait");

      await studentsApi.downloadStudentGroupTemplate();

      setIsDownloadModalOpen(false);
      await swalConfig.success("Success", "Student template downloaded");
    } catch (error: any) {
      console.error("Error downloading student-group template:", error);
      swalConfig.error("Download Failed", "Template download failed");
    } finally {
      setIsDownloadingStudentTemplate(false);
    }
  };

  const handleDownloadLecturerTemplate = async () => {
    try {
      setIsDownloadingLecturerTemplate(true);
      swalConfig.loading("Downloading", "Please wait");

      await lecturersApi.downloadTemplate();

      setIsDownloadModalOpen(false);
      await swalConfig.success("Success", "Lecturer template downloaded");
    } catch (error: any) {
      console.error("Error downloading lecturer template:", error);
      swalConfig.error("Download Failed", "Template download failed");
    } finally {
      setIsDownloadingLecturerTemplate(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadStep(null);
    setStudentUploadParams({ semesterId: "", majorId: "" });
  };

  const handleStudentUploadClick = () => {
    if (!semesters.length || !majors.length) {
      swalConfig.error("Data Not Ready", "Semester or major data unavailable");
      return;
    }
    setStudentUploadParams((prev) => ({
      semesterId: prev.semesterId || getDefaultSemesterId(semesters),
      majorId: prev.majorId || String(majors[0].id),
    }));
    setUploadStep("student");
  };

  const handleLecturerUploadClick = () => {
    setUploadStep("lecturer");
  };

  const handleStudentUploadFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!studentUploadParams.semesterId || !studentUploadParams.majorId) {
      swalConfig.error("Missing Information", "Please select semester and major");
      event.target.value = "";
      return;
    }

    try {
      setIsImportingFile(true);
      swalConfig.loading("Importing Students", "Processing file");

      // Validate semester and major IDs
      const semesterId = Number(studentUploadParams.semesterId);
      const majorId = Number(studentUploadParams.majorId);

      if (!semesterId || !majorId || isNaN(semesterId) || isNaN(majorId)) {
        swalConfig.error("Invalid Selection", "Please select valid semester and major");
        event.target.value = "";
        return;
      }

      // Validate file type
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      if (fileExtension !== "xlsx" && fileExtension !== "xls") {
        swalConfig.error("Invalid File Type", "Please upload Excel file (.xlsx or .xls)");
        event.target.value = "";
        return;
      }

      await studentsApi.importStudentGroups({
        semesterId,
        majorId,
        file,
      });

      // Refresh users list after successful upload
      const usersResponse = await authApi.getAllUsers();
      setUsers(mapUsersFromApi(usersResponse.data || []));

      swalConfig.success("Success", "Student data uploaded");
      closeUploadModal();
    } catch (error: any) {
      console.error("Error uploading student-group file:", error);

      const errorMessage = getSimpleErrorMessage(error, "Upload failed");
      swalConfig.error("Upload Failed", errorMessage);
    } finally {
      setIsImportingFile(false);
      event.target.value = "";
    }
  };

  const handleLecturerUploadFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImportingFile(true);
      swalConfig.loading("Importing Lecturers", "Processing file");

      await lecturersApi.importLecturers(file);
      swalConfig.success("Success", "Lecturer data uploaded");
      closeUploadModal();
    } catch (error: any) {
      console.error("Error uploading lecturer file:", error);
      swalConfig.error("Upload Failed", "Upload failed");
    } finally {
      setIsImportingFile(false);
      event.target.value = "";
    }
  };

  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  // Lấy thông tin user hiện tại đang login
  const currentUserInfo = useMemo(() => {
    // Thử lấy từ localStorage trước (cách chính)
    if (typeof window !== "undefined") {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          console.log("Current logged in user from localStorage:", user);
          return {
            userId: user.id || user.Id || user.userId || null,
            email: user.email || user.Email || null,
            name: user.fullName || user.FullName || user.name || null,
            role: user.role || user.Role || null,
          };
        }
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
      }
    }

    // Fallback: thử lấy từ authUtils (token)
    const userInfo = authUtils.getCurrentUserInfo();
    console.log("Current logged in user from token:", userInfo);
    return userInfo;
  }, []);

  // Kiểm tra xem user có phải là admin đang login chính mình không
  const isCurrentUserAdminSelf = (user: UserAccount): boolean => {
    // Kiểm tra role của user - phải là admin
    const isUserAdmin =
      user.roles?.some((r) => {
        const roleLower = r?.toLowerCase();
        return roleLower === "administrator" || roleLower === "admin";
      }) ||
      user.primaryRole?.toLowerCase() === "administrator" ||
      user.primaryRole?.toLowerCase() === "admin";

    if (!isUserAdmin) return false;

    // Kiểm tra xem có phải chính mình không
    // So sánh bằng userId
    if (currentUserInfo.userId) {
      const currentUserIdStr = String(currentUserInfo.userId).trim();
      const userToCheckIdStr = String(user.id).trim();
      if (currentUserIdStr === userToCheckIdStr) {
        console.log("Match by userId:", {
          currentUserIdStr,
          userToCheckIdStr,
          userEmail: user.email,
        });
        return true;
      }
    }

    // So sánh bằng email (case-insensitive)
    if (currentUserInfo.email && user.email) {
      const currentEmailLower = currentUserInfo.email.toLowerCase().trim();
      const userEmailLower = user.email.toLowerCase().trim();
      if (currentEmailLower === userEmailLower) {
        console.log("Match by email:", {
          currentEmailLower,
          userEmailLower,
          userId: user.id,
        });
        return true;
      }
    }

    return false;
  };

  return (
    <main className="page-container">
      <header className="section-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Account Management
          </h1>
          <p className="text-gray-500 text-sm">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-full border border-green-500 px-4 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50"
            onClick={() => setIsDownloadModalOpen(true)}
            type="button"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            className="flex items-center gap-2 rounded-full border border-purple-500 px-4 py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-50"
            onClick={() => {
              setIsUploadModalOpen(true);
              setUploadStep(null);
            }}
            type="button"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
          <button
            className="btn-gradient flex items-center gap-2"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create Account
          </button>
        </div>
      </header>

      {/* Account Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        {Object.entries(roleSummary).map(([key, value]) => (
          <div key={key} className="card-compact text-center">
            <div className="text-xs text-gray-500">{key}</div>
            <div className="text-lg font-semibold text-gray-800">{value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="input-search flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input-base border-none focus:ring-0"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input-base w-full md:w-52"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          {allRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card-base">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            User Accounts ({filteredUsers.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading users...</div>
        ) : (
          <table className="table-base w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge badge-info">
                      {user.roles.join(", ")}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        user.status === "Active"
                          ? "badge-success"
                          : "badge-error"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>{user.createdDate}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="btn-subtle p-1"
                        onClick={() => openEditModal(user)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="btn-subtle p-1 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          // Kiểm tra nếu là admin đang xóa chính mình, hiển thị alert
                          if (isCurrentUserAdminSelf(user)) {
                            swalConfig.error("Cannot Delete", "Cannot delete your own admin account");
                            return;
                          }
                          handleDeleteAccount(user.id);
                        }}
                        disabled={deletingUserId === user.id}
                        title={
                          deletingUserId === user.id ? "Deleting..." : "Delete"
                        }
                      >
                        {deletingUserId === user.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {filteredUsers.length > PAGE_SIZE && (
          <div className="flex items-center justify-center mt-4 flex-wrap gap-2">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNum = index + 1;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  className={`px-3 py-1 rounded-md text-sm ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "btn-subtle border border-gray-200"
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <footer className="page-footer">
        © 2025 AIDefCom - Smart Graduation Defense
      </footer>

      {/* Modals */}
      <CreateAccountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAccount}
      />
      <EditAccountModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleEditAccount}
        accountData={editingUser}
      />

      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Download className="w-5 h-5 text-green-500" />
                  Download Template
                </div>
                <p className="text-sm text-gray-500">
                  Select the type of template to download
                </p>
              </div>
              <button
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setIsDownloadModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDownloadStudentTemplate}
                disabled={isDownloadingStudentTemplate}
                className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-purple-600 to-[#7c3aed] px-5 py-4 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="w-4 h-4" />
                  {isDownloadingStudentTemplate
                    ? "Downloading..."
                    : "Student-Group Template"}
                </span>
                {isDownloadingStudentTemplate ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadLecturerTemplate}
                disabled={isDownloadingLecturerTemplate}
                className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-4 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <UserRound className="w-4 h-4" />
                  {isDownloadingLecturerTemplate
                    ? "Downloading..."
                    : "Lecturer Template"}
                </span>
                {isDownloadingLecturerTemplate ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Upload className="w-5 h-5 text-purple-500" />
                  Upload File
                </div>
                <p className="text-sm text-gray-500">
                  Select the type of data to upload
                </p>
              </div>
              <button
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                onClick={closeUploadModal}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadStep === null && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleStudentUploadClick}
                  className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-purple-600 to-[#7c3aed] px-5 py-4 text-white"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <GraduationCap className="w-4 h-4" />
                    Upload Student-Group File
                  </span>
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleLecturerUploadClick}
                  className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-4 text-white"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <UserRound className="w-4 h-4" />
                    Upload Lecturer File
                  </span>
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            )}

            {uploadStep === "student" && (
              <div className="space-y-4">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-700"
                  onClick={() => setUploadStep(null)}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Semester
                    </label>
                    <input
                      type="text"
                      value={
                        semesters.find(
                          (s) =>
                            s.id.toString() === studentUploadParams.semesterId
                        )?.semesterName
                          ? `${
                              semesters.find(
                                (s) =>
                                  s.id.toString() ===
                                  studentUploadParams.semesterId
                              )?.semesterName
                            } (${
                              semesters.find(
                                (s) =>
                                  s.id.toString() ===
                                  studentUploadParams.semesterId
                              )?.year
                            })`
                          : "No semester selected"
                      }
                      readOnly
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 cursor-not-allowed focus:outline-none"
                      placeholder="No semester selected"
                    />
                    {/* Hidden select to maintain form data */}
                    <select
                      value={studentUploadParams.semesterId}
                      onChange={(e) => {
                        const newSemesterId = e.target.value;
                        setStudentUploadParams((prev) => ({
                          ...prev,
                          semesterId: newSemesterId,
                          majorId: majors.length
                            ? String(majors[0].id)
                            : prev.majorId,
                        }));
                      }}
                      className="hidden"
                    >
                      {semesters.length === 0 && (
                        <option value="">No semester data</option>
                      )}
                      {semesters.map((semester) => (
                        <option key={semester.id} value={semester.id}>
                          {semester.semesterName} ({semester.year})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Major
                    </label>
                    <select
                      value={studentUploadParams.majorId}
                      onChange={(e) =>
                        setStudentUploadParams((prev) => ({
                          ...prev,
                          majorId: e.target.value,
                        }))
                      }
                      disabled={!majors.length || uploadMetaLoading}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-100"
                    >
                      {majors.length === 0 && (
                        <option value="">No major data</option>
                      )}
                      {majors.map((major) => (
                        <option key={major.id} value={major.id}>
                          {major.majorName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => studentFileInputRef.current?.click()}
                  className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-purple-600 to-[#7c3aed] px-5 py-4 text-white disabled:opacity-50"
                  disabled={
                    !studentUploadParams.semesterId ||
                    !studentUploadParams.majorId ||
                    uploadMetaLoading ||
                    !semesters.length ||
                    !majors.length ||
                    isImportingFile
                  }
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <GraduationCap className="w-4 h-4" />
                    Choose Student-Group File
                  </span>
                  {isImportingFile ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={studentFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleStudentUploadFileChange}
                />
              </div>
            )}

            {uploadStep === "lecturer" && (
              <div className="space-y-4">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-700"
                  onClick={() => setUploadStep(null)}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Upload an Excel file that contains lecturer information in the
                  provided template format.
                </p>
                <button
                  type="button"
                  onClick={() => lecturerFileInputRef.current?.click()}
                  className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-4 text-white"
                  disabled={isImportingFile}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <UserRound className="w-4 h-4" />
                    Choose Lecturer File
                  </span>
                  {isImportingFile ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={lecturerFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleLecturerUploadFileChange}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
