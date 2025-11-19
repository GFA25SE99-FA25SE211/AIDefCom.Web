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

// --- Types ---
interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
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

export default function AccountManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

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
          name: user.fullName || user.FullName || user.email || user.Email || "Unknown",
          email: user.email || user.Email || "",
          role: user.roles?.[0] || user.Roles?.[0] || "Student",
          department: "N/A",
          status: "Active" as const,
          createdDate: new Date().toLocaleDateString("en-GB"),
        }));
        setUsers(apiUsers);
      } catch (error: any) {
        console.error("Error fetching users:", error);
        // Show user-friendly error message
        alert(`Failed to load users: ${error.message || "Unknown error"}\n\nPlease check:\n1. Backend API is running at http://localhost:5015\n2. Check browser console for details`);
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

  const handleCreateAccount = async (data: CreateAccountData) => {
    try {
      await authApi.createAccount({
      email: data.email,
        password: "DefaultPassword123!", // Default password, user should change on first login
        fullName: data.fullName,
        phoneNumber: "", // Optional field, can be updated later
      });
      
      if (data.role && data.role !== "Student") {
        await authApi.assignRole(data.email, data.role);
      }

      // Refresh users list
      const response = await authApi.getAllUsers();
      const apiUsers = (response.data || []).map((user: any) => ({
        id: user.id,
        name: user.fullName || user.email,
        email: user.email,
        role: user.roles?.[0] || "Student",
        department: "N/A",
        status: "Active" as const,
      createdDate: new Date().toLocaleDateString("en-GB"),
      }));
      setUsers(apiUsers);
    setIsCreateModalOpen(false);
      alert("Account created successfully!");
    } catch (error: any) {
      console.error("Error creating account:", error);
      alert(`Error: ${error.message || "Failed to create account"}`);
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
        department: "N/A",
        status: "Active" as const,
        createdDate: new Date().toLocaleDateString("en-GB"),
      }));
      setUsers(apiUsers);
    setIsEditModalOpen(false);
    setEditingUser(null);
      alert("Account updated successfully!");
    } catch (error: any) {
      console.error("Error updating account:", error);
      alert(`Error: ${error.message || "Failed to update account"}`);
    }
  };

  const handleDeleteAccount = async (id: number | string) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;

    if (window.confirm(`Are you sure you want to delete account ${user.email}?`)) {
      try {
        await authApi.softDeleteAccount(user.email);
        setUsers((prevUsers) => prevUsers.filter((u) => u.id !== id));
        alert("Account deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting account:", error);
        alert(`Error: ${error.message || "Failed to delete account"}`);
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
              <th>Department</th>
              <th>Status</th>
              <th>Created</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className="badge badge-info">{user.role}</span>
                </td>
                <td>{user.department}</td>
                <td>
                  <span
                    className={`badge ${
                      user.status === "Active" ? "badge-success" : "badge-error"
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
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-400">
                  No accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
