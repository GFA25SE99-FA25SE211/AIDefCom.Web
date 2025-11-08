"use client";

import React, { useState, useMemo } from "react";
import AdminSidebar from "../dashboard/components/AdminSidebar";

// Import các Modal đã tạo:
import AddTaskModal from "../dashboard/components/AddTaskModal";
import EditTaskModal from "../dashboard/components/EditTaskModal";
import AddSemesterModal from "../dashboard/components/AddSemesterModal";
import EditSemesterModal from "../dashboard/components/EditSemesterModal";
import AddMajorModal from "../dashboard/components/AddMajorModal";
import EditMajorModal from "../dashboard/components/EditMajorModal";
import AddRubricModal from "../dashboard/components/AddRubricModal";
import EditRubricModal from "../dashboard/components/EditRubricModal";

import {
  ClipboardList,
  Calendar,
  GraduationCap,
  ListChecks,
  BookOpen,
  StickyNote,
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

/* ======================== TYPES ======================== */
interface Task {
  id: number;
  title: string;
  description: string;
  assignedBy: string;
  assignedTo: string;
  status: "Pending" | "Completed" | "Inprogress";
}
interface Semester {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  majorID: string;
}
interface Major {
  id: string;
  name: string;
  description: string;
}
interface Score {
  id: number;
  studentID: string;
  rubricID: string;
  score: number;
  sessionID: number;
}
interface Rubric {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}
interface Note {
  id: number;
  userID: string;
  groupID: number;
  content: string;
  createdAt: string;
}
interface Assignment {
  id: number;
  userID: string;
  councilID: number;
  sessionID: number;
  role: "Chair" | "Member";
}

type AdminTabKey =
  | "tasks"
  | "semesters"
  | "majors"
  | "scores"
  | "rubrics"
  | "notes"
  | "assignments";

/* ======================== TABS ======================== */
const adminTabs: {
  key: AdminTabKey;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { key: "tasks", label: "Tasks", icon: ClipboardList },
  { key: "semesters", label: "Semesters", icon: Calendar },
  { key: "majors", label: "Majors", icon: GraduationCap },
  { key: "scores", label: "Scores", icon: ListChecks },
  { key: "rubrics", label: "Rubrics", icon: BookOpen },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "assignments", label: "Assignments", icon: Users },
];

export default function AdminDataManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTabKey>("tasks");

  // --- Modal states ---
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddSemesterModalOpen, setIsAddSemesterModalOpen] = useState(false);
  const [isAddMajorModalOpen, setIsAddMajorModalOpen] = useState(false);
  const [isAddRubricModalOpen, setIsAddRubricModalOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);

  /* ============ Dummy data ============ */
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: "Review defense session reports",
      description: "Review and approve all reports from January sessions",
      assignedBy: "Admin",
      assignedTo: "Secretary",
      status: "Pending",
    },
    {
      id: 2,
      title: "Update council assignments",
      description: "Assign new members to AI Council",
      assignedBy: "Admin",
      assignedTo: "Moderator",
      status: "Completed",
    },
  ]);
  const [semesters, setSemesters] = useState<Semester[]>([
    {
      id: "SEM001",
      name: "Fall 2025",
      year: 2025,
      startDate: "2025-08-01",
      endDate: "2025-12-20",
      majorID: "CS001",
    },
    {
      id: "SEM002",
      name: "Spring 2025",
      year: 2025,
      startDate: "2025-01-10",
      endDate: "2025-05-30",
      majorID: "CS001",
    },
  ]);
  const [majors, setMajors] = useState<Major[]>([
    {
      id: "CS001",
      name: "Computer Science",
      description: "Bachelor of Computer Science program",
    },
    {
      id: "SE001",
      name: "Software Engineering",
      description: "Bachelor of Software Engineering program",
    },
  ]);
  const [scores] = useState<Score[]>([
    { id: 1, studentID: "U001", rubricID: "R001", score: 8.5, sessionID: 1 },
    { id: 2, studentID: "U002", rubricID: "R002", score: 9.0, sessionID: 1 },
  ]);
  const [rubrics, setRubrics] = useState<Rubric[]>([
    {
      id: "R001",
      name: "Presentation Skills",
      description: "Evaluates presentation delivery and clarity",
      createdAt: "2024-12-01",
    },
    {
      id: "R002",
      name: "Technical Knowledge",
      description: "Evaluates depth of technical understanding",
      createdAt: "2024-12-01",
    },
  ]);
  const [notes] = useState<Note[]>([
    {
      id: 1,
      userID: "U001",
      groupID: 1,
      content: "Strong project concept, needs more testing",
      createdAt: "2025-01-14",
    },
  ]);
  const [assignments, setAssignments] = useState<Assignment[]>([
    { id: 1, userID: "U001", councilID: 1, sessionID: 1, role: "Chair" },
    { id: 2, userID: "U002", councilID: 1, sessionID: 1, role: "Member" },
  ]);

  /* ============ Filters ============ */
  const getFilteredData = (
    data: any[],
    keys: string[],
    currentQuery: string
  ) => {
    if (!currentQuery) return data;
    const q = currentQuery.toLowerCase();
    return data.filter((item) =>
      keys.some((k) =>
        String(item[k] || "")
          .toLowerCase()
          .includes(q)
      )
    );
  };

  const filteredTasks = useMemo(
    () =>
      getFilteredData(
        tasks,
        ["title", "description", "assignedTo"],
        searchQuery
      ),
    [tasks, searchQuery]
  );
  const filteredSemesters = useMemo(
    () => getFilteredData(semesters, ["name", "year", "majorID"], searchQuery),
    [semesters, searchQuery]
  );
  const filteredMajors = useMemo(
    () => getFilteredData(majors, ["name", "description"], searchQuery),
    [majors, searchQuery]
  );
  const filteredRubrics = useMemo(
    () => getFilteredData(rubrics, ["name", "description"], searchQuery),
    [rubrics, searchQuery]
  );
  const filteredAssignments = useMemo(
    () => getFilteredData(assignments, ["userID", "role"], searchQuery),
    [assignments, searchQuery]
  );

  /* ============ CRUD Handlers (unchanged logic) ============ */
  const handleAddTask = (data: Omit<Task, "id" | "assignedBy">) => {
    setTasks([...tasks, { ...data, id: Date.now(), assignedBy: "Admin" }]);
    setIsAddTaskModalOpen(false);
  };
  const handleEditTask = (
    id: number,
    data: Omit<Task, "id" | "assignedBy">
  ) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, ...data } : t)));
    setEditingTask(null);
  };
  const handleDeleteTask = (id: number) =>
    window.confirm(`Delete Task ${id}?`) &&
    setTasks(tasks.filter((t) => t.id !== id));

  const handleAddSemester = (data: Omit<Semester, "id">) => {
    const newSem: Semester = {
      ...data,
      id: `SEM${Math.floor(Math.random() * 999)}`,
    };
    setSemesters([...semesters, newSem]);
    setIsAddSemesterModalOpen(false);
  };
  const handleEditSemester = (id: string, data: Omit<Semester, "id">) => {
    setSemesters(semesters.map((s) => (s.id === id ? { ...s, ...data } : s)));
    setEditingSemester(null);
  };
  const handleDeleteSemester = (id: string) =>
    window.confirm(`Delete Semester ${id}?`) &&
    setSemesters(semesters.filter((s) => s.id !== id));

  const handleAddMajor = (data: Omit<Major, "id">) => {
    const newMajor: Major = {
      ...data,
      id:
        data.name.slice(0, 2).toUpperCase() + Math.floor(Math.random() * 1000),
    };
    setMajors([...majors, newMajor]);
    setIsAddMajorModalOpen(false);
  };
  const handleEditMajor = (id: string, data: Omit<Major, "id">) => {
    setMajors(majors.map((m) => (m.id === id ? { ...m, ...data } : m)));
    setEditingMajor(null);
  };
  const handleDeleteMajor = (id: string) =>
    window.confirm(`Delete Major ${id}?`) &&
    setMajors(majors.filter((m) => m.id !== id));

  const handleAddRubric = (data: Omit<Rubric, "id" | "createdAt">) => {
    setRubrics([
      ...rubrics,
      {
        ...data,
        id: `R${Math.floor(Math.random() * 999)}`,
        createdAt: new Date().toISOString().split("T")[0],
      },
    ]);
    setIsAddRubricModalOpen(false);
  };
  const handleEditRubric = (
    id: string,
    data: Omit<Rubric, "id" | "createdAt">
  ) => {
    setRubrics(rubrics.map((r) => (r.id === id ? { ...r, ...data } : r)));
    setEditingRubric(null);
  };
  const handleDeleteRubric = (id: string) =>
    window.confirm(`Delete Rubric ${id}?`) &&
    setRubrics(rubrics.filter((r) => r.id !== id));

  const handleDeleteAssignment = (id: number) =>
    window.confirm(`Delete assignment ${id}?`) &&
    setAssignments(assignments.filter((a) => a.id !== id));

  /* ============ Renderers ============ */
  const renderHeader = (title: string, onAdd?: () => void) => (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {onAdd && (
        <button
          onClick={onAdd}
          className="btn-gradient flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      )}
    </div>
  );

  const renderSearch = (placeholder: string) => (
    <div className="input-search mb-4 w-full md:w-80">
      <Search className="w-4 h-4" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );

  const renderTable = (headers: string[], rows: React.ReactNode) => (
    <div className="card-base mt-2">
      <table className="table-base w-full">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );

  /* ======================== MAIN RETURN ======================== */
  return (
    <main className="page-container">
      <header className="section-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            System Data Management
          </h1>
          <p className="text-gray-500 text-sm">
            Manage tasks, semesters, majors, scores, rubrics, and system data
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {adminTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 border transition ${
              activeTab === tab.key
                ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tables */}
      {activeTab === "tasks" &&
        renderHeader("Task Management", () => setIsAddTaskModalOpen(true)) &&
        renderSearch("Search tasks...") &&
        renderTable(
          [
            "ID",
            "Title",
            "Description",
            "Assigned By",
            "Assigned To",
            "Status",
            "Actions",
          ],
          filteredTasks.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.title}</td>
              <td>{t.description}</td>
              <td>{t.assignedBy}</td>
              <td>{t.assignedTo}</td>
              <td>
                <span
                  className={`badge ${
                    t.status === "Completed"
                      ? "badge-success"
                      : t.status === "Pending"
                      ? "badge-warning"
                      : "badge-info"
                  }`}
                >
                  {t.status}
                </span>
              </td>
              <td className="text-right">
                <div className="flex gap-2 justify-end">
                  <button
                    className="btn-subtle"
                    onClick={() => setEditingTask(t)}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-subtle text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteTask(t.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}

      {activeTab === "semesters" &&
        renderHeader("Semester Management", () =>
          setIsAddSemesterModalOpen(true)
        ) &&
        renderSearch("Search semesters...") &&
        renderTable(
          ["ID", "Name", "Year", "Start", "End", "Major ID", "Actions"],
          filteredSemesters.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td>{s.year}</td>
              <td>{s.startDate}</td>
              <td>{s.endDate}</td>
              <td>{s.majorID}</td>
              <td className="text-right">
                <div className="flex gap-2 justify-end">
                  <button
                    className="btn-subtle"
                    onClick={() => setEditingSemester(s)}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-subtle text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteSemester(s.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}

      {activeTab === "majors" &&
        renderHeader("Major Management", () => setIsAddMajorModalOpen(true)) &&
        renderSearch("Search majors...") &&
        renderTable(
          ["ID", "Major Name", "Description", "Actions"],
          filteredMajors.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.name}</td>
              <td>{m.description}</td>
              <td className="text-right">
                <div className="flex gap-2 justify-end">
                  <button
                    className="btn-subtle"
                    onClick={() => setEditingMajor(m)}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-subtle text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteMajor(m.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}

      {activeTab === "scores" &&
        renderHeader("Score Management") &&
        renderTable(
          ["ID", "Student ID", "Rubric ID", "Score", "Session ID"],
          scores.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.studentID}</td>
              <td>{s.rubricID}</td>
              <td>{s.score}</td>
              <td>{s.sessionID}</td>
            </tr>
          ))
        )}

      {activeTab === "rubrics" &&
        renderHeader("Rubric Management", () =>
          setIsAddRubricModalOpen(true)
        ) &&
        renderSearch("Search rubrics...") &&
        renderTable(
          ["ID", "Rubric Name", "Description", "Created At", "Actions"],
          filteredRubrics.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.name}</td>
              <td>{r.description}</td>
              <td>{r.createdAt}</td>
              <td className="text-right">
                <div className="flex gap-2 justify-end">
                  <button
                    className="btn-subtle"
                    onClick={() => setEditingRubric(r)}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-subtle text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteRubric(r.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}

      {activeTab === "notes" &&
        renderHeader("Member Notes") &&
        renderTable(
          ["ID", "User ID", "Group ID", "Note Content", "Created At"],
          notes.map((n) => (
            <tr key={n.id}>
              <td>{n.id}</td>
              <td>{n.userID}</td>
              <td>{n.groupID}</td>
              <td>{n.content}</td>
              <td>{n.createdAt}</td>
            </tr>
          ))
        )}

      {activeTab === "assignments" &&
        renderHeader("Committee Assignments") &&
        renderTable(
          ["ID", "User ID", "Council ID", "Session ID", "Role", "Actions"],
          filteredAssignments.map((a) => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>{a.userID}</td>
              <td>{a.councilID}</td>
              <td>{a.sessionID}</td>
              <td>{a.role}</td>
              <td className="text-right">
                <button
                  className="btn-subtle text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteAssignment(a.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))
        )}

      <footer className="page-footer">
        © 2025 AIDefCom - Smart Graduation Defense
      </footer>

      {/* --- Modals --- */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onSubmit={handleAddTask}
      />
      <AddSemesterModal
        isOpen={isAddSemesterModalOpen}
        onClose={() => setIsAddSemesterModalOpen(false)}
        onSubmit={handleAddSemester}
      />
      <AddMajorModal
        isOpen={isAddMajorModalOpen}
        onClose={() => setIsAddMajorModalOpen(false)}
        onSubmit={handleAddMajor}
      />
      <AddRubricModal
        isOpen={isAddRubricModalOpen}
        onClose={() => setIsAddRubricModalOpen(false)}
        onSubmit={handleAddRubric}
      />
      {editingTask && (
        <EditTaskModal
          isOpen
          onClose={() => setEditingTask(null)}
          onSubmit={handleEditTask}
          taskData={editingTask}
        />
      )}
      {editingSemester && (
        <EditSemesterModal
          isOpen
          onClose={() => setEditingSemester(null)}
          onSubmit={handleEditSemester}
          semesterData={editingSemester}
        />
      )}
      {editingMajor && (
        <EditMajorModal
          isOpen
          onClose={() => setEditingMajor(null)}
          onSubmit={handleEditMajor}
          majorData={editingMajor}
        />
      )}
      {editingRubric && (
        <EditRubricModal
          isOpen
          onClose={() => setEditingRubric(null)}
          onSubmit={handleEditRubric}
          rubricData={editingRubric}
        />
      )}
    </main>
  );
}
