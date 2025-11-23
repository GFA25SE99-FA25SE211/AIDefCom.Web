"use client";

import React, { useState, useMemo, useEffect } from "react";
import AdminSidebar from "../dashboard/components/AdminSidebar";
import CreateAccountModal, {
  AccountFormData as CreateAccountData,
} from "../dashboard/components/CreateAccountModal";
import EditAccountModal, {
  AccountEditFormData,
} from "../dashboard/components/EditAccountModal";
import { Plus, Users, Search, Pencil, Trash2 } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { swalConfig } from "@/lib/utils/sweetAlert";

// --- Types ---
interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  createdDate: string;
}

const allRoles = [
  "All Roles",
  "Administrator",
  "Moderator",
  "Chair",
  "Member",
  "Secretary",
  "Student",
];

const PAGE_SIZE = 8;

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

        const apiUsers = (response.data || []).map((user: any) => ({
          id: user.id || user.Id || "",
          name:
            user.fullName ||
            user.FullName ||
            user.email ||
            user.Email ||
            "Unknown",
          email: user.email || user.Email || "",
          role: user.roles?.[0] || user.Roles?.[0] || "Student",
          status: "Active" as const,
          createdDate: new Date().toLocaleDateString("en-GB"),
        }));
        setUsers(apiUsers);
      } catch (error: any) {
        console.error("Error fetching users:", error);
        // Show user-friendly error message
        swalConfig.error(
          "Failed to Load Users",
          `${
            error.message || "Unknown error"
          }\n\nPlease check:\n1. Backend API is running at http://localhost:5015\n2. Check browser console for details`
        );
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const roleSummary = useMemo(() => {
    const counts: { [key: string]: number } = {
      Total: users.length,
      Admin: 0,
      Moderator: 0,
      Chair: 0,
      Member: 0,
      Secretary: 0,
      Student: 0,
    };
    users.forEach((user) => {
      if (user.role === "Administrator") counts.Admin++;
      else if (user.role === "Moderator") counts.Moderator++;
      else if (user.role === "Chair") counts.Chair++;
      else if (user.role === "Member") counts.Member++;
      else if (user.role === "Secretary") counts.Secretary++;
      else if (user.role === "Student") counts.Student++;
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
        selectedRole === "All Roles" || user.role === selectedRole;
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
        await authApi.assignRole(data.email, data.role);
      }

      // Refresh users list
      const usersResponse = await authApi.getAllUsers();
      const apiUsers = (usersResponse.data || []).map((user: any) => ({
        id: user.id || user.Id || "",
        name:
          user.fullName ||
          user.FullName ||
          user.email ||
          user.Email ||
          "Unknown",
        email: user.email || user.Email || "",
        role: user.roles?.[0] || user.Roles?.[0] || "Student",
        status: "Active" as const,
        createdDate: new Date().toLocaleDateString("en-GB"),
      }));
      setUsers(apiUsers);
      setIsCreateModalOpen(false);
      swalConfig.success("Success!", "Account created successfully!");
    } catch (error: any) {
      console.error("Error creating account:", error);

      // Enhanced error handling
      let errorMessage = "Failed to create account";
      if (error.response?.data?.errors) {
        // Handle validation errors
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(
            ([field, messages]) =>
              `${field}: ${(messages as string[]).join(", ")}`
          )
          .join("\n");
        errorMessage = `Validation errors:\n${errorMessages}`;
      } else if (error.response?.data?.title) {
        errorMessage = error.response.data.title;
      } else if (error.message) {
        errorMessage = error.message;
      }

      swalConfig.error("Error Creating Account", errorMessage);
    }
  };

  const handleEditAccount = async (
    id: number | string,
    data: AccountEditFormData
  ) => {
    try {
      // Update role if changed
      if (data.role) {
        await authApi.assignRole(data.email, data.role);
      }

      // Refresh users list
      const response = await authApi.getAllUsers();
      const apiUsers = (response.data || []).map((user: any) => ({
        id: user.id,
        name: user.fullName || user.email,
        email: user.email,
        role: user.roles?.[0] || "Student",
        status: "Active" as const,
        createdDate: new Date().toLocaleDateString("en-GB"),
      }));
      setUsers(apiUsers);
      setIsEditModalOpen(false);
      setEditingUser(null);
      swalConfig.success("Success!", "Account updated successfully!");
    } catch (error: any) {
      console.error("Error updating account:", error);
      swalConfig.error(
        "Error Updating Account",
        error.message || "Failed to update account"
      );
    }
  };

  const handleDeleteAccount = async (id: number | string) => {
    const user = users.find((u) => u.id === id);
    if (!user) {
      swalConfig.error("Error", "User not found!");
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
        swalConfig.success("Deleted!", "Account deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting account:", error);

        // Provide more detailed error information
        let errorMessage = "Failed to delete account";
        if (error?.message) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else {
          errorMessage = "Unknown error occurred while deleting account";
        }

        // Check if it's a network error
        if (
          errorMessage.includes("Failed to fetch") ||
          errorMessage.includes("Network error")
        ) {
          errorMessage =
            "Cannot connect to server. Please check if the backend API is running at http://localhost:5015";
        }

        swalConfig.error(
          "Error Deleting Account",
          `${errorMessage}\n\nUser: ${user.name} (${user.email})`
        );
      } finally {
        setDeletingUserId(null);
      }
    }
  };

  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
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
        <button
          className="btn-gradient flex items-center gap-2"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Create Account
        </button>
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
                    <span className="badge badge-info">{user.role}</span>
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
                        onClick={() => handleDeleteAccount(user.id)}
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
      <button className="help-btn">?</button>

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
    </main>
  );
}
