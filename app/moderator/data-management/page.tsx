"use client";

import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { councilsApi } from "@/lib/api/councils";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { transcriptsApi } from "@/lib/api/transcripts";
import { reportsApi } from "@/lib/api/reports";
import { semestersApi } from "@/lib/api/semesters";
import type {
  CouncilDto,
  GroupDto,
  StudentDto,
  DefenseSessionDto,
} from "@/lib/models";

import AddCouncilModal from "../create-sessions/components/AddCouncilModal";
import AddGroupModal from "../create-sessions/components/AddGroupModal";
import AddStudentModal from "../create-sessions/components/AddStudentModal";
import TranscriptDetailModal from "../create-sessions/components/TranscriptDetailModal";
import ReportDetailModal from "../create-sessions/components/ReportDetailModal";
import EditCouncilModal from "../create-sessions/components/EditCouncilModal";
import EditGroupModal from "../create-sessions/components/EditGroupModal";
import EditStudentModal from "../create-sessions/components/EditStudentModal";
import EditSessionModal from "../create-sessions/components/EditSessionModal";

// Types (kept)
type Council = {
  id: number;
  name: string;
  description: string;
  createdDate: string;
  status: "Active" | "Inactive";
};
type Group = {
  id: string;
  topicEN: string;
  topicVN: string;
  semester: string;
  status: "Active" | "Completed" | "Pending";
};
type LocalStudent = {
  id: number;
  userId: string;
  groupId: string | number; // Allow both string (group name) and number (group id)
  dob: string;
  gender: string;
  role: "Leader" | "Member";
};
type Session = {
  id: number;
  groupId: string | number; // Allow both string (group name) and number (group id)
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
  const [editingStudent, setEditingStudent] = useState<LocalStudent | null>(
    null
  );
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);

  // State data
  const [councils, setCouncils] = useState<Council[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<LocalStudent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          councilsRes,
          groupsRes,
          studentsRes,
          sessionsRes,
          transcriptsRes,
          reportsRes,
          semestersRes,
        ] = await Promise.all([
          councilsApi
            .getAll(false)
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
          groupsApi
            .getAll(false)
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
          studentsApi
            .getAll()
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
          defenseSessionsApi
            .getAll()
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
          transcriptsApi
            .getAll()
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
          reportsApi
            .getAll()
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
          semestersApi
            .getAll()
            .catch(() => ({ code: 500, message: "Failed", data: [] })),
        ]);

        console.log("API Responses:", {
          semesters: semestersRes,
          groups: groupsRes,
          students: studentsRes,
        });

        // Create lookup maps
        const semesterMap = new Map();
        (Array.isArray(semestersRes.data) ? semestersRes.data : []).forEach(
          (s: any) => {
            semesterMap.set(
              String(s.id),
              s.name || s.semesterName || `Semester ${s.id}`
            );
          }
        );

        const groupMap = new Map();
        (Array.isArray(groupsRes.data) ? groupsRes.data : []).forEach(
          (g: any) => {
            const groupName =
              g.projectCode ||
              g.groupName ||
              g.topicTitle_EN ||
              g.projectTitle ||
              `Group ${g.id?.slice(0, 8) || "Unknown"}`;
            groupMap.set(String(g.id), groupName);
          }
        );

        console.log("Lookup Maps:", {
          semesterMap: Object.fromEntries(semesterMap),
          groupMap: Object.fromEntries(groupMap),
        });

        // Transform councils
        const councilsData = (
          Array.isArray(councilsRes.data) ? councilsRes.data : []
        ).map((c: CouncilDto) => ({
          id: c.id,
          name: c.councilName || c.majorName || `Council ${c.id}`,
          description: c.description || "",
          createdDate: c.createdDate
            ? new Date(c.createdDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          status: c.isActive ? ("Active" as const) : ("Inactive" as const),
        }));
        setCouncils(councilsData);

        // Transform groups
        const groupsData = (
          Array.isArray(groupsRes.data) ? groupsRes.data : []
        ).map((g: GroupDto) => ({
          id: g.id || "0",
          topicEN:
            g.projectCode ||
            g.groupName ||
            g.topicTitle_EN ||
            g.projectTitle ||
            `Group ${g.id?.slice(0, 8) || "Unknown"}`,
          topicVN:
            g.topicTitle_VN ||
            g.projectTitle ||
            g.projectCode ||
            g.groupName ||
            "Không có tiêu đề",
          semester:
            semesterMap.get(String(g.semesterId)) || `Semester ${g.semesterId}`,
          status: "Active" as const,
        }));
        setGroups(groupsData);

        // Transform students
        const studentsData = (studentsRes.data || []).map(
          (s: StudentDto, index: number) => {
            // Try multiple possible group ID field names
            const studentGroupId =
              s.groupId ||
              (s as any).group_id ||
              (s as any).groupID ||
              (s as any).Group_ID;

            console.log(`Student ${index + 1}:`, {
              studentData: s,
              groupId: studentGroupId,
              groupIdType: typeof studentGroupId,
              foundInMap: groupMap.get(String(studentGroupId)),
            });

            return {
              id: index + 1,
              userId:
                s.studentCode ||
                s.userName ||
                s.fullName ||
                `Student ${s.id?.slice(0, 8) || index + 1}`,
              groupId: studentGroupId
                ? groupMap.get(String(studentGroupId)) ||
                  `Group ${studentGroupId}`
                : "No Group Assigned",
              dob: s.dateOfBirth || "",
              gender: s.gender || "",
              role: index === 0 ? ("Leader" as const) : ("Member" as const),
            };
          }
        );
        setStudents(studentsData);

        // Transform sessions
        const sessionsData = (sessionsRes.data || []).map(
          (s: DefenseSessionDto) => ({
            id: s.id,
            groupId:
              groupMap.get(String(s.groupId)) ||
              `Group ${s.groupId?.slice(0, 8)}` ||
              "Unknown Group",
            location: s.location || "TBD",
            date: s.defenseDate
              ? new Date(s.defenseDate).toISOString().split("T")[0]
              : "",
            time:
              s.startTime && s.endTime
                ? `${s.startTime} - ${s.endTime}`
                : s.startTime || "TBD",
            status:
              s.status === "Completed"
                ? ("Completed" as const)
                : ("Scheduled" as const),
          })
        );
        setSessions(sessionsData);

        // Transform transcripts
        const transcriptsData = (transcriptsRes.data || []).map((t: any) => ({
          id: t.id,
          sessionId: t.sessionId,
          createdAt: t.createdAt || new Date().toISOString().split("T")[0],
          status: t.isApproved ? ("Approved" as const) : ("Pending" as const),
          isApproved: t.isApproved || false,
          groupName: "Group",
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          time: "TBD",
          location: "TBD",
          transcriptText: t.transcriptText || "",
          audioFile: t.audioFilePath || "",
        }));
        setTranscripts(transcriptsData);

        // Transform reports
        const reportsData = (reportsRes.data || []).map((r: any) => ({
          id: r.id,
          sessionId: r.sessionId,
          generatedDate:
            r.generatedDate || new Date().toISOString().split("T")[0],
          summary: r.summary || "No summary",
          filePath: r.filePath || "",
        }));
        setReports(reportsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handlers
  const handleAddCouncil = async (data: {
    description: string;
    isActive: boolean;
  }) => {
    try {
      await councilsApi.create({
        councilName: data.description,
        description: "",
      });
      const response = await councilsApi.getAll(false);
      const councilsData = (response.data || []).map((c: CouncilDto) => ({
        id: c.id,
        name: c.councilName || c.majorName || `Council ${c.id}`,
        description: c.description || "",
        createdDate: c.createdDate
          ? new Date(c.createdDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        status: c.isActive ? ("Active" as const) : ("Inactive" as const),
      }));
      setCouncils(councilsData);
      setIsAddCouncilModalOpen(false);
      await swalConfig.success("Success!", "Council created successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Creating Council",
        error.message || "Failed to create council"
      );
    }
  };

  const handleAddGroup = async (data: {
    topicEN: string;
    topicVN: string;
    semesterId: string;
    status: string;
  }) => {
    try {
      await groupsApi.create({
        groupName: data.topicEN,
        projectTitle: data.topicVN,
        semesterId: parseInt(data.semesterId) || 1,
      });
      const response = await groupsApi.getAll(false);
      const groupsData = (response.data || []).map((g: GroupDto) => ({
        id: g.id || "0",
        topicEN: g.projectTitle || "No title",
        topicVN: g.projectTitle || "Không có tiêu đề",
        semester: String(g.semesterId),
        status: "Active" as const,
      }));
      setGroups(groupsData);
      setIsAddGroupModalOpen(false);
      await swalConfig.success("Success!", "Group created successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Creating Group",
        error.message || "Failed to create group"
      );
    }
  };

  const handleAddStudent = async (data: {
    userId: string;
    groupId: string;
    dob: string;
    gender: string;
    role: string;
  }) => {
    try {
      await studentsApi.update(data.userId, {
        studentCode: data.userId,
        fullName: data.userId,
        groupId: data.groupId,
      });
      const response = await studentsApi.getAll();
      const studentsData = (response.data || []).map(
        (s: StudentDto, index: number) => ({
          id: index + 1,
          userId:
            s.studentCode ||
            s.userName ||
            s.fullName ||
            `Student ${s.id?.slice(0, 8) || index + 1}`,
          groupId: `Group ${s.groupId}`,
          dob: s.dateOfBirth || "",
          gender: s.gender || "",
          role: index === 0 ? ("Leader" as const) : ("Member" as const),
        })
      );
      setStudents(studentsData);
      setIsAddStudentModalOpen(false);
      await swalConfig.success("Success!", "Student added successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Adding Student",
        error.message || "Failed to add student"
      );
    }
  };

  const handleEditCouncil = async (
    id: number,
    data: { description: string; isActive: boolean }
  ) => {
    try {
      await councilsApi.update(id, {
        councilName: data.description,
        description: "",
      });
      const response = await councilsApi.getAll(false);
      const councilsData = (response.data || []).map((c: CouncilDto) => ({
        id: c.id,
        name: c.councilName || c.majorName || `Council ${c.id}`,
        description: c.description || "",
        createdDate: c.createdDate
          ? new Date(c.createdDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        status: c.isActive ? ("Active" as const) : ("Inactive" as const),
      }));
      setCouncils(councilsData);
      setIsEditCouncilModalOpen(false);
      setEditingCouncil(null);
      await swalConfig.success("Success!", "Council updated successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Updating Council",
        error.message || "Failed to update council"
      );
    }
  };

  const handleEditGroup = async (
    id: string,
    data: {
      topicEN: string;
      topicVN: string;
      semesterId: string;
      status: string;
    }
  ) => {
    try {
      await groupsApi.update(id, {
        groupName: data.topicEN,
        projectTitle: data.topicVN,
        semesterId: parseInt(data.semesterId) || 1,
      });
      const response = await groupsApi.getAll(false);
      const groupsData = (response.data || []).map((g: GroupDto) => ({
        id: g.id || "0",
        topicEN: g.projectTitle || "No title",
        topicVN: g.projectTitle || "Không có tiêu đề",
        semester: String(g.semesterId),
        status: "Active" as const,
      }));
      setGroups(groupsData);
      setIsEditGroupModalOpen(false);
      setEditingGroup(null);
      await swalConfig.success("Success!", "Group updated successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Updating Group",
        error.message || "Failed to update group"
      );
    }
  };

  const handleEditStudent = async (
    id: number,
    data: {
      userId: string;
      groupId: string;
      dob: string;
      gender: string;
      role: string;
    }
  ) => {
    try {
      const student = students.find((s) => s.id === id);
      if (student) {
        await studentsApi.update(student.userId, {
          studentCode: data.userId,
          fullName: data.userId,
          groupId: data.groupId,
        });
        const response = await studentsApi.getAll();
        const studentsData = (response.data || []).map(
          (s: StudentDto, index: number) => ({
            id: index + 1,
            userId:
              s.studentCode ||
              s.userName ||
              s.fullName ||
              `Student ${s.id?.slice(0, 8) || index + 1}`,
            groupId: `Group ${s.groupId}`,
            dob: s.dateOfBirth || "",
            gender: s.gender || "",
            role: index === 0 ? ("Leader" as const) : ("Member" as const),
          })
        );
        setStudents(studentsData);
        await swalConfig.success("Success!", "Student updated successfully!");
      }
      setIsEditStudentModalOpen(false);
      setEditingStudent(null);
    } catch (error: any) {
      await swalConfig.error(
        "Error Updating Student",
        error.message || "Failed to update student"
      );
    }
  };

  const handleEditSession = async (
    id: number,
    data: {
      groupId: string;
      location: string;
      date: string;
      time: string;
      status: string;
    }
  ) => {
    try {
      await defenseSessionsApi.update(id, {
        groupId: data.groupId,
        defenseDate: data.date,
        startTime: data.time.split(" - ")[0] || data.time,
        endTime: data.time.split(" - ")[1] || data.time,
        location: data.location,
      });
      const response = await defenseSessionsApi.getAll();
      const sessionsData = (response.data || []).map(
        (s: DefenseSessionDto) => ({
          id: s.id,
          groupId: `Group ${s.groupId?.slice(0, 8)}` || "Unknown Group",
          location: s.location || "TBD",
          date: s.defenseDate
            ? new Date(s.defenseDate).toISOString().split("T")[0]
            : "",
          time:
            s.startTime && s.endTime
              ? `${s.startTime} - ${s.endTime}`
              : s.startTime || "TBD",
          status:
            s.status === "Completed"
              ? ("Completed" as const)
              : ("Scheduled" as const),
        })
      );
      setSessions(sessionsData);
      setIsEditSessionModalOpen(false);
      setEditingSession(null);
      await swalConfig.success("Success!", "Session updated successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Updating Session",
        error.message || "Failed to update session"
      );
    }
  };

  // Delete handlers - all using swalConfig consistently
  const handleDeleteCouncil = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Council?",
      `Are you sure you want to delete council with ID: ${id}?`,
      "Yes, delete it!"
    );

    if (result.isConfirmed) {
      try {
        await councilsApi.softDelete(id);
        setCouncils(councils.filter((c) => c.id !== id));
        await swalConfig.success("Deleted!", "Council deleted successfully!");
      } catch (error: any) {
        console.error("Error deleting council:", error);
        await swalConfig.error(
          "Error Deleting Council",
          error.message || "Failed to delete council"
        );
      }
    }
  };

  const handleDeleteGroup = async (id: string) => {
    const result = await swalConfig.confirm(
      "Delete Group?",
      `Are you sure you want to delete this group? This action cannot be undone.`,
      "Yes, delete it!"
    );

    if (!result.isConfirmed) return;

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
  };

  const handleDeleteStudent = async (studentId: string) => {
    const result = await swalConfig.confirm(
      "Delete Student?",
      `Are you sure you want to delete this student? This action cannot be undone.`,
      "Yes, delete it!"
    );

    if (!result.isConfirmed) return;

    try {
      await studentsApi.delete(studentId);
      // Manually refresh students list
      const response = await studentsApi.getAll();
      const studentsData = (response.data || []).map(
        (s: StudentDto, index: number) => ({
          id: index + 1,
          userId:
            s.studentCode ||
            s.userName ||
            s.fullName ||
            `Student ${s.id?.slice(0, 8) || index + 1}`,
          groupId: "No Group Assigned", // Will be updated with proper mapping
          dob: s.dateOfBirth || "",
          gender: s.gender || "",
          role: index === 0 ? ("Leader" as const) : ("Member" as const),
        })
      );
      setStudents(studentsData);
      await swalConfig.success("Deleted!", "Student deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting student:", error);
      await swalConfig.error(
        "Error Deleting Student",
        error.message || "Failed to delete student"
      );
    }
  };

  const handleDeleteSession = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Session?",
      `Are you sure you want to delete this session? This action cannot be undone.`,
      "Yes, delete it!"
    );

    if (!result.isConfirmed) return;

    try {
      await defenseSessionsApi.delete(id);
      setSessions(sessions.filter((s) => s.id !== id));
      await swalConfig.success("Deleted!", "Session deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting session:", error);
      await swalConfig.error(
        "Error Deleting Session",
        error.message || "Failed to delete session"
      );
    }
  };

  const handleDeleteTranscript = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Transcript?",
      `Are you sure you want to delete this transcript? This action cannot be undone.`,
      "Yes, delete it!"
    );

    if (!result.isConfirmed) return;

    try {
      console.log("Deleting transcript with id:", id);
      const response = await transcriptsApi.delete(id);
      console.log("Delete transcript response:", response);

      setTranscripts((prev) => prev.filter((t) => t.id !== id));
      await swalConfig.success("Deleted!", "Transcript deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting transcript:", error);
      await swalConfig.error(
        "Error Deleting Transcript",
        error.message || "Failed to delete transcript"
      );
    }
  };

  const handleDeleteReport = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Report?",
      `Are you sure you want to delete this report? This action cannot be undone.`,
      "Yes, delete it!"
    );

    if (!result.isConfirmed) return;

    try {
      console.log("Deleting report with id:", id);
      const response = await reportsApi.delete(id);
      console.log("Delete report response:", response);

      setReports((prev) => prev.filter((r) => r.id !== id));
      await swalConfig.success("Deleted!", "Report deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting report:", error);
      await swalConfig.error(
        "Error Deleting Report",
        error.message || "Failed to delete report"
      );
    }
  };

  const handleApproveTranscript = async (id: number) => {
    try {
      await transcriptsApi.update(id, {
        isApproved: true,
      });
      const response = await transcriptsApi.getAll();
      const transcriptsData = (response.data || []).map((t: any) => ({
        id: t.id,
        sessionId: t.sessionId,
        createdAt: t.createdAt || new Date().toISOString().split("T")[0],
        status: t.isApproved ? ("Approved" as const) : ("Pending" as const),
        isApproved: t.isApproved || false,
        groupName: "Group",
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: "TBD",
        location: "TBD",
        transcriptText: t.transcriptText || "",
        audioFile: t.audioFilePath || "",
      }));
      setTranscripts(transcriptsData);
      setSelectedTranscript(null);
      await swalConfig.success("Success!", "Transcript approved successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Approving Transcript",
        error.message || "Failed to approve transcript"
      );
    }
  };

  const handleRejectTranscript = async (id: number) => {
    try {
      await transcriptsApi.update(id, {
        isApproved: false,
      });
      const response = await transcriptsApi.getAll();
      const transcriptsData = (response.data || []).map((t: any) => ({
        id: t.id,
        sessionId: t.sessionId,
        createdAt: t.createdAt || new Date().toISOString().split("T")[0],
        status: "Rejected" as const,
        isApproved: false,
        groupName: "Group",
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: "TBD",
        location: "TBD",
        transcriptText: t.transcriptText || "",
        audioFile: t.audioFilePath || "",
      }));
      setTranscripts(transcriptsData);
      setSelectedTranscript(null);
      await swalConfig.success("Rejected", "Transcript rejected successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Rejecting Transcript",
        error.message || "Failed to reject transcript"
      );
    }
  };

  const handleDownloadReport = async (filePath: string) => {
    // simulate download
    await swalConfig.info(
      "Download Started",
      `Simulating download: ${filePath}`
    );
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
          <Plus className="w-4 h-4" /> Add Council
        </button>
      </div>

      <div className="flex items-center mb-4">
        <div className="relative w-72">
          <div className="absolute left-3 top-2">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search councils..."
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading councils...
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-600 text-xs uppercase">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
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
                  <td className="px-3 py-2">{c.name}</td>
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
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-md hover:bg-gray-100"
                        onClick={() => handleDeleteCouncil(c.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
            <Plus className="w-4 h-4" /> Add Group
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative w-96">
          <div className="absolute left-3 top-2">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search groups..."
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading groups...</div>
      ) : (
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
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-md hover:bg-gray-100"
                        onClick={() => handleDeleteGroup(g.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative w-96">
          <div className="absolute left-3 top-2">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search students..."
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading students...
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 text-xs uppercase">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
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
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-md hover:bg-gray-100"
                        onClick={async () => {
                          // Note: Students delete functionality needs student API ID, not display ID
                          await swalConfig.info(
                            "Feature in Development",
                            "Student deletion will be implemented once API ID mapping is fixed."
                          );
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading sessions...
        </div>
      ) : (
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
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-md hover:bg-gray-100"
                        onClick={() => handleDeleteSession(s.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading transcripts...
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 text-xs uppercase">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Session Name</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Approved</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transcripts.map((t) => {
                // Find session name by sessionId
                const session = sessions.find((s) => s.id === t.sessionId);
                const sessionName = session
                  ? `${session.groupId} - ${session.date} ${session.time}`
                  : `Session ${t.sessionId}`;

                return (
                  <tr key={t.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{t.id}</td>
                    <td className="px-3 py-2">{sessionName}</td>
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
                      <div className="inline-flex gap-2">
                        <button
                          className="p-2 rounded-md hover:bg-gray-100"
                          onClick={() => setSelectedTranscript(t)}
                          title="View"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 rounded-md hover:bg-gray-100"
                          onClick={() => handleDeleteTranscript(t.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading reports...</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 text-xs uppercase">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Session Name</th>
                <th className="px-3 py-2">Generated</th>
                <th className="px-3 py-2">Summary</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                // Find session name by sessionId
                const session = sessions.find((s) => s.id === r.sessionId);
                const sessionName = session
                  ? `${session.groupId} - ${session.date} ${session.time}`
                  : `Session ${r.sessionId}`;

                return (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{r.id}</td>
                    <td className="px-3 py-2">{sessionName}</td>
                    <td className="px-3 py-2">{r.generatedDate}</td>
                    <td className="px-3 py-2">{r.summary}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="inline-flex gap-2">
                        <button
                          className="p-2 rounded-md hover:bg-gray-100"
                          onClick={() => setSelectedReport(r)}
                          title="View"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 rounded-md hover:bg-gray-100"
                          onClick={() => handleDownloadReport(r.filePath)}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 rounded-md hover:bg-gray-100"
                          onClick={() => handleDeleteReport(r.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
        studentData={
          editingStudent
            ? {
                ...editingStudent,
                groupId:
                  typeof editingStudent.groupId === "string"
                    ? 0
                    : editingStudent.groupId,
              }
            : null
        }
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
