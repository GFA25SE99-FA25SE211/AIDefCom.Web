"use client";

import React, { useState, useMemo } from "react";
import AdminSidebar from "../dashboard/components/AdminSidebar";
import CreateAccountModal, {
  AccountFormData as CreateAccountData,
} from "../dashboard/components/CreateAccountModal";
import EditAccountModal, {
  AccountEditFormData,
} from "../dashboard/components/EditAccountModal";
import { Plus, Users, Search, Pencil, Trash2 } from "lucide-react";

// --- Types ---
interface UserAccount {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: "Active" | "Inactive";
  createdDate: string;
}

// --- Dummy Data ---
const initialUsers: UserAccount[] = [
  {
    id: 1,
    name: "Dr. Nguyen Van A",
    email: "nguyenvana@university.edu",
    role: "Chair",
    department: "Computer Science",
    status: "Active",
    createdDate: "15/1/2024",
  },
  {
    id: 2,
    name: "Dr. Tran Thi B",
    email: "tranthib@university.edu",
    role: "Member",
    department: "Software Engineering",
    status: "Active",
    createdDate: "20/1/2024",
  },
  {
    id: 3,
    name: "MSc. Pham Thi D",
    email: "phamthid@university.edu",
    role: "Secretary",
    department: "Computer Science",
    status: "Active",
    createdDate: "1/2/2024",
  },
  {
    id: 4,
    name: "John Smith",
    email: "johnsmith@student.edu",
    role: "Student",
    department: "Computer Science",
    status: "Active",
    createdDate: "1/9/2024",
  },
  {
    id: 5,
    name: "Admin User",
    email: "admin@university.edu",
    role: "Administrator",
    department: "IT Department",
    status: "Active",
    createdDate: "1/1/2023",
  },
];

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
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

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

  const handleCreateAccount = (data: CreateAccountData) => {
    const newUser: UserAccount = {
      id: Date.now(),
      name: data.fullName,
      email: data.email,
      role: data.role,
      department: data.department,
      status: "Active",
      createdDate: new Date().toLocaleDateString("en-GB"),
    };
    setUsers([...users, newUser]);
    setIsCreateModalOpen(false);
    alert("Account created!");
  };

  const handleEditAccount = (
    id: number | string,
    data: AccountEditFormData
  ) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === id
          ? {
              ...user,
              name: data.fullName,
              email: data.email,
              role: data.role,
              department: data.department,
            }
          : user
      )
    );
    setIsEditModalOpen(false);
    setEditingUser(null);
    alert("Account updated!");
  };

  const handleDeleteAccount = (id: number | string) => {
    if (window.confirm(`Are you sure you want to delete user ID ${id}?`)) {
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
      alert("Account deleted!");
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
