"use client";

import React, { useState, useMemo, useEffect } from "react";
import AdminSidebar from "../dashboard/components/AdminSidebar";
import { majorsApi } from "@/lib/api/majors";
import { semestersApi } from "@/lib/api/semesters";
import { rubricsApi } from "@/lib/api/rubrics";
import { projectTasksApi } from "@/lib/api/project-tasks";
import { committeeAssignmentsApi } from "@/lib/api/committee-assignments";
import { authApi } from "@/lib/api/auth";
import type {
  MajorDto,
  SemesterDto,
  RubricDto,
  ProjectTaskDto,
  CommitteeAssignmentDto,
  UserDto,
} from "@/lib/models";

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
interface Score {
  id: number;
  studentID: string;
  rubricID: string;
  score: number;
  sessionID: number;
}
interface Note {
  id: number;
  userID: string;
  groupID: number;
  content: string;
  createdAt: string;
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
  const [loading, setLoading] = useState(false);

  // --- Modal states ---
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddSemesterModalOpen, setIsAddSemesterModalOpen] = useState(false);
  const [isAddMajorModalOpen, setIsAddMajorModalOpen] = useState(false);
  const [isAddRubricModalOpen, setIsAddRubricModalOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingSemester, setEditingSemester] = useState<SemesterDto | null>(
    null
  );
  const [editingMajor, setEditingMajor] = useState<MajorDto | null>(null);
  const [editingRubric, setEditingRubric] = useState<RubricDto | null>(null);

  /* ============ State data ============ */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [semesters, setSemesters] = useState<SemesterDto[]>([]);
  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [scores] = useState<Score[]>([]);
  const [rubrics, setRubrics] = useState<RubricDto[]>([]);
  const [notes] = useState<Note[]>([]);
  const [assignments, setAssignments] = useState<CommitteeAssignmentDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);

  // Map userId to fullName for quick lookup
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((user) => {
      map.set(user.id, user.fullName);
    });
    return map;
  }, [users]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          majorsRes,
          semestersRes,
          rubricsRes,
          tasksRes,
          assignmentsRes,
          usersRes,
        ] = await Promise.all([
          majorsApi.getAll().catch(() => ({ data: [] })),
          semestersApi.getAll().catch(() => ({ data: [] })),
          rubricsApi.getAll().catch(() => ({ data: [] })),
          projectTasksApi.getAll().catch(() => ({ data: [] })),
          committeeAssignmentsApi.getAll().catch(() => ({ data: [] })),
          authApi.getAllUsers().catch(() => ({ data: [] })),
        ]);

        setMajors(majorsRes.data || []);
        setSemesters(semestersRes.data || []);
        setRubrics(rubricsRes.data || []);
        setAssignments(assignmentsRes.data || []);
        setUsers(usersRes.data || []);

        // Transform tasks
        const transformedTasks = (tasksRes.data || []).map(
          (t: ProjectTaskDto) => ({
            id: t.id,
            title: t.title,
            description: t.description || "",
            assignedBy: t.assignedById,
            assignedTo: t.assignedToId,
            status: (t.status === "Completed"
              ? "Completed"
              : t.status === "InProgress"
              ? "Inprogress"
              : "Pending") as "Pending" | "Completed" | "Inprogress",
          })
        );
        setTasks(transformedTasks);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
    () =>
      getFilteredData(
        semesters,
        ["semesterName", "year", "majorId"],
        searchQuery
      ),
    [semesters, searchQuery]
  );
  const filteredMajors = useMemo(
    () => getFilteredData(majors, ["majorName", "description"], searchQuery),
    [majors, searchQuery]
  );
  const filteredRubrics = useMemo(
    () => getFilteredData(rubrics, ["rubricName", "description"], searchQuery),
    [rubrics, searchQuery]
  );
  const filteredAssignments = useMemo(
    () =>
      getFilteredData(
        assignments,
        ["lecturerId", "lecturerName", "role", "roleName", "councilId"],
        searchQuery
      ),
    [assignments, searchQuery]
  );

  /* ============ CRUD Handlers ============ */
  const handleAddTask = async (data: Omit<Task, "id" | "assignedBy">) => {
    try {
      await projectTasksApi.create({
        title: data.title,
        description: data.description,
        assignedToId: data.assignedTo,
      });
      const response = await projectTasksApi.getAll();
      const transformedTasks = (response.data || []).map(
        (t: ProjectTaskDto) => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          assignedBy: t.assignedById,
          assignedTo: t.assignedToId,
          status: (t.status === "Completed"
            ? "Completed"
            : t.status === "InProgress"
            ? "Inprogress"
            : "Pending") as "Pending" | "Completed" | "Inprogress",
        })
      );
      setTasks(transformedTasks);
      setIsAddTaskModalOpen(false);
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to create task"}`);
    }
  };

  const handleEditTask = async (
    id: number,
    data: Omit<Task, "id" | "assignedBy">
  ) => {
    try {
      await projectTasksApi.update(id, {
        title: data.title,
        description: data.description,
        assignedToId: data.assignedTo,
        status: data.status,
      });
      const response = await projectTasksApi.getAll();
      const transformedTasks = (response.data || []).map(
        (t: ProjectTaskDto) => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          assignedBy: t.assignedById,
          assignedTo: t.assignedToId,
          status: (t.status === "Completed"
            ? "Completed"
            : t.status === "InProgress"
            ? "Inprogress"
            : "Pending") as "Pending" | "Completed" | "Inprogress",
        })
      );
      setTasks(transformedTasks);
      setEditingTask(null);
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to update task"}`);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (window.confirm(`Delete Task ${id}?`)) {
      try {
        await projectTasksApi.delete(id);
        setTasks(tasks.filter((t) => t.id !== id));
      } catch (error: any) {
        alert(`Error: ${error.message || "Failed to delete task"}`);
      }
    }
  };

  const handleAddSemester = async (data: any) => {
    try {
      await semestersApi.create({
        semesterName: data.name,
        year: data.year,
        startDate: data.startDate,
        endDate: data.endDate,
        majorId: parseInt(data.majorID),
      });
      const response = await semestersApi.getAll();
      setSemesters(response.data || []);
      setIsAddSemesterModalOpen(false);
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to create semester"}`);
    }
  };

  const handleEditSemester = async (id: number, data: any) => {
    try {
      await semestersApi.update(id, {
        semesterName: data.name,
        year: data.year,
        startDate: data.startDate,
        endDate: data.endDate,
        majorId: parseInt(data.majorID),
      });
      const response = await semestersApi.getAll();
      setSemesters(response.data || []);
      setEditingSemester(null);
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to update semester"}`);
    }
  };

  const handleDeleteSemester = async (id: number) => {
    if (window.confirm(`Delete Semester ${id}?`)) {
      try {
        await semestersApi.delete(id);
        setSemesters(semesters.filter((s) => s.id !== id));
      } catch (error: any) {
        alert(`Error: ${error.message || "Failed to delete semester"}`);
      }
    }
  };

  const handleAddMajor = async (data: any) => {
    try {
      await majorsApi.create({
        majorName: data.name,
        description: data.description,
      });
      const response = await majorsApi.getAll();
      setMajors(response.data || []);
      setIsAddMajorModalOpen(false);
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to create major"}`);
    }
  };

  const handleEditMajor = async (id: number, data: any) => {
    try {
      await majorsApi.update(id, {
        majorName: data.name,
        description: data.description,
      });
      const response = await majorsApi.getAll();
      setMajors(response.data || []);
      setEditingMajor(null);
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to update major"}`);
    }
  };

  const handleDeleteMajor = async (id: number) => {
    if (window.confirm(`Delete Major ${id}?`)) {
      try {
        await majorsApi.delete(id);
        setMajors(majors.filter((m) => m.id !== id));
      } catch (error: any) {
        alert(`Error: ${error.message || "Failed to delete major"}`);
      }
    }
  };

  const handleAddRubric = async (data: any) => {
    try {
      await rubricsApi.create({
        rubricName: data.name,
        description: data.description,
      });
      const response = await rubricsApi.getAll();
      setRubrics(response.data || []);
      setIsAddRubricModalOpen(false);
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to create rubric"}`);
    }
  };

  const handleEditRubric = async (id: number, data: any) => {
    try {
      await rubricsApi.update(id, {
        rubricName: data.name,
        description: data.description,
      });
      const response = await rubricsApi.getAll();
      setRubrics(response.data || []);
      setEditingRubric(null);
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to update rubric"}`);
    }
  };

  const handleDeleteRubric = async (id: number) => {
    if (window.confirm(`Delete Rubric ${id}?`)) {
      try {
        await rubricsApi.delete(id);
        setRubrics(rubrics.filter((r) => r.id !== id));
      } catch (error: any) {
        alert(`Error: ${error.message || "Failed to delete rubric"}`);
      }
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (window.confirm(`Delete assignment ${id}?`)) {
      try {
        await committeeAssignmentsApi.delete(id);
        setAssignments(assignments.filter((a) => a.id !== id));
      } catch (error: any) {
        alert(`Error: ${error.message || "Failed to delete assignment"}`);
      }
    }
  };

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
              <td>{userMap.get(t.assignedBy) || t.assignedBy}</td>
              <td>{userMap.get(t.assignedTo) || t.assignedTo}</td>
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
              <td>{s.semesterName}</td>
              <td>{s.year}</td>
              <td>{s.startDate}</td>
              <td>{s.endDate}</td>
              <td>{s.majorId}</td>
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
              <td>{m.majorName}</td>
              <td>{m.description || "N/A"}</td>
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
          ["ID", "Rubric Name", "Description", "Actions"],
          filteredRubrics.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.rubricName}</td>
              <td>{r.description || "N/A"}</td>
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
          ["ID", "Lecturer", "Council ID", "Role", "Actions"],
          filteredAssignments.map((a) => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>
                {userMap.get(a.lecturerId) ||
                  (a as any).lecturerName ||
                  a.lecturerId}
              </td>
              <td>{a.councilId}</td>
              <td>{(a as any).roleName || a.role}</td>
              <td className="text-right">
                <div className="flex gap-2 justify-end items-center">
                  <button
                    className="btn-subtle"
                    onClick={() => console.log("edit assignment", a.id)}
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-subtle text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteAssignment(a.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
          onSubmit={(id, data) => handleEditSemester(parseInt(id), data)}
          semesterData={{
            id: String(editingSemester.id),
            name: editingSemester.semesterName,
            year: editingSemester.year,
            startDate: editingSemester.startDate,
            endDate: editingSemester.endDate,
            majorID: String(editingSemester.majorId),
          }}
        />
      )}
      {editingMajor && (
        <EditMajorModal
          isOpen
          onClose={() => setEditingMajor(null)}
          onSubmit={(id, data) => handleEditMajor(parseInt(id), data)}
          majorData={{
            id: String(editingMajor.id),
            name: editingMajor.majorName,
            description: editingMajor.description || "",
          }}
        />
      )}
      {editingRubric && (
        <EditRubricModal
          isOpen
          onClose={() => setEditingRubric(null)}
          onSubmit={(id, data) => handleEditRubric(parseInt(id), data)}
          rubricData={{
            id: String(editingRubric.id),
            name: editingRubric.rubricName,
            description: editingRubric.description || "",
            createdAt: new Date().toISOString().split("T")[0],
          }}
        />
      )}
    </main>
  );
}
