"use client";

import React, { useState, useMemo, useEffect } from "react";
import AdminSidebar from "../dashboard/components/AdminSidebar";
import { majorsApi } from "@/lib/api/majors";
import { semestersApi } from "@/lib/api/semesters";
import { rubricsApi } from "@/lib/api/rubrics";
import { projectTasksApi } from "@/lib/api/project-tasks";
import { groupsApi } from "@/lib/api/groups";
import { committeeAssignmentsApi } from "@/lib/api/committee-assignments";
import { councilsApi } from "@/lib/api/councils";
import { authApi } from "@/lib/api/auth";
import { swalConfig } from "@/lib/utils/sweetAlert";
import type {
  MajorDto,
  SemesterDto,
  RubricDto,
  ProjectTaskDto,
  GroupDto,
  CommitteeAssignmentDto,
  CouncilDto,
  UserDto,
} from "@/lib/models";

// Import các Modal đã tạo:
import AddTaskModal from "../dashboard/components/AddTaskModal";
import EditTaskModal from "../dashboard/components/EditTaskModal";
import AddSemesterModal from "../dashboard/components/AddSemesterModal";
import EditSemesterModal from "../dashboard/components/EditSemesterModal";
import AddMajorModal from "../dashboard/components/AddMajorModal";
import EditMajorModal from "../dashboard/components/EditMajorModal";

// Format date function to display only date without time
const formatDateOnly = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};
import AddRubricModal from "../dashboard/components/AddRubricModal";
import EditRubricModal from "../dashboard/components/EditRubricModal";
import EditAssignmentModal from "../dashboard/components/EditAssignmentModal";
import EditGroupModal from "../../moderator/create-sessions/components/EditGroupModal";

import {
  ClipboardList,
  Calendar,
  GraduationCap,
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
interface Note {
  id: number;
  committeeAssignmentId: string;
  userName: string | null;
  groupId: string;
  noteContent: string;
  createdAt: string;
}

type AdminTabKey =
  | "tasks"
  | "semesters"
  | "majors"
  | "groups"
  | "rubrics"
  | "notes"
  | "assignments";

const formatDateInputValue = (value?: string) => {
  if (!value) return "";
  if (value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

const normalizeDateForApi = (value?: string) => {
  if (!value) return "";
  if (value.includes("T")) return value;
  const parts = value.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const padded = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return `${padded}T00:00:00`;
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }
  return value;
};

/* ======================== TABS ======================== */
const adminTabs: {
  key: AdminTabKey;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { key: "tasks", label: "Tasks", icon: ClipboardList },
  { key: "semesters", label: "Semesters", icon: Calendar },
  { key: "majors", label: "Majors", icon: GraduationCap },
  { key: "groups", label: "Groups", icon: Users },
  { key: "rubrics", label: "Rubrics", icon: BookOpen },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "assignments", label: "Assignments", icon: Users },
];

const PAGE_SIZE = 16;

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
  const [editingAssignment, setEditingAssignment] =
    useState<CommitteeAssignmentDto | null>(null);
  const [editingGroup, setEditingGroup] = useState<GroupDto | null>(null);

  /* ============ State data ============ */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [semesters, setSemesters] = useState<SemesterDto[]>([]);
  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [councils, setCouncils] = useState<CouncilDto[]>([
    {
      id: 18,
      majorId: 1,
      majorName: "Công nghệ thông tin",
      description: "hahahaha",
      createdDate: "2025-11-20T15:31:49.6375305",
      isActive: true,
    },
    {
      id: 14,
      majorId: 1,
      majorName: "Công nghệ thông tin",
      description: "string",
      createdDate: "2025-11-20T10:14:30.1163123",
      isActive: true,
    },
    {
      id: 11,
      majorId: 1,
      majorName: "Công nghệ thông tin",
      description: "string",
      createdDate: "2025-11-20T10:04:10.1614936",
      isActive: true,
    },
  ]);
  const [rubrics, setRubrics] = useState<RubricDto[]>([]);
  const [notes] = useState<Note[]>([
    {
      id: 1,
      committeeAssignmentId: "486D75CF-3E93-4DA5-A231-885BE87D07AF",
      userName: null,
      groupId: "457144B6-D625-4F5B-8BAE-AB1E882DA8DE",
      noteContent:
        "Ghi chú: Sinh viên trình bày tốt. Cần theo dõi thêm về phần bảo mật dữ liệu người dùng. Đề xuất bổ sung thêm tính năng tự động phát hiện cảm xúc tiêu cực.",
      createdAt: "2025-11-13T03:26:07.7033333",
    },
    {
      id: 2,
      committeeAssignmentId: "486D75CF-3E93-4DA5-A231-885BE87D07AF",
      userName: null,
      groupId: "457144B6-D625-4F5B-8BAE-AB1E882DA8DE",
      noteContent:
        "Nhóm có sự chuẩn bị tốt cho phần demo. Tuy nhiên cần cải thiện thuật toán xử lý dữ liệu để tăng độ chính xác.",
      createdAt: "2025-11-14T08:15:22.1234567",
    },
    {
      id: 3,
      committeeAssignmentId: "A123B456-C789-4DEF-8901-234567890ABC",
      userName: null,
      groupId: "789ABC12-3456-789D-EFAB-CDEF01234567",
      noteContent:
        "Đề tài có tính ứng dụng cao. Sinh viên cần bổ sung thêm phần testing và viết documentation chi tiết hơn.",
      createdAt: "2025-11-15T14:30:45.9876543",
    },
  ]);
  const [assignments, setAssignments] = useState<CommitteeAssignmentDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);

  // Pagination state for each tab
  const [taskPage, setTaskPage] = useState(1);
  const [semesterPage, setSemesterPage] = useState(1);
  const [majorPage, setMajorPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [rubricPage, setRubricPage] = useState(1);
  const [notePage, setNotePage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);

  // Map userId to fullName for quick lookup
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((user) => {
      map.set(user.id, user.fullName);
    });
    return map;
  }, [users]);

  // Map majorId to majorName for quick lookup
  const majorMap = useMemo(() => {
    const map = new Map<number, string>();
    majors.forEach((major) => {
      map.set(major.id, major.majorName);
    });
    return map;
  }, [majors]);

  // Map councilId to majorName for quick lookup
  const councilMap = useMemo(() => {
    const map = new Map<number, string>();
    councils.forEach((council) => {
      map.set(
        council.id,
        council.majorName || council.councilName || `Council ${council.id}`
      );
    });
    return map;
  }, [councils]);

  // Reset page to 1 when switching tabs
  useEffect(() => {
    setTaskPage(1);
    setSemesterPage(1);
    setMajorPage(1);
    setGroupPage(1);
    setRubricPage(1);
    setNotePage(1);
    setAssignmentPage(1);
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          majorsRes,
          semestersRes,
          rubricsRes,
          tasksRes,
          groupsRes,
          assignmentsRes,
          councilsRes,
          usersRes,
        ] = await Promise.all([
          majorsApi.getAll().catch(() => ({ data: [] })),
          semestersApi.getAll().catch(() => ({ data: [] })),
          rubricsApi.getAll().catch(() => ({ data: [] })),
          projectTasksApi.getAll().catch(() => ({ data: [] })),
          groupsApi.getAll(false).catch(() => ({ data: [] })), // includeDeleted=false
          committeeAssignmentsApi.getAll().catch(() => ({ data: [] })),
          councilsApi.getAll(false).catch(() => ({ data: [] })),
          authApi.getAllUsers().catch(() => ({ data: [] })),
        ]);

        setMajors(majorsRes.data || []);
        setSemesters(semestersRes.data || []);
        setRubrics(rubricsRes.data || []);
        setGroups(groupsRes.data || []);
        setCouncils(councilsRes.data || []);
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
  const filteredGroups = useMemo(
    () =>
      getFilteredData(
        groups,
        [
          "projectCode",
          "topicTitle_EN",
          "topicTitle_VN",
          "semesterName",
          "majorName",
        ],
        searchQuery
      ),
    [groups, searchQuery]
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

  // Pagination calculations
  const paginatedTasks = useMemo(() => {
    const startIndex = (taskPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredTasks, taskPage]);

  const paginatedSemesters = useMemo(() => {
    const startIndex = (semesterPage - 1) * PAGE_SIZE;
    return filteredSemesters.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredSemesters, semesterPage]);

  const paginatedMajors = useMemo(() => {
    const startIndex = (majorPage - 1) * PAGE_SIZE;
    return filteredMajors.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredMajors, majorPage]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (groupPage - 1) * PAGE_SIZE;
    return filteredGroups.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredGroups, groupPage]);

  const paginatedRubrics = useMemo(() => {
    const startIndex = (rubricPage - 1) * PAGE_SIZE;
    return filteredRubrics.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRubrics, rubricPage]);

  const paginatedNotes = useMemo(() => {
    const startIndex = (notePage - 1) * PAGE_SIZE;
    return notes.slice(startIndex, startIndex + PAGE_SIZE);
  }, [notes, notePage]);

  const paginatedAssignments = useMemo(() => {
    const startIndex = (assignmentPage - 1) * PAGE_SIZE;
    return filteredAssignments.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAssignments, assignmentPage]);

  // Total pages calculations
  const taskTotalPages = Math.max(
    1,
    Math.ceil(filteredTasks.length / PAGE_SIZE)
  );
  const semesterTotalPages = Math.max(
    1,
    Math.ceil(filteredSemesters.length / PAGE_SIZE)
  );
  const majorTotalPages = Math.max(
    1,
    Math.ceil(filteredMajors.length / PAGE_SIZE)
  );
  const groupTotalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / PAGE_SIZE)
  );
  const rubricTotalPages = Math.max(
    1,
    Math.ceil(filteredRubrics.length / PAGE_SIZE)
  );
  const noteTotalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE));
  const assignmentTotalPages = Math.max(
    1,
    Math.ceil(filteredAssignments.length / PAGE_SIZE)
  );

  // Pagination component helper
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    setPage: (page: number) => void
  ) => {
    if (totalPages <= 1) {
      return (
        <div className="flex items-center justify-center mt-4 flex-wrap gap-2">
          <button
            className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white"
            disabled
          >
            1
          </button>
        </div>
      );
    }
    return (
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
              onClick={() => setPage(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
      </div>
    );
  };

  /* ============ CRUD Handlers ============ */
  const handleAddTask = async (data: Omit<Task, "id" | "assignedBy">) => {
    try {
      // Find CommitteeAssignment for assignedTo (user ID -> lecturer ID -> committee assignment)
      const assignedToUser = users.find((u) => u.id === data.assignedTo);
      if (!assignedToUser) {
        await swalConfig.error(
          "Error",
          "Selected user not found. Please select a valid user."
        );
        return;
      }

      // Find CommitteeAssignment by LecturerId (which should match user ID if user is a lecturer)
      const assignedToAssignment = assignments.find(
        (a) => a.lecturerId === assignedToUser.id
      );

      if (!assignedToAssignment) {
        await swalConfig.error(
          "Error",
          "Selected user does not have a committee assignment. Please select a user with a committee assignment."
        );
        return;
      }

      // Get assignedBy - find admin user's committee assignment or use first assignment
      const adminUser =
        users.find((u) => u.role === "Administrator") || users[0];
      const assignedByAssignment = adminUser
        ? assignments.find((a) => a.lecturerId === adminUser.id) ||
          assignments[0]
        : assignments[0];

      if (!assignedByAssignment) {
        await swalConfig.error(
          "Error",
          "No committee assignment available. Please ensure committee assignments are loaded."
        );
        return;
      }

      // Get first available rubric or default to 1
      const firstRubric = rubrics.length > 0 ? rubrics[0].id : 1;

      if (!firstRubric) {
        await swalConfig.error(
          "Error",
          "No rubric available. Please create a rubric first."
        );
        return;
      }

      // Map frontend status to backend format
      const backendStatus = data.status;

      console.log("Creating task with:", {
        title: data.title,
        description: data.description,
        assignedById: assignedByAssignment.lecturerId,
        assignedToId: assignedToAssignment.lecturerId,
        rubricId: firstRubric,
        status: backendStatus,
      });

      await projectTasksApi.create({
        title: data.title,
        description: data.description,
        assignedById: assignedByAssignment.lecturerId,
        assignedToId: assignedToAssignment.lecturerId,
        rubricId: firstRubric,
        status: backendStatus,
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
      await swalConfig.success("Success!", "Task created successfully!");
    } catch (error: any) {
      console.error("Error creating task:", error);
      await swalConfig.error(
        "Error Creating Task",
        error.message || "Failed to create task"
      );
    }
  };

  const handleEditTask = async (
    id: number | string,
    data: Omit<Task, "id" | "assignedBy" | "assignedTo">
  ) => {
    try {
      console.log("Edit task data:", data);
      console.log("Edit task id:", id);

      if (!data.title || !data.status) {
        await swalConfig.error(
          "Invalid Task",
          "Title and status are required."
        );
        return;
      }

      // Get both assignedBy and assignedTo from original task data since they're not editable
      const originalTask = tasks.find((t) => t.id === Number(id));

      // Map frontend status to backend expected format
      const backendStatus = data.status;

      const updatePayload = {
        title: data.title,
        description: data.description,
        assignedById:
          originalTask?.assignedBy || "18D005EB-D9DB-4C84-9AD3-459C209708FE", // Keep original assignedBy
        assignedToId:
          originalTask?.assignedTo || "18D005EB-D9DB-4C84-9AD3-459C209708FE", // Keep original assignedTo
        rubricId: 1, // Default rubric ID - you may want to make this configurable
        status: backendStatus,
      };

      console.log("Update payload:", updatePayload);

      await projectTasksApi.update(Number(id), updatePayload);

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
      await swalConfig.success("Success!", "Task updated successfully!");
    } catch (error: any) {
      console.error("Error updating task:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));

      let errorMessage = error.message || "Failed to update task";

      // Check for more detailed error info
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      }
      if (error.message?.includes("500")) {
        errorMessage =
          "Server error while updating the task. Please verify the task exists and try again.";
      }

      await swalConfig.error("Error Updating Task", errorMessage);
    }
  };

  const handleDeleteTask = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Task?",
      `Are you sure you want to delete task with ID: ${id}?`,
      "Yes, delete it!"
    );

    if (result.isConfirmed) {
      try {
        await projectTasksApi.delete(id);
        setTasks(tasks.filter((t) => t.id !== id));
        await swalConfig.success("Deleted!", "Task deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting task:", error);
        await swalConfig.error(
          "Error Deleting Task",
          error.message || "Failed to delete task"
        );
      }
    }
  };

  const handleAddSemester = async (data: any) => {
    try {
      const parsedYear = Number(data.year);
      const parsedMajorId = Number(data.majorID);

      if (
        !data.name ||
        Number.isNaN(parsedYear) ||
        Number.isNaN(parsedMajorId)
      ) {
        await swalConfig.error(
          "Invalid Data",
          "Please provide valid semester name, year, and major."
        );
        return;
      }

      const semesterDto = {
        semesterName: data.name,
        year: parsedYear,
        startDate: normalizeDateForApi(data.startDate),
        endDate: normalizeDateForApi(data.endDate),
        majorId: parsedMajorId,
      };

      await semestersApi.create(semesterDto);
      const response = await semestersApi.getAll();
      setSemesters(response.data || []);
      setIsAddSemesterModalOpen(false);
      await swalConfig.success("Success!", "Semester created successfully!");
    } catch (error: any) {
      console.error("Error creating semester:", error);

      let errorMessage = "Failed to create semester";
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(
            ([field, messages]) =>
              `${field}: ${(messages as string[]).join(", ")}`
          )
          .join("\n");
        errorMessage = `Validation errors:\n${errorMessages}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      await swalConfig.error("Error Creating Semester", errorMessage);
    }
  };

  const handleEditSemester = async (id: number, data: any) => {
    try {
      const parsedYear = Number(data.year);
      const parsedMajorId = data.majorID ? Number(data.majorID) : null;

      console.log("Semester edit data:", { data, parsedYear, parsedMajorId });

      if (
        !data.name ||
        Number.isNaN(parsedYear) ||
        !data.majorID ||
        Number.isNaN(parsedMajorId)
      ) {
        await swalConfig.error(
          "Invalid Data",
          "Please provide valid semester name, year, and major."
        );
        return;
      }

      const semesterDto = {
        semesterName: data.name,
        year: parsedYear,
        startDate: normalizeDateForApi(data.startDate),
        endDate: normalizeDateForApi(data.endDate),
        majorId: parsedMajorId!,
      };

      await semestersApi.update(id, semesterDto);
      const response = await semestersApi.getAll();
      setSemesters(response.data || []);
      setEditingSemester(null);
      await swalConfig.success("Success!", "Semester updated successfully!");
    } catch (error: any) {
      console.error("Error updating semester:", error);

      let errorMessage = "Failed to update semester";
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(
            ([field, messages]) =>
              `${field}: ${(messages as string[]).join(", ")}`
          )
          .join("\n");
        errorMessage = `Validation errors:\n${errorMessages}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      await swalConfig.error("Error Updating Semester", errorMessage);
    }
  };

  const handleDeleteSemester = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Semester?",
      `Are you sure you want to delete semester with ID: ${id}?`,
      "Yes, delete it!"
    );

    if (result.isConfirmed) {
      try {
        await semestersApi.delete(id);
        setSemesters(semesters.filter((s) => s.id !== id));
        await swalConfig.success("Deleted!", "Semester deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting semester:", error);
        await swalConfig.error(
          "Error Deleting Semester",
          error.message || "Failed to delete semester"
        );
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
      await swalConfig.success("Success!", "Major created successfully!");
    } catch (error: any) {
      console.error("Error creating major:", error);
      await swalConfig.error(
        "Error Creating Major",
        error.message || "Failed to create major"
      );
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
      await swalConfig.success("Success!", "Major updated successfully!");
    } catch (error: any) {
      console.error("Error updating major:", error);
      await swalConfig.error(
        "Error Updating Major",
        error.message || "Failed to update major"
      );
    }
  };

  const handleDeleteMajor = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Major?",
      `Are you sure you want to delete major with ID: ${id}?`,
      "Yes, delete it!"
    );

    if (result.isConfirmed) {
      try {
        await majorsApi.delete(id);
        setMajors(majors.filter((m) => m.id !== id));
        await swalConfig.success("Deleted!", "Major deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting major:", error);
        await swalConfig.error(
          "Error Deleting Major",
          error.message || "Failed to delete major"
        );
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
      await swalConfig.success("Success!", "Rubric created successfully!");
    } catch (error: any) {
      console.error("Error creating rubric:", error);
      await swalConfig.error(
        "Error Creating Rubric",
        error.message || "Failed to create rubric"
      );
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
      await swalConfig.success("Success!", "Rubric updated successfully!");
    } catch (error: any) {
      console.error("Error updating rubric:", error);
      await swalConfig.error(
        "Error Updating Rubric",
        error.message || "Failed to update rubric"
      );
    }
  };

  // Handle edit assignment
  const handleEditAssignment = async (
    id: string,
    data: { lecturerId: string; councilId: string; role: string }
  ) => {
    try {
      // Find the original assignment to get defenseSessionId
      const originalAssignment = assignments.find((a) => String(a.id) === id);
      if (!originalAssignment) {
        await swalConfig.error("Error", "Assignment not found");
        return;
      }

      const councilId = data.councilId
        ? parseInt(data.councilId, 10)
        : originalAssignment.councilId;

      const result = await committeeAssignmentsApi.update(id, {
        lecturerId: data.lecturerId || originalAssignment.lecturerId,
        councilId,
        defenseSessionId: originalAssignment.defenseSessionId,
        role: data.role,
      });

      if (result.code === 200 || result.message?.includes("success")) {
        await swalConfig.success(
          "Success!",
          "Assignment updated successfully!"
        );
        // Reload assignments to get updated data
        const response = await committeeAssignmentsApi.getAll();
        setAssignments(response.data || []);
        setEditingAssignment(null);
      } else {
        await swalConfig.error(
          "Update Failed",
          result.message || "Failed to update assignment"
        );
      }
    } catch (error: any) {
      console.error("Error updating assignment:", error);
      await swalConfig.error(
        "Error",
        "An error occurred while updating the assignment"
      );
    }
  };

  const handleEditGroup = async (
    id: string,
    data: {
      topicEN: string;
      topicVN: string;
      semesterId: string;
      majorId: string;
      status: string;
    }
  ) => {
    try {
      // Get the current group to preserve projectCode
      const currentGroup = groups.find((g) => g.id === id);
      if (!currentGroup) {
        await swalConfig.error("Error", "Group not found");
        return;
      }

      await groupsApi.update(id, {
        projectCode: currentGroup.projectCode || `PRJ-${id.slice(0, 8)}`,
        topicTitle_EN: data.topicEN,
        topicTitle_VN: data.topicVN,
        semesterId: parseInt(data.semesterId),
        majorId: parseInt(data.majorId),
        status: data.status,
      });

      // Refresh groups data
      const response = await groupsApi.getAll(false);
      setGroups(response.data || []);

      setEditingGroup(null);
      await swalConfig.success("Success!", "Group updated successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Editing Group",
        error.message || "Failed to edit group"
      );
    }
  };

  const handleDeleteRubric = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Rubric?",
      `Are you sure you want to delete rubric with ID: ${id}?`,
      "Yes, delete it!"
    );

    if (result.isConfirmed) {
      try {
        await rubricsApi.delete(id);
        setRubrics(rubrics.filter((r) => r.id !== id));
        await swalConfig.success("Deleted!", "Rubric deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting rubric:", error);
        await swalConfig.error(
          "Error Deleting Rubric",
          error.message || "Failed to delete rubric"
        );
      }
    }
  };

  const handleDeleteAssignment = async (id: number | string) => {
    const assignmentId = String(id);
    const result = await swalConfig.confirm(
      "Delete Assignment?",
      `Are you sure you want to delete assignment with ID: ${assignmentId}?`,
      "Yes, delete it!"
    );

    if (result.isConfirmed) {
      try {
        await committeeAssignmentsApi.delete(assignmentId);
        setAssignments((prev) =>
          prev.filter((a) => String(a.id) !== assignmentId)
        );
        await swalConfig.success(
          "Deleted!",
          "Assignment deleted successfully!"
        );
      } catch (error: any) {
        console.error("Error deleting assignment:", error);
        await swalConfig.error(
          "Error Deleting Assignment",
          error.message || "Failed to delete assignment"
        );
      }
    }
  };

  const handleDeleteGroup = async (id: string) => {
    const result = await swalConfig.confirm(
      "Delete Group?",
      `Are you sure you want to delete this group?`,
      "Yes, delete it!"
    );

    if (result.isConfirmed) {
      try {
        await groupsApi.delete(id);
        setGroups(groups.filter((g) => g.id !== id));
        await swalConfig.success("Deleted!", "Group deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting group:", error);
        await swalConfig.error(
          "Error Deleting Group",
          error.message || "Failed to delete group"
        );
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
            {headers.map((h, index) => (
              <th key={h} className={h === "Actions" ? "text-center" : ""}>
                {h}
              </th>
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
            Manage tasks, semesters, majors, rubrics, and system data
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
      {activeTab === "tasks" && (
        <>
          {renderHeader("Task Management", () => setIsAddTaskModalOpen(true))}
          {renderSearch("Search tasks...")}
          {renderTable(
            [
              "ID",
              "Title",
              "Description",
              "Assigned By",
              "Assigned To",
              "Status",
              "Actions",
            ],
            paginatedTasks.map((t) => (
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
                <td className="text-center align-middle">
                  <div className="flex gap-2 justify-center items-center">
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
          {renderPagination(taskPage, taskTotalPages, setTaskPage)}
        </>
      )}

      {activeTab === "semesters" && (
        <>
          {renderHeader("Semester Management", () =>
            setIsAddSemesterModalOpen(true)
          )}
          {renderSearch("Search semesters...")}
          {renderTable(
            ["ID", "Name", "Year", "Start", "End", "Actions"],
            paginatedSemesters.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.semesterName}</td>
                <td>{s.year}</td>
                <td>{formatDateOnly(s.startDate)}</td>
                <td>{formatDateOnly(s.endDate)}</td>
                <td className="text-center align-middle">
                  <div className="flex gap-2 justify-center items-center">
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
          {renderPagination(semesterPage, semesterTotalPages, setSemesterPage)}
        </>
      )}

      {activeTab === "majors" && (
        <>
          {renderHeader("Major Management", () => setIsAddMajorModalOpen(true))}
          {renderSearch("Search majors...")}
          {renderTable(
            ["ID", "Major Name", "Description", "Actions"],
            paginatedMajors.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>{m.majorName}</td>
                <td>{m.description || "N/A"}</td>
                <td className="text-center align-middle">
                  <div className="flex gap-2 justify-center items-center">
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
          {renderPagination(majorPage, majorTotalPages, setMajorPage)}
        </>
      )}

      {activeTab === "groups" && (
        <>
          {renderHeader("Groups Management")}
          {renderSearch("Search groups...")}
          {renderTable(
            [
              "Project Code",
              "Title (EN)",
              "Title (VN)",
              "Semester",
              "Major",
              "Status",
              "Actions",
            ],
            paginatedGroups.map((g) => (
              <tr key={g.id}>
                <td>{g.projectCode || "N/A"}</td>
                <td className="max-w-48 truncate">
                  {g.topicTitle_EN || "N/A"}
                </td>
                <td className="max-w-48 truncate">
                  {g.topicTitle_VN || "N/A"}
                </td>
                <td>{g.semesterName || "N/A"}</td>
                <td>{g.majorName || "N/A"}</td>
                <td>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      g.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {g.status || "Unknown"}
                  </span>
                </td>
                <td className="text-center align-middle">
                  <div className="flex gap-2 justify-center items-center">
                    <button
                      className="btn-subtle"
                      title="Edit Group"
                      onClick={() => {
                        setEditingGroup(g);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="btn-subtle text-red-600 hover:bg-red-50"
                      title="Delete Group"
                      onClick={() => handleDeleteGroup(g.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
          {renderPagination(groupPage, groupTotalPages, setGroupPage)}
        </>
      )}

      {activeTab === "rubrics" && (
        <>
          {renderHeader("Rubric Management", () =>
            setIsAddRubricModalOpen(true)
          )}
          {renderSearch("Search rubrics...")}
          {renderTable(
            ["ID", "Rubric Name", "Description", "Actions"],
            paginatedRubrics.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.rubricName}</td>
                <td>{r.description || "N/A"}</td>
                <td className="text-center align-middle">
                  <div className="flex gap-2 justify-center items-center">
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
          {renderPagination(rubricPage, rubricTotalPages, setRubricPage)}
        </>
      )}

      {activeTab === "notes" && (
        <>
          {renderHeader("Member Notes")}
          {renderTable(
            ["ID", "Assignment ID", "Group ID", "Note Content", "Created At"],
            paginatedNotes.map((n) => (
              <tr key={n.id}>
                <td>{n.id}</td>
                <td>{n.committeeAssignmentId}</td>
                <td>{n.groupId}</td>
                <td>{n.noteContent}</td>
                <td>{new Date(n.createdAt).toLocaleString()}</td>
              </tr>
            ))
          )}
          {renderPagination(notePage, noteTotalPages, setNotePage)}
        </>
      )}

      {activeTab === "assignments" && (
        <>
          {renderHeader("Committee Assignments")}
          {renderTable(
            ["ID", "Lecturer", "Council Name", "Role"],
            paginatedAssignments.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>
                  {userMap.get(a.lecturerId) ||
                    (a as any).lecturerName ||
                    a.lecturerId}
                </td>
                <td>
                  {councilMap.get(a.councilId) || `Council ${a.councilId}`}
                </td>
                <td>{(a as any).roleName || a.role}</td>
              </tr>
            ))
          )}
          {renderPagination(
            assignmentPage,
            assignmentTotalPages,
            setAssignmentPage
          )}
        </>
      )}

      <footer className="page-footer">
        © 2025 AIDefCom - Smart Graduation Defense
      </footer>

      {/* --- Modals --- */}
      {/* Task assignment is now available to users with Chair, Secretary, or Lecturer roles */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onSubmit={handleAddTask}
        userOptions={users
          .filter((u) => {
            console.log("User:", u.fullName, "Role:", u.role);
            return (
              u.role &&
              (u.role === "Chair" ||
                u.role === "Secretary" ||
                u.role === "Lecturer")
            );
          })
          .map((u) => ({ id: u.id, name: u.fullName }))}
      />
      <AddSemesterModal
        isOpen={isAddSemesterModalOpen}
        onClose={() => setIsAddSemesterModalOpen(false)}
        onSubmit={handleAddSemester}
        majorOptions={majors.map((m) => ({
          id: String(m.id),
          name: m.majorName || `Major ${m.id}`,
        }))}
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
          userOptions={users
            .filter((u) => {
              console.log("Edit - User:", u.fullName, "Role:", u.role);
              return (
                u.role &&
                (u.role === "Chair" ||
                  u.role === "Secretary" ||
                  u.role === "Lecturer")
              );
            })
            .map((u) => ({ id: u.id, name: u.fullName }))}
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
            majorID: editingSemester.majorId
              ? String(editingSemester.majorId)
              : "",
          }}
          majorOptions={majors.map((m) => ({
            id: String(m.id),
            name: m.majorName || `Major ${m.id}`,
          }))}
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
      {editingGroup && (
        <EditGroupModal
          isOpen
          onClose={() => setEditingGroup(null)}
          onSubmit={(id, data) => handleEditGroup(id, data)}
          groupData={{
            id: editingGroup.id || "",
            topicEN: editingGroup.topicTitle_EN || "",
            topicVN: editingGroup.topicTitle_VN || "",
            semester: editingGroup.semesterName || "",
            semesterId: editingGroup.semesterId || 0,
            majorId: editingGroup.majorId || 0,
            status: editingGroup.status || "Active",
          }}
          majorOptions={majors.map((m) => ({
            id: m.id,
            name: m.majorName || `Major ${m.id}`,
          }))}
          semesterOptions={semesters.map((s) => ({
            id: s.id,
            name: s.semesterName || `Semester ${s.id}`,
          }))}
        />
      )}
      {/* Assignment actions temporarily disabled */}
    </main>
  );
}
