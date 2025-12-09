"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  X,
  Eye,
} from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { councilsApi } from "@/lib/api/councils";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { transcriptsApi } from "@/lib/api/transcripts";
import { reportsApi } from "@/lib/api/reports";
import { semestersApi } from "@/lib/api/semesters";
import { majorsApi } from "@/lib/api/majors";
import type {
  CouncilDto,
  GroupDto,
  StudentDto,
  DefenseSessionDto,
} from "@/lib/models";

import AddCouncilModal from "../create-sessions/components/AddCouncilModal";
import AddGroupModal from "../create-sessions/components/AddGroupModal";
import AddStudentModal from "../create-sessions/components/AddStudentModal";
import AddSessionModal from "../create-sessions/components/AddSessionModal";
import TranscriptDetailModal from "../create-sessions/components/TranscriptDetailModal";
import ReportDetailModal from "../create-sessions/components/ReportDetailModal";
import EditCouncilModal from "../create-sessions/components/EditCouncilModal";
import EditGroupModal from "../create-sessions/components/EditGroupModal";
import EditStudentModal from "../create-sessions/components/EditStudentModal";
import EditSessionModal from "../create-sessions/components/EditSessionModal";

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

// Types (kept)
type Council = {
  id: number;
  name: string;
  description: string;
  createdDate: string;
  status: "Active" | "Inactive";
  majorId?: number;
};
type Group = GroupDto;
type LocalStudent = {
  id: string; // Real ID from API (can be GUID or student code)
  displayId: number; // Display ID for table (1, 2, 3...)
  userId: string;
  groupId: string; // Store actual group ID for editing
  groupName: string;
  dob: string;
  gender: string;
  role: "Leader" | "Member";
};
type Session = {
  id: number;
  groupId: string | number; // Display value used in UI
  location: string;
  date: string;
  time: string;
  status: "Scheduled" | "InProgress" | "Completed";
  councilId: number;
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

const PAGE_SIZE = 16;

export default function DataManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("councils");
  const [isAddCouncilModalOpen, setIsAddCouncilModalOpen] = useState(false);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [majors, setMajors] = useState<{ id: number; name: string }[]>([]);
  const [semesters, setSemesters] = useState<{ id: number; name: string }[]>(
    []
  );

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

  const [isCouncilImportModalOpen, setIsCouncilImportModalOpen] =
    useState(false);
  const [councilImportMajorId, setCouncilImportMajorId] = useState("");
  const councilFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isStudentImportModalOpen, setIsStudentImportModalOpen] =
    useState(false);

  // Loading states for import/export operations
  const [isDownloadingCouncilTemplate, setIsDownloadingCouncilTemplate] =
    useState(false);
  const [isDownloadingStudentTemplate, setIsDownloadingStudentTemplate] =
    useState(false);
  const [isImportingCouncil, setIsImportingCouncil] = useState(false);
  const [isImportingStudent, setIsImportingStudent] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const studentFileInputRef = useRef<HTMLInputElement | null>(null);

  // State data
  const [councils, setCouncils] = useState<Council[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<LocalStudent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination state for each tab
  const [councilPage, setCouncilPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [transcriptPage, setTranscriptPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);

  const studentGroupOptions = useMemo(
    () =>
      groups.map((group) => ({
        id: String(group.id),
        name:
          group.projectCode ||
          group.groupName ||
          group.topicTitle_EN ||
          group.projectTitle ||
          `Group ${group.id?.slice(0, 8) || "Unknown"}`,
      })),
    [groups]
  );

  const fetchData = useCallback(async () => {
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
        majorsRes,
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
        majorsApi
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

      const groupMap = new Map<string, string>();
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

      const semestersList = (
        Array.isArray(semestersRes.data) ? semestersRes.data : []
      ).map((s: any) => ({
        id: s.id,
        name: s.semesterName || s.name || `Semester ${s.id}`,
      }));
      setSemesters(semestersList);

      const majorsList = (
        Array.isArray(majorsRes.data) ? majorsRes.data : []
      ).map((m: any) => ({
        id: m.id,
        name: m.majorName || m.name || `Major ${m.id}`,
      }));
      setMajors(majorsList);

      setCouncilImportMajorId(
        (prev) => prev || (majorsList.length ? String(majorsList[0].id) : "")
      );

      // Transform councils
      const councilsData = (
        Array.isArray(councilsRes.data) ? councilsRes.data : []
      ).map((c: CouncilDto) => ({
        id: c.id,
        name: c.majorName || `Council ${c.id}`,
        description: c.description || "",
        createdDate: c.createdDate
          ? new Date(c.createdDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        status: c.isActive ? ("Active" as const) : ("Inactive" as const),
        majorId: c.majorId,
      }));
      setCouncils(councilsData);

      // Transform groups (use raw data like admin for consistency)
      const groupsData = (groupsRes.data || []).map((g: GroupDto) => g);
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
            realId: s.id, // Log real ID from API
            groupId: studentGroupId,
            groupIdType: typeof studentGroupId,
            foundInMap: groupMap.get(String(studentGroupId)),
          });

          const actualGroupId = studentGroupId ? String(studentGroupId) : "";
          const groupDisplayName = actualGroupId
            ? groupMap.get(actualGroupId) || `Group ${studentGroupId}`
            : "No Group Assigned";

          return {
            id: s.id, // Use real ID from API instead of index + 1
            displayId: index + 1, // Add display ID for table
            userId:
              s.fullName ||
              s.userName ||
              s.studentCode ||
              `Student ${s.id?.slice(0, 8) || index + 1}`,
            groupId: actualGroupId,
            groupName: groupDisplayName,
            dob: s.dateOfBirth ? s.dateOfBirth.split("T")[0] : "", // Format to yyyy-MM-dd
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
              : s.status === "InProgress"
              ? ("InProgress" as const)
              : ("Scheduled" as const),
          councilId: s.councilId ?? 0,
        })
      );
      setSessions(sessionsData);

      // Transform transcripts
      const transcriptsData = (transcriptsRes.data || []).map((t: any) => ({
        id: t.id,
        sessionId: t.sessionId,
        createdAt:
          formatDateOnly(t.createdAt) ||
          formatDateOnly(new Date().toISOString()),
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
          formatDateOnly(r.generatedDate) ||
          formatDateOnly(new Date().toISOString()),
        summary: r.summary || "No summary",
        filePath: r.filePath || "",
      }));
      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleAddCouncil = async (data: {
    majorId: number;
    description: string;
    isActive: boolean;
  }) => {
    try {
      await councilsApi.create({
        majorId: data.majorId,
        description: data.description || undefined,
        isActive: data.isActive,
      });
      const response = await councilsApi.getAll(false);
      const councilsData = (response.data || []).map((c: CouncilDto) => ({
        id: c.id,
        name: c.majorName || `Council ${c.id}`,
        description: c.description || "",
        createdDate: c.createdDate
          ? new Date(c.createdDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        status: c.isActive ? ("Active" as const) : ("Inactive" as const),
        majorId: c.majorId,
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

  const handleOpenCouncilImport = () => {
    if (!majors.length) {
      swalConfig.error(
        "No Majors",
        "Please create at least one major before importing councils."
      );
      return;
    }
    setCouncilImportMajorId((prev) => prev || String(majors[0].id));
    setIsCouncilImportModalOpen(true);
  };

  const handleCouncilDownloadTemplate = async () => {
    try {
      setIsDownloadingCouncilTemplate(true);
      swalConfig.loading("Đang tải template...", "Vui lòng chờ trong giây lát");

      await councilsApi.downloadTemplate();

      await swalConfig.success(
        "Template Downloaded",
        "Council template has been downloaded successfully."
      );
    } catch (error: any) {
      console.error("Download template error:", error);
      await swalConfig.error(
        "Download Failed",
        error.message || "Unable to download council template."
      );
    } finally {
      setIsDownloadingCouncilTemplate(false);
    }
  };

  const handleCouncilFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!councilImportMajorId) {
      await swalConfig.error(
        "Missing Major",
        "Please select a major before importing."
      );
      event.target.value = "";
      return;
    }

    try {
      setIsImportingCouncil(true);
      swalConfig.loading(
        "Đang import dữ liệu...",
        "Vui lòng chờ hệ thống xử lý file"
      );

      const result = await councilsApi.importWithCommittees(
        Number(councilImportMajorId),
        file
      );
      const data = result?.data || result;
      const message =
        (data as any)?.message ||
        `Successfully imported. Councils: ${
          (data as any)?.createdCouncilIds?.length || 0
        }, Assignments: ${
          (data as any)?.createdCommitteeAssignmentIds?.length || 0
        }`;
      await swalConfig.success("Import Complete", message);
      await fetchData();
      setIsCouncilImportModalOpen(false);
      setCouncilImportMajorId("");
      event.target.value = "";
    } catch (error: any) {
      setIsImportingCouncil(false);
      console.error("Import council error:", error);
      await swalConfig.error(
        "Import Failed",
        error.message || "Unable to import councils."
      );
      event.target.value = "";
    } finally {
      setIsImportingCouncil(false);
    }
  };

  const handleAddGroup = async (data: {
    topicEN: string;
    topicVN: string;
    semesterId: string;
    majorId: string;
    status: string;
  }) => {
    try {
      await groupsApi.create({
        projectCode: data.topicEN,
        topicTitle_EN: data.topicEN,
        topicTitle_VN: data.topicVN,
        semesterId: parseInt(data.semesterId) || 1,
        majorId: parseInt(data.majorId) || 1,
        status: data.status,
      });
      const response = await groupsApi.getAll(false);
      const groupsData = (response.data || []).map((g: GroupDto) => ({
        id: g.id || "0",
        topicEN: g.projectTitle || "No title",
        topicVN: g.projectTitle || "No title",
        semester:
          semesters.find((s) => s.id === g.semesterId)?.name ||
          `Semester ${g.semesterId}`,
        semesterId: g.semesterId || 1,
        majorId: g.majorId || 1,
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
      console.log("Add student data:", data);

      // Validate age (must be at least 18 years old)
      if (data.dob) {
        const today = new Date();
        const birthDate = new Date(data.dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        if (age < 18) {
          await swalConfig.error(
            "Invalid Age",
            "Student must be at least 18 years old"
          );
          return;
        }
      }

      const createPayload = {
        studentCode: data.userId,
        fullName: data.userId,
        userName: data.userId, // Add userName field since API response shows this is the main name field
        groupId: data.groupId,
        dateOfBirth: data.dob,
        gender: data.gender,
      };
      console.log("Create student payload:", createPayload);

      await studentsApi.create(createPayload);
      await fetchData();
      setIsAddStudentModalOpen(false);
      await swalConfig.success("Success!", "Student added successfully!");
    } catch (error: any) {
      await swalConfig.error(
        "Error Adding Student",
        error.message || "Failed to add student"
      );
    }
  };

  const handleAddSession = async (data: {
    groupId: string;
    location: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    councilId: number;
  }) => {
    try {
      await defenseSessionsApi.create({
        groupId: data.groupId,
        defenseDate: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        status: data.status,
        councilId: data.councilId,
      });
      await fetchData(); // Refresh the sessions list
      setIsAddSessionModalOpen(false);
      await swalConfig.success(
        "Success!",
        "Defense session created successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Creating Session",
        error.message || "Failed to create defense session"
      );
    }
  };

  const handleOpenStudentImport = () => {
    setIsStudentImportModalOpen(true);
  };

  const handleStudentDownloadTemplate = async () => {
    try {
      setIsDownloadingStudentTemplate(true);
      swalConfig.loading("Đang tải template...", "Vui lòng chờ trong giây lát");

      await studentsApi.downloadTemplate();

      await swalConfig.success(
        "Template Downloaded",
        "Student template has been downloaded successfully."
      );
    } catch (error: any) {
      console.error("Download template error:", error);
      await swalConfig.error(
        "Download Failed",
        error.message || "Unable to download student template."
      );
    } finally {
      setIsDownloadingStudentTemplate(false);
    }
  };

  const handleStudentFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImportingStudent(true);
      swalConfig.loading(
        "Đang import dữ liệu sinh viên...",
        "Vui lòng chờ hệ thống xử lý file"
      );

      const result = await studentsApi.import(file);
      const data = result?.data || result;
      const message =
        (data as any)?.message ||
        `Successfully imported ${data?.successCount || 0} student(s).${
          data?.failureCount ? ` Failed: ${data.failureCount}` : ""
        }`;
      await swalConfig.success("Import Complete", message);
      await fetchData();
      setIsStudentImportModalOpen(false);
      event.target.value = "";
    } catch (error: any) {
      setIsImportingStudent(false);
      console.error("Import student error:", error);
      await swalConfig.error(
        "Import Failed",
        error.message || "Unable to import students."
      );
      event.target.value = "";
    } finally {
      setIsImportingStudent(false);
    }
  };

  const handleEditCouncil = async (
    id: number,
    data: { majorId: number; description: string; isActive: boolean }
  ) => {
    try {
      await councilsApi.update(id, {
        majorId: data.majorId,
        description: data.description || undefined,
        isActive: data.isActive,
      });
      const response = await councilsApi.getAll(false);
      const councilsData = (response.data || []).map((c: CouncilDto) => ({
        id: c.id,
        name: c.majorName || `Council ${c.id}`,
        description: c.description || "",
        createdDate: c.createdDate
          ? new Date(c.createdDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        status: c.isActive ? ("Active" as const) : ("Inactive" as const),
        majorId: c.majorId,
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
      majorId: string;
      status: string;
    }
  ) => {
    try {
      await groupsApi.update(id, {
        projectCode: data.topicEN,
        topicTitle_EN: data.topicEN,
        topicTitle_VN: data.topicVN,
        semesterId: parseInt(data.semesterId) || 1,
        majorId: parseInt(data.majorId) || 1,
        status: data.status,
      });
      const response = await groupsApi.getAll(false);
      const groupsData = (response.data || []).map((g: GroupDto) => ({
        id: g.id || "0",
        topicEN: g.projectTitle || "No title",
        topicVN: g.projectTitle || "No title",
        semester:
          semesters.find((s) => s.id === g.semesterId)?.name ||
          `Semester ${g.semesterId}`,
        semesterId: g.semesterId || 1,
        majorId: g.majorId || 1,
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
    id: string, // Changed from number to string
    data: {
      userId: string;
      groupId: string;
      dob: string;
      gender: string;
      role: string;
    }
  ) => {
    try {
      console.log("Edit student data:", { id, data });
      const student = students.find((s) => s.id === id); // Now both are strings
      console.log("Found student:", student);

      if (student) {
        const updatePayload = {
          studentCode: data.userId,
          fullName: data.userId,
          groupId: data.groupId,
        };
        console.log("Update student payload:", updatePayload);

        await studentsApi.update(student.id, updatePayload);
        await fetchData();
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
      councilId: number;
    }
  ) => {
    try {
      console.log("Edit session data:", data);

      // Find the actual group ID from the display name
      let actualGroupId = data.groupId;

      // If groupId looks like a display name (contains letters/dashes), find the real ID
      if (
        data.groupId &&
        (data.groupId.includes("-") || data.groupId.match(/[a-zA-Z]/))
      ) {
        const group = groups.find(
          (g) =>
            g.topicTitle_EN === data.groupId ||
            g.topicTitle_VN === data.groupId ||
            `Group ${g.id?.slice(0, 8)}` === data.groupId
        );
        if (group) {
          actualGroupId = group.id;
        } else {
          console.warn("Could not find group with display name:", data.groupId);
          // Try to find any group as fallback
          const firstGroup = groups[0];
          if (firstGroup) {
            actualGroupId = firstGroup.id;
            console.log("Using fallback group:", firstGroup.id);
          }
        }
      }

      console.log("Using actualGroupId:", actualGroupId);

      // Handle time properly - data.time could be just start time or start-end time format
      let startTime, endTime;
      if (data.time.includes(" - ")) {
        [startTime, endTime] = data.time.split(" - ");
      } else {
        startTime = data.time;
        // Default end time to 1 hour after start time
        const startDate = new Date(`2000-01-01 ${data.time}`);
        startDate.setHours(startDate.getHours() + 1);
        endTime = startDate.toTimeString().slice(0, 5);
      }

      // Ensure date is in ISO format (YYYY-MM-DD)
      let formattedDate = data.date;
      if (data.date && data.date.includes("/")) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const parts = data.date.split("/");
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1].padStart(
            2,
            "0"
          )}-${parts[0].padStart(2, "0")}`;
        }
      }

      const updatePayload = {
        groupId: actualGroupId,
        defenseDate: formattedDate,
        startTime: startTime,
        endTime: endTime,
        location: data.location,
        status: data.status,
        councilId: data.councilId,
      };

      console.log("Update payload:", updatePayload);

      await defenseSessionsApi.update(id, updatePayload);
      const response = await defenseSessionsApi.getAll();
      const sessionsData = (response.data || []).map((s: DefenseSessionDto) => {
        // Find group name from groups state
        const group = groups.find((g) => g.id === s.groupId);
        const groupDisplayName =
          group?.topicTitle_EN ||
          group?.topicTitle_VN ||
          `Group ${s.groupId?.slice(0, 8)}` ||
          "Unknown Group";

        return {
          id: s.id,
          groupId: groupDisplayName,
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
              : s.status === "InProgress" || s.status === "Ongoing"
              ? ("InProgress" as const)
              : ("Scheduled" as const),
          councilId: s.councilId ?? 0,
        };
      });
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
    console.log("Delete student called with ID:", studentId);
    console.log("Student ID type:", typeof studentId);

    // Find the actual student to get more info
    const student = students.find(
      (s) => s.id.toString() === studentId.toString() || s.userId === studentId
    );
    console.log("Found student for deletion:", student);

    const result = await swalConfig.confirm(
      "Delete Student?",
      `Are you sure you want to delete student: ${
        student?.userId || studentId
      }? This action cannot be undone.`,
      "Yes, delete it!"
    );

    if (!result.isConfirmed) return;

    try {
      console.log("Calling API delete with studentId:", studentId);
      const deleteResponse = await studentsApi.delete(studentId);
      console.log("Delete student API response:", deleteResponse);
      await fetchData();
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
    try {
      if (!filePath) {
        await swalConfig.error(
          "Download Failed",
          "File path is not available."
        );
        return;
      }

      setIsDownloadingReport(true);
      
      // If filePath is a URL, open it in a new window
      if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
        window.open(filePath, "_blank");
        await swalConfig.success(
          "Download Started",
          "Report is being opened in a new tab."
        );
      } else {
        // If it's a relative path, try to download it
        const link = document.createElement("a");
        link.href = filePath;
        link.download = filePath.split("/").pop() || "report.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      await swalConfig.success(
        "Download Complete",
        "Report has been downloaded successfully."
      );
      }
    } catch (error: any) {
      console.error("Download report error:", error);
      await swalConfig.error(
        "Download Failed",
        error.message || "Unable to download report."
      );
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // Pagination calculations
  const paginatedCouncils = useMemo(() => {
    const startIndex = (councilPage - 1) * PAGE_SIZE;
    return councils.slice(startIndex, startIndex + PAGE_SIZE);
  }, [councils, councilPage]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (groupPage - 1) * PAGE_SIZE;
    return groups.slice(startIndex, startIndex + PAGE_SIZE);
  }, [groups, groupPage]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (studentPage - 1) * PAGE_SIZE;
    return students.slice(startIndex, startIndex + PAGE_SIZE);
  }, [students, studentPage]);

  const paginatedSessions = useMemo(() => {
    const startIndex = (sessionPage - 1) * PAGE_SIZE;
    return sessions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sessions, sessionPage]);

  const paginatedTranscripts = useMemo(() => {
    const startIndex = (transcriptPage - 1) * PAGE_SIZE;
    return transcripts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [transcripts, transcriptPage]);

  const paginatedReports = useMemo(() => {
    const startIndex = (reportPage - 1) * PAGE_SIZE;
    return reports.slice(startIndex, startIndex + PAGE_SIZE);
  }, [reports, reportPage]);

  // Total pages calculations
  const councilTotalPages = Math.max(1, Math.ceil(councils.length / PAGE_SIZE));
  const groupTotalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const studentTotalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const sessionTotalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const transcriptTotalPages = Math.max(
    1,
    Math.ceil(transcripts.length / PAGE_SIZE)
  );
  const reportTotalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));

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

  // Render helpers (UI only)
  const renderCouncilsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Council Management
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-500 text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCouncilDownloadTemplate}
            disabled={isDownloadingCouncilTemplate}
          >
            {isDownloadingCouncilTemplate ? (
              <>
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Template
              </>
            )}
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-500 text-sm font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleOpenCouncilImport}
            disabled={isImportingCouncil}
          >
            {isImportingCouncil ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Import File
              </>
            )}
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm"
            onClick={() => setIsAddCouncilModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add Council
          </button>
        </div>
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
              {paginatedCouncils.map((c) => (
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
      {renderPagination(councilPage, councilTotalPages, setCouncilPage)}
    </div>
  );

  const renderGroupsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
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
                <th className="px-3 py-2">Project Code</th>
                <th className="px-3 py-2">Title (EN)</th>
                <th className="px-3 py-2">Title (VN)</th>
                <th className="px-3 py-2">Semester</th>
                <th className="px-3 py-2">Major</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGroups.map((g) => (
                <tr key={g.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{g.projectCode || "N/A"}</td>
                  <td className="px-3 py-2 max-w-48 truncate">
                    {g.topicTitle_EN || "N/A"}
                  </td>
                  <td className="px-3 py-2 max-w-48 truncate">
                    {g.topicTitle_VN || "N/A"}
                  </td>
                  <td className="px-3 py-2">{g.semesterName || "N/A"}</td>
                  <td className="px-3 py-2">{g.majorName || "N/A"}</td>
                  <td className="px-3 py-2">
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
      {renderPagination(groupPage, groupTotalPages, setGroupPage)}
    </div>
  );

  const renderStudentsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Student Management
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-500 text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleStudentDownloadTemplate}
            disabled={isDownloadingStudentTemplate}
          >
            {isDownloadingStudentTemplate ? (
              <>
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Template
              </>
            )}
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-500 text-sm font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => studentFileInputRef.current?.click()}
            disabled={isImportingStudent}
          >
            {isImportingStudent ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Import File
              </>
            )}
          </button>
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
              {paginatedStudents.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{s.displayId}</td>
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
                        onClick={() => handleDeleteStudent(s.id)} // Use real ID, not String conversion
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
      {renderPagination(studentPage, studentTotalPages, setStudentPage)}
    </div>
  );

  // sessions / transcripts / reports reuse same styling
  const renderSessionsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Defense Session Management
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm"
            onClick={() => setIsAddSessionModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add Session
          </button>
        </div>
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
              {paginatedSessions.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{s.id}</td>
                  <td className="px-3 py-2">{s.groupId}</td>
                  <td className="px-3 py-2">{s.location}</td>
                  <td className="px-3 py-2">{s.date}</td>
                  <td className="px-3 py-2">{s.time}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        s.status === "Completed"
                          ? "bg-green-50 text-green-700"
                          : s.status === "InProgress"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
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
      {renderPagination(sessionPage, sessionTotalPages, setSessionPage)}
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
              {paginatedTranscripts.map((t) => {
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
                          className="px-3 py-1 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                          onClick={() => setSelectedTranscript(t)}
                          title="View"
                        >
                          View
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
      {renderPagination(
        transcriptPage,
        transcriptTotalPages,
        setTranscriptPage
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
              {paginatedReports.map((r) => {
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
                          className="px-3 py-1 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                          onClick={() => setSelectedReport(r)}
                          title="View"
                        >
                          View
                        </button>
                        {/* Download button with loading state */}
                        <button
                          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDownloadReport(r.filePath)}
                          disabled={isDownloadingReport}
                          title="Download"
                        >
                          {isDownloadingReport ? (
                            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
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
      {renderPagination(reportPage, reportTotalPages, setReportPage)}
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
        majorOptions={majors}
      />
      <AddGroupModal
        isOpen={isAddGroupModalOpen}
        onClose={() => setIsAddGroupModalOpen(false)}
        onSubmit={handleAddGroup}
        majorOptions={majors}
        semesterOptions={semesters}
      />
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSubmit={handleAddStudent}
        groupOptions={groups.map((g) => ({
          id: g.id,
          name:
            g.topicTitle_EN ||
            g.topicTitle_VN ||
            g.groupName ||
            `Group ${g.id}`,
        }))}
      />
      <AddSessionModal
        isOpen={isAddSessionModalOpen}
        onClose={() => setIsAddSessionModalOpen(false)}
        onSubmit={handleAddSession}
        groupOptions={groups.map((g) => ({
          id: g.id,
          name:
            g.topicTitle_EN ||
            g.topicTitle_VN ||
            g.groupName ||
            `Group ${g.id}`,
        }))}
        councilOptions={councils.map((c) => ({ id: c.id, name: c.name }))}
      />

      <EditCouncilModal
        isOpen={isEditCouncilModalOpen}
        onClose={() => {
          setIsEditCouncilModalOpen(false);
          setEditingCouncil(null);
        }}
        onSubmit={handleEditCouncil}
        councilData={editingCouncil}
        majorOptions={majors}
      />
      <EditGroupModal
        isOpen={isEditGroupModalOpen}
        onClose={() => {
          setIsEditGroupModalOpen(false);
          setEditingGroup(null);
        }}
        onSubmit={handleEditGroup}
        groupData={
          editingGroup
            ? {
                id: editingGroup.id,
                topicEN: editingGroup.topicTitle_EN || "",
                topicVN: editingGroup.topicTitle_VN || "",
                semester: editingGroup.semesterName || "",
                semesterId: editingGroup.semesterId || 1,
                majorId: editingGroup.majorId || 1,
                status: editingGroup.status || "Active",
              }
            : null
        }
        majorOptions={majors}
        semesterOptions={semesters}
      />
      <EditStudentModal
        isOpen={isEditStudentModalOpen}
        onClose={() => {
          setIsEditStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={handleEditStudent}
        studentData={editingStudent}
        groupOptions={studentGroupOptions}
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
        // Tạm ẩn download
        // onDownload={handleDownloadReport}
      />

      {/* Hidden import inputs */}
      <input
        ref={councilFileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleCouncilFileChange}
      />
      <input
        ref={studentFileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleStudentFileChange}
      />

      {/* Council import modal */}
      {isCouncilImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Upload className="w-5 h-5 text-purple-500" />
                  Import Councils
                </div>
                <p className="text-sm text-gray-500">
                  Select a major and upload the council-committee template.
                </p>
              </div>
              <button
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setIsCouncilImportModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Major
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  value={councilImportMajorId}
                  onChange={(e) => setCouncilImportMajorId(e.target.value)}
                >
                  {majors.length === 0 && (
                    <option value="">No majors available</option>
                  )}
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-500 text-sm font-medium text-purple-600 hover:bg-purple-50 w-full justify-center"
                onClick={() => councilFileInputRef.current?.click()}
                disabled={!councilImportMajorId}
              >
                <Upload className="w-4 h-4" /> Choose File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student import modal */}
      {isStudentImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Upload className="w-5 h-5 text-purple-500" />
                  Import Students
                </div>
                <p className="text-sm text-gray-500">
                  Upload the student template to bulk create accounts.
                </p>
              </div>
              <button
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setIsStudentImportModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-500 text-sm font-medium text-green-600 hover:bg-green-50 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleStudentDownloadTemplate}
                disabled={isDownloadingStudentTemplate}
              >
                {isDownloadingStudentTemplate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Template
                  </>
                )}
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-500 text-sm font-medium text-purple-600 hover:bg-purple-50 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => studentFileInputRef.current?.click()}
                disabled={isImportingStudent}
              >
                {isImportingStudent ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Choose File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
