"use client";

import React, { useState } from "react";

import AddCouncilModal from "../create-sessions/components/AddCouncilModal";
import AddGroupModal from "../create-sessions/components/AddGroupModal";
import AddStudentModal from "../create-sessions/components/AddStudentModal";
import TranscriptDetailModal from "../create-sessions/components/TranscriptDetailModal";
import ReportDetailModal from "../create-sessions/components/ReportDetailModal";
import EditCouncilModal from "../create-sessions/components/EditCouncilModal";
import EditGroupModal from "../create-sessions/components/EditGroupModal";
import EditStudentModal from "../create-sessions/components/EditStudentModal";
import EditSessionModal from "../create-sessions/components/EditSessionModal";

// --- Icons (kept minimal) ---
const AddIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);
const EditIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.8 19.315l-1.8.5.5-1.8L16.862 4.487z"
    />
  </svg>
);
const DeleteIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 7.5h12M9.75 7.5v9m4.5-9v9M4.5 7.5h15M10 4.5h4"
    />
  </svg>
);
const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="w-4 h-4 text-gray-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-4.5-4.5M5.25 10.5A5.25 5.25 0 1010.5 15.75 5.25 5.25 0 005.25 10.5z"
    />
  </svg>
);

// Types (kept)
type Council = {
  id: number;
  description: string;
  createdDate: string;
  status: "Active" | "Inactive";
};
type Group = {
  id: number;
  topicEN: string;
  topicVN: string;
  semester: string;
  status: "Active" | "Completed" | "Pending";
};
type Student = {
  id: number;
  userId: string;
  groupId: number;
  dob: string;
  gender: string;
  role: "Leader" | "Member";
};
type Session = {
  id: number;
  groupId: number;
  location: string;
  date: string;
  time: string;
  status: "Scheduled" | "Completed";
};
type Transcript = {
  id: number;
  sessionId: number;
  createdAt: string;
  status: "Pending" | "Approved" | "Rejected";
  isApproved: boolean;
  groupName: string;
  date: string;
  time: string;
  location: string;
  transcriptText: string;
  audioFile: string;
};
type Report = {
  id: number;
  sessionId: number;
  generatedDate: string;
  summary: string;
  filePath: string;
};

type TabKey =
  | "councils"
  | "groups"
  | "students"
  | "sessions"
  | "transcripts"
  | "reports";
const tabs: { key: TabKey; label: string }[] = [
  { key: "councils", label: "Councils" },
  { key: "groups", label: "Groups" },
  { key: "students", label: "Students" },
  { key: "sessions", label: "Sessions" },
  { key: "transcripts", label: "Transcripts" },
  { key: "reports", label: "Reports" },
];

export default function DataManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("councils");
  const [isAddCouncilModalOpen, setIsAddCouncilModalOpen] = useState(false);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  const [selectedTranscript, setSelectedTranscript] =
    useState<Transcript | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [editingCouncil, setEditingCouncil] = useState<Council | null>(null);
  const [isEditCouncilModalOpen, setIsEditCouncilModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);

  // Dummy data
  const [councils, setCouncils] = useState<Council[]>([
    {
      id: 1,
      description: "AI Defense Council - Fall 2025",
      createdDate: "2025-01-01",
      status: "Active",
    },
    {
      id: 2,
      description: "Software Engineering Council - Spring 2025",
      createdDate: "2025-01-05",
      status: "Active",
    },
  ]);
  const [groups, setGroups] = useState<Group[]>([
    {
      id: 1,
      topicEN: "AI-Based Recommendation System",
      topicVN: "Hệ thống Gợi ý dựa trên AI",
      semester: "SEM001",
      status: "Active",
    },
    {
      id: 2,
      topicEN: "Blockchain for Healthcare",
      topicVN: "Blockchain cho Y tế",
      semester: "SEM001",
      status: "Active",
    },
  ]);
  const [students, setStudents] = useState<Student[]>([
    {
      id: 1,
      userId: "U001",
      groupId: 1,
      dob: "2003-05-15",
      gender: "Male",
      role: "Leader",
    },
    {
      id: 2,
      userId: "U002",
      groupId: 1,
      dob: "2003-08-20",
      gender: "Female",
      role: "Member",
    },
  ]);
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: 1,
      groupId: 1,
      location: "Room A-301",
      date: "2025-01-15",
      time: "09:00 - 11:00",
      status: "Scheduled",
    },
  ]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([
    {
      id: 1,
      sessionId: 1,
      createdAt: "2025-01-15",
      status: "Pending",
      isApproved: false,
      groupName: "Group 1",
      date: "January 15, 2025",
      time: "09:00 - 11:00",
      location: "Room A-301",
      transcriptText: "[00:00:15] Chair: Good morning everyone...",
      audioFile: "/audio/session1.mp3",
    },
  ]);
  const [reports] = useState<Report[]>([
    {
      id: 1,
      sessionId: 1,
      generatedDate: "2025-01-15",
      summary: "Excellent presentation",
      filePath: "/reports/session1.pdf",
    },
  ]);

  // Handlers (kept)
  const handleAddCouncil = (data: {
    description: string;
    isActive: boolean;
  }) => {
    setCouncils([
      ...councils,
      {
        id: Date.now(),
        description: data.description,
        createdDate: new Date().toISOString().split("T")[0],
        status: data.isActive ? "Active" : "Inactive",
      },
    ]);
    setIsAddCouncilModalOpen(false);
  };
  const handleAddGroup = (data: {
    topicEN: string;
    topicVN: string;
    semesterId: string;
    status: string;
  }) => {
    setGroups([
      ...groups,
      {
        id: Date.now(),
        topicEN: data.topicEN,
        topicVN: data.topicVN,
        semester: data.semesterId,
        status: data.status as Group["status"],
      },
    ]);
    setIsAddGroupModalOpen(false);
  };
  const handleAddStudent = (data: {
    userId: string;
    groupId: string;
    dob: string;
    gender: string;
    role: string;
  }) => {
    setStudents([
      ...students,
      {
        id: Date.now(),
        userId: data.userId,
        groupId: parseInt(data.groupId, 10) || 0,
        dob: data.dob,
        gender: data.gender,
        role: data.role as Student["role"],
      },
    ]);
    setIsAddStudentModalOpen(false);
  };
  const handleEditCouncil = (
    id: number,
    data: { description: string; isActive: boolean }
  ) => {
    setCouncils((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              description: data.description,
              status: data.isActive ? "Active" : "Inactive",
            }
          : c
      )
    );
    setIsEditCouncilModalOpen(false);
    setEditingCouncil(null);
  };
  const handleEditGroup = (
    id: number,
    data: {
      topicEN: string;
      topicVN: string;
      semesterId: string;
      status: string;
    }
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              topicEN: data.topicEN,
              topicVN: data.topicVN,
              semester: data.semesterId,
              status: data.status as Group["status"],
            }
          : g
      )
    );
    setIsEditGroupModalOpen(false);
    setEditingGroup(null);
  };
  const handleEditStudent = (
    id: number,
    data: {
      userId: string;
      groupId: string;
      dob: string;
      gender: string;
      role: string;
    }
  ) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              userId: data.userId,
              groupId: parseInt(data.groupId, 10) || s.groupId,
              dob: data.dob,
              gender: data.gender,
              role: data.role as Student["role"],
            }
          : s
      )
    );
    setIsEditStudentModalOpen(false);
    setEditingStudent(null);
  };
  const handleEditSession = (
    id: number,
    data: {
      groupId: string;
      location: string;
      date: string;
      time: string;
      status: string;
    }
  ) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              groupId: parseInt(data.groupId, 10) || s.groupId,
              location: data.location,
              date: data.date,
              time: data.time,
              status: data.status as Session["status"],
            }
          : s
      )
    );
    setIsEditSessionModalOpen(false);
    setEditingSession(null);
  };

  const handleApproveTranscript = (id: number) => {
    setTranscripts((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "Approved", isApproved: true } : t
      )
    );
    setSelectedTranscript(null);
  };
  const handleRejectTranscript = (id: number) => {
    setTranscripts((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "Rejected", isApproved: false } : t
      )
    );
    setSelectedTranscript(null);
  };
  const handleDownloadReport = (filePath: string) => {
    // simulate download
    alert(`Simulating download: ${filePath}`);
  };

  // Render helpers (UI only)
  const renderCouncilsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Council Management
        </h2>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm"
          onClick={() => setIsAddCouncilModalOpen(true)}
        >
          <AddIcon /> Add Council
        </button>
      </div>

      <div className="flex items-center mb-4">
        <div className="relative w-72">
          <div className="absolute left-3 top-2">
            <SearchIcon />
          </div>
          <input
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search councils..."
          />
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-gray-600 text-xs uppercase">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {councils.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{c.id}</td>
                <td className="px-3 py-2">{c.description}</td>
                <td className="px-3 py-2">{c.createdDate}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      c.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="inline-flex gap-2">
                    <button
                      className="p-2 rounded-md hover:bg-gray-100"
                      onClick={() => {
                        setEditingCouncil(c);
                        setIsEditCouncilModalOpen(true);
                      }}
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="p-2 rounded-md hover:bg-gray-100"
                      title="Delete"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGroupsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Group Management
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm"
            onClick={() => setIsAddGroupModalOpen(true)}
          >
            <AddIcon /> Add Group
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative w-96">
          <div className="absolute left-3 top-2">
            <SearchIcon />
          </div>
          <input
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search groups..."
          />
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 text-xs uppercase">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Topic (EN)</th>
              <th className="px-3 py-2">Topic (VN)</th>
              <th className="px-3 py-2">Semester</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{g.id}</td>
                <td className="px-3 py-2">{g.topicEN}</td>
                <td className="px-3 py-2">{g.topicVN}</td>
                <td className="px-3 py-2">{g.semester}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      g.status === "Active"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {g.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="inline-flex gap-2">
                    <button
                      className="p-2 rounded-md hover:bg-gray-100"
                      onClick={() => {
                        setEditingGroup(g);
                        setIsEditGroupModalOpen(true);
                      }}
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="p-2 rounded-md hover:bg-gray-100"
                      title="Delete"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStudentsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Student Management
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm"
            onClick={() => setIsAddStudentModalOpen(true)}
          >
            <AddIcon /> Add Student
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative w-96">
          <div className="absolute left-3 top-2">
            <SearchIcon />
          </div>
          <input
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search students..."
          />
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 text-xs uppercase">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">User ID</th>
              <th className="px-3 py-2">Group ID</th>
              <th className="px-3 py-2">DOB</th>
              <th className="px-3 py-2">Gender</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{s.id}</td>
                <td className="px-3 py-2">{s.userId}</td>
                <td className="px-3 py-2">{s.groupId}</td>
                <td className="px-3 py-2">{s.dob}</td>
                <td className="px-3 py-2">{s.gender}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    {s.role}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="inline-flex gap-2">
                    <button
                      className="p-2 rounded-md hover:bg-gray-100"
                      onClick={() => {
                        setEditingStudent(s);
                        setIsEditStudentModalOpen(true);
                      }}
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="p-2 rounded-md hover:bg-gray-100"
                      title="Delete"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // sessions / transcripts / reports reuse same styling
  const renderSessionsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Defense Session Management
        </h2>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 text-xs uppercase">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Group ID</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{s.id}</td>
                <td className="px-3 py-2">{s.groupId}</td>
                <td className="px-3 py-2">{s.location}</td>
                <td className="px-3 py-2">{s.date}</td>
                <td className="px-3 py-2">{s.time}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-1 rounded-full text-xs bg-yellow-50 text-yellow-700">
                    {s.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="inline-flex gap-2">
                    <button
                      className="p-2 rounded-md hover:bg-gray-100"
                      onClick={() => {
                        setEditingSession(s);
                        setIsEditSessionModalOpen(true);
                      }}
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="p-2 rounded-md hover:bg-gray-100"
                      title="Delete"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTranscriptsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Transcript Management
        </h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Transcripts are automatically generated from defense sessions. You can
        view and approve them here.
      </p>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 text-xs uppercase">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Session ID</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Approved</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transcripts.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{t.id}</td>
                <td className="px-3 py-2">{t.sessionId}</td>
                <td className="px-3 py-2">{t.createdAt}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      t.status === "Pending"
                        ? "bg-yellow-50 text-yellow-700"
                        : t.status === "Approved"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2">{t.isApproved ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm"
                    onClick={() => setSelectedTranscript(t)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReportsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Report Management
        </h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Reports are generated after defense sessions. You can download and view
        them here.
      </p>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 text-xs uppercase">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Session ID</th>
              <th className="px-3 py-2">Generated</th>
              <th className="px-3 py-2">Summary</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.sessionId}</td>
                <td className="px-3 py-2">{r.generatedDate}</td>
                <td className="px-3 py-2">{r.summary}</td>
                <td className="px-3 py-2 text-center">
                  <div className="inline-flex gap-2">
                    <button
                      className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm"
                      onClick={() => setSelectedReport(r)}
                    >
                      View
                    </button>
                    <button
                      className="px-3 py-1 rounded-md border text-sm"
                      onClick={() => handleDownloadReport(r.filePath)}
                    >
                      Download
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex">
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">
            Data Management
          </h1>
          <p className="text-sm text-gray-500">
            Manage councils, groups, students, sessions, transcripts, and
            reports
          </p>
        </header>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === t.key
                  ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow"
                  : "bg-white border text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === "councils" && renderCouncilsTable()}
          {activeTab === "groups" && renderGroupsTable()}
          {activeTab === "students" && renderStudentsTable()}
          {activeTab === "sessions" && renderSessionsTable()}
          {activeTab === "transcripts" && renderTranscriptsTable()}
          {activeTab === "reports" && renderReportsTable()}
        </div>

        <footer className="mt-8 text-center text-sm text-gray-400">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>
      </main>

      {/* Modals */}
      <AddCouncilModal
        isOpen={isAddCouncilModalOpen}
        onClose={() => setIsAddCouncilModalOpen(false)}
        onSubmit={handleAddCouncil}
      />
      <AddGroupModal
        isOpen={isAddGroupModalOpen}
        onClose={() => setIsAddGroupModalOpen(false)}
        onSubmit={handleAddGroup}
      />
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSubmit={handleAddStudent}
      />

      <EditCouncilModal
        isOpen={isEditCouncilModalOpen}
        onClose={() => {
          setIsEditCouncilModalOpen(false);
          setEditingCouncil(null);
        }}
        onSubmit={handleEditCouncil}
        councilData={editingCouncil}
      />
      <EditGroupModal
        isOpen={isEditGroupModalOpen}
        onClose={() => {
          setIsEditGroupModalOpen(false);
          setEditingGroup(null);
        }}
        onSubmit={handleEditGroup}
        groupData={editingGroup}
      />
      <EditStudentModal
        isOpen={isEditStudentModalOpen}
        onClose={() => {
          setIsEditStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={handleEditStudent}
        studentData={editingStudent}
      />
      <EditSessionModal
        isOpen={isEditSessionModalOpen}
        onClose={() => {
          setIsEditSessionModalOpen(false);
          setEditingSession(null);
        }}
        onSubmit={handleEditSession}
        sessionData={editingSession}
      />

      <TranscriptDetailModal
        isOpen={!!selectedTranscript}
        onClose={() => setSelectedTranscript(null)}
        transcript={selectedTranscript}
        onApprove={handleApproveTranscript}
        onReject={handleRejectTranscript}
      />
      <ReportDetailModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
        onDownload={handleDownloadReport}
      />
    </div>
  );
}
