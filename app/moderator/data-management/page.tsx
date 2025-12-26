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
import { getSimpleErrorMessage } from "@/lib/utils/apiError";
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
  const [semesters, setSemesters] = useState<
    {
      id: number;
      name: string;
      startDate?: string;
      endDate?: string;
      isDefault?: boolean;
    }[]
  >([]);

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

  const [isStudentImportModalOpen, setIsStudentImportModalOpen] =
    useState(false);

  // Loading states for import/export operations
  const [isDownloadingStudentTemplate, setIsDownloadingStudentTemplate] =
    useState(false);
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

  // Search state for each tab
  const [councilSearch, setCouncilSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");

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

  // Function to automatically select the most appropriate semester based on current date
  const getDefaultSemesterId = (semesterList: any[]): number | null => {
    if (!semesterList.length) return null;

    const currentDate = new Date();

    // Find semester where current date is between startDate and endDate
    const activeSemester = semesterList.find((semester) => {
      if (semester.startDate && semester.endDate) {
        const startDate = new Date(semester.startDate);
        const endDate = new Date(semester.endDate);
        return currentDate >= startDate && currentDate <= endDate;
      }
      return false;
    });

    if (activeSemester) {
      return activeSemester.id;
    }

    // If no active semester, find the nearest upcoming semester
    const upcomingSemesters = semesterList
      .filter(
        (semester) =>
          semester.startDate && new Date(semester.startDate) > currentDate
      )
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

    if (upcomingSemesters.length > 0) {
      return upcomingSemesters[0].id;
    }

    // If no upcoming semester, get the most recent semester
    const pastSemesters = semesterList
      .filter(
        (semester) =>
          semester.endDate && new Date(semester.endDate) < currentDate
      )
      .sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      );

    if (pastSemesters.length > 0) {
      return pastSemesters[0].id;
    }

    // Fallback to first semester
    return semesterList[0].id;
  };

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
        startDate: s.startDate,
        endDate: s.endDate,
        isDefault: false, // Will be set below
      }));

      // Set default semester based on current date
      const defaultSemesterId = getDefaultSemesterId(semestersList);
      const processedSemestersList = semestersList.map((s: any) => ({
        ...s,
        isDefault: s.id === defaultSemesterId,
      }));

      setSemesters(processedSemestersList);

      const majorsList = (
        Array.isArray(majorsRes.data) ? majorsRes.data : []
      ).map((m: any) => ({
        id: m.id,
        name: m.majorName || m.name || `Major ${m.id}`,
      }));
      setMajors(majorsList);

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

          const actualGroupId = studentGroupId ? String(studentGroupId) : "";
          const groupDisplayName = actualGroupId
            ? groupMap.get(actualGroupId) || `Group ${studentGroupId}`
            : "No Group Assigned";

          // Extract and normalize the role from API data
          const rawRole = (s as any).groupRole || (s as any).GroupRole;
          const normalizedRole: "Leader" | "Member" = rawRole
            ? rawRole.toLowerCase().includes("leader")
              ? ("Leader" as const)
              : ("Member" as const)
            : index === 0
            ? ("Leader" as const)
            : ("Member" as const);

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
            role: normalizedRole,
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
      // Error fetching data
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
      await swalConfig.success(
        "Success",
        "Council has been created successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Creating Council",
        getSimpleErrorMessage(error, "Failed to create council")
      );
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
      await swalConfig.success(
        "Success",
        "Group has been created successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Creating Group",
        getSimpleErrorMessage(error, "Failed to create group")
      );
    }
  };

  const handleAddStudent = async (data: {
    userId: string;
    groupId: string;
    dob: string;
    gender: string;
    role: string;
    semesterId: string;
  }) => {
    try {
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
        semesterId: Number(data.semesterId), // Include semester ID in the payload
      };

      await studentsApi.create(createPayload);
      await fetchData();
      setIsAddStudentModalOpen(false);
      await swalConfig.success(
        "Success",
        "Student has been created successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Adding Student",
        getSimpleErrorMessage(error, "Failed to add student")
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
        "Success",
        "Defense session has been created successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Creating Session",
        getSimpleErrorMessage(error, "Failed to create defense session")
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
      await swalConfig.error(
        "Download Failed",
        getSimpleErrorMessage(error, "Unable to download student template.")
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
      swalConfig.loading("Importing Students...", "Processing file...");

      const result = await studentsApi.import(file);
      const data = result?.data || result;

      // Check if import actually succeeded
      const successCount = (data as any)?.successCount || 0;
      const failureCount = (data as any)?.failureCount || 0;

      // If all imports failed or no students were imported, show error
      if (successCount === 0) {
        setIsImportingStudent(false);
        const errorMsg =
          (data as any)?.message ||
          (failureCount > 0
            ? `Import failed. All ${failureCount} student(s) could not be imported.`
            : "Import failed. No students were imported.");
        await swalConfig.error("Import Failed", errorMsg);
        event.target.value = "";
        return;
      }

      // Show success with details
      const message =
        (data as any)?.message ||
        `Successfully imported ${successCount} student(s).${
          failureCount ? ` Failed: ${failureCount}` : ""
        }`;
      await swalConfig.success("Import Complete", message);
      await fetchData();
      setIsStudentImportModalOpen(false);
      event.target.value = "";
    } catch (error: any) {
      setIsImportingStudent(false);
      await swalConfig.error(
        "Import Failed",
        getSimpleErrorMessage(error, "Unable to import students.")
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
      await swalConfig.success(
        "Success",
        "Council has been updated successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Updating Council",
        getSimpleErrorMessage(error, "Failed to update council")
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
      // Find the original group to get projectCode
      const originalGroup = groups.find((g) => g.id === id);
      if (!originalGroup) {
        await swalConfig.error("Error", "Group not found");
        return;
      }

      // Use existing projectCode from the group, don't change it
      // projectCode has strict format validation (FA25SE135 format)
      const projectCode = originalGroup.projectCode || "";

      await groupsApi.update(id, {
        projectCode: projectCode, // Keep existing projectCode
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
      await swalConfig.success(
        "Success",
        "Group has been updated successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Updating Group",
        getSimpleErrorMessage(error, "Failed to update group")
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
      const student = students.find((s) => s.id === id); // Now both are strings

      if (student) {
        const updatePayload = {
          studentCode: data.userId,
          fullName: data.userId,
          groupId: data.groupId,
          dateOfBirth: data.dob,
          gender: data.gender,
        };

        await studentsApi.update(student.id, updatePayload);
        await fetchData(); // This will refresh the data and update group info
        await swalConfig.success(
          "Success",
          "Student has been updated successfully!"
        );
      }
      setIsEditStudentModalOpen(false);
      setEditingStudent(null);
    } catch (error: any) {
      await swalConfig.error(
        "Error Updating Student",
        getSimpleErrorMessage(error, "Failed to update student")
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
          // Try to find any group as fallback
          const firstGroup = groups[0];
          if (firstGroup) {
            actualGroupId = firstGroup.id;
          }
        }
      }

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
      await swalConfig.success(
        "Success",
        "Session has been updated successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Updating Session",
        getSimpleErrorMessage(error, "Failed to update session")
      );
    }
  };
  // Delete handlers - all using swalConfig consistently
  const handleDeleteCouncil = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Council",
      `Are you sure you want to delete this council? This action cannot be undone.`,
      "Yes, Delete"
    );

    if (result.isConfirmed) {
      try {
        await councilsApi.softDelete(id);
        setCouncils(councils.filter((c) => c.id !== id));
        await swalConfig.success(
          "Success",
          "Council has been deleted successfully!"
        );
      } catch (error: any) {
        await swalConfig.error(
          "Delete Failed",
          getSimpleErrorMessage(error, "Failed to delete council")
        );
      }
    }
  };

  const handleDeleteGroup = async (id: string) => {
    const result = await swalConfig.confirm(
      "Delete Group",
      `Are you sure you want to delete this group? This action cannot be undone.`,
      "Yes, Delete"
    );

    if (!result.isConfirmed) return;

    try {
      await groupsApi.delete(id);
      setGroups(groups.filter((g) => g.id !== id));
      await swalConfig.success(
        "Success",
        "Group has been deleted successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Delete Failed",
        getSimpleErrorMessage(error, "Failed to delete group")
      );
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    // Find the actual student to get more info
    const student = students.find(
      (s) => s.id.toString() === studentId.toString() || s.userId === studentId
    );

    const result = await swalConfig.confirm(
      "Delete Student",
      `Are you sure you want to delete student: ${
        student?.userId || studentId
      }? This action cannot be undone.`,
      "Yes, Delete"
    );

    if (!result.isConfirmed) return;

    try {
      await studentsApi.delete(studentId);
      await fetchData();
      await swalConfig.success(
        "Success",
        "Student has been deleted successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Deleting Student",
        getSimpleErrorMessage(error, "Failed to delete student")
      );
    }
  };

  const handleDeleteSession = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Session",
      `Are you sure you want to delete this session? This action cannot be undone.`,
      "Yes, Delete"
    );

    if (!result.isConfirmed) return;

    try {
      await defenseSessionsApi.delete(id);
      setSessions(sessions.filter((s) => s.id !== id));
      await swalConfig.success(
        "Success",
        "Session has been deleted successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Deleting Session",
        getSimpleErrorMessage(error, "Failed to delete session")
      );
    }
  };

  const handleDeleteTranscript = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Transcript",
      `Are you sure you want to delete this transcript? This action cannot be undone.`,
      "Yes, Delete"
    );

    if (!result.isConfirmed) return;

    try {
      await transcriptsApi.delete(id);

      setTranscripts((prev) => prev.filter((t) => t.id !== id));
      await swalConfig.success(
        "Success",
        "Transcript has been deleted successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Deleting Transcript",
        getSimpleErrorMessage(error, "Failed to delete transcript")
      );
    }
  };

  const handleDeleteReport = async (id: number) => {
    const result = await swalConfig.confirm(
      "Delete Report",
      `Are you sure you want to delete this report? This action cannot be undone.`,
      "Yes, Delete"
    );

    if (!result.isConfirmed) return;

    try {
      await reportsApi.delete(id);

      setReports((prev) => prev.filter((r) => r.id !== id));
      await swalConfig.success(
        "Success",
        "Report has been deleted successfully!"
      );
    } catch (error: any) {
      await swalConfig.error(
        "Error Deleting Report",
        getSimpleErrorMessage(error, "Failed to delete report")
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
      await swalConfig.error(
        "Download Failed",
        getSimpleErrorMessage(error, "Unable to download report.")
      );
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // Filtered data based on search
  const filteredCouncils = useMemo(() => {
    if (!councilSearch.trim()) return councils;
    const searchLower = councilSearch.toLowerCase().trim();
    return councils.filter(
      (c) =>
        c.id.toString().includes(searchLower) ||
        c.name.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower) ||
        c.createdDate.toLowerCase().includes(searchLower) ||
        c.status.toLowerCase().includes(searchLower)
    );
  }, [councils, councilSearch]);

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const searchLower = groupSearch.toLowerCase().trim();
    return groups.filter(
      (g) =>
        (g.id && String(g.id).toLowerCase().includes(searchLower)) ||
        (g.projectCode && g.projectCode.toLowerCase().includes(searchLower)) ||
        (g.topicTitle_EN &&
          g.topicTitle_EN.toLowerCase().includes(searchLower)) ||
        (g.topicTitle_VN &&
          g.topicTitle_VN.toLowerCase().includes(searchLower)) ||
        (g.projectTitle &&
          g.projectTitle.toLowerCase().includes(searchLower)) ||
        (g.semesterName &&
          g.semesterName.toLowerCase().includes(searchLower)) ||
        (g.majorName && g.majorName.toLowerCase().includes(searchLower)) ||
        (g.status && g.status.toLowerCase().includes(searchLower))
    );
  }, [groups, groupSearch]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const searchLower = studentSearch.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.displayId.toString().includes(searchLower) ||
        s.userId.toLowerCase().includes(searchLower) ||
        s.groupName.toLowerCase().includes(searchLower) ||
        s.dob.toLowerCase().includes(searchLower) ||
        s.gender.toLowerCase().includes(searchLower) ||
        s.role.toLowerCase().includes(searchLower)
    );
  }, [students, studentSearch]);

  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    const searchLower = sessionSearch.toLowerCase().trim();
    return sessions.filter(
      (s) =>
        s.id.toString().includes(searchLower) ||
        String(s.groupId).toLowerCase().includes(searchLower) ||
        s.location.toLowerCase().includes(searchLower) ||
        s.date.toLowerCase().includes(searchLower) ||
        s.time.toLowerCase().includes(searchLower) ||
        s.status.toLowerCase().includes(searchLower)
    );
  }, [sessions, sessionSearch]);

  const filteredTranscripts = useMemo(() => {
    if (!transcriptSearch.trim()) return transcripts;
    const searchLower = transcriptSearch.toLowerCase().trim();
    return transcripts.filter((t) => {
      const session = sessions.find((s) => s.id === t.sessionId);
      const sessionName = session
        ? `${session.groupId} - ${session.date} ${session.time}`
        : `Session ${t.sessionId}`;
      return (
        t.id.toString().includes(searchLower) ||
        sessionName.toLowerCase().includes(searchLower) ||
        t.createdAt.toLowerCase().includes(searchLower) ||
        t.status.toLowerCase().includes(searchLower) ||
        (t.isApproved ? "yes" : "no").includes(searchLower)
      );
    });
  }, [transcripts, transcriptSearch, sessions]);

  const filteredReports = useMemo(() => {
    if (!reportSearch.trim()) return reports;
    const searchLower = reportSearch.toLowerCase().trim();
    return reports.filter((r) => {
      const session = sessions.find((s) => s.id === r.sessionId);
      const sessionName = session
        ? `${session.groupId} - ${session.date} ${session.time}`
        : `Session ${r.sessionId}`;
      return (
        r.id.toString().includes(searchLower) ||
        sessionName.toLowerCase().includes(searchLower) ||
        r.generatedDate.toLowerCase().includes(searchLower) ||
        (r.summary && r.summary.toLowerCase().includes(searchLower))
      );
    });
  }, [reports, reportSearch, sessions]);

  // Pagination calculations (based on filtered data)
  const paginatedCouncils = useMemo(() => {
    const startIndex = (councilPage - 1) * PAGE_SIZE;
    return filteredCouncils.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredCouncils, councilPage]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (groupPage - 1) * PAGE_SIZE;
    return filteredGroups.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredGroups, groupPage]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (studentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, studentPage]);

  const paginatedSessions = useMemo(() => {
    const startIndex = (sessionPage - 1) * PAGE_SIZE;
    return filteredSessions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredSessions, sessionPage]);

  const paginatedTranscripts = useMemo(() => {
    const startIndex = (transcriptPage - 1) * PAGE_SIZE;
    return filteredTranscripts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredTranscripts, transcriptPage]);

  const paginatedReports = useMemo(() => {
    const startIndex = (reportPage - 1) * PAGE_SIZE;
    return filteredReports.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredReports, reportPage]);

  // Total pages calculations (based on filtered data)
  const councilTotalPages = Math.max(
    1,
    Math.ceil(filteredCouncils.length / PAGE_SIZE)
  );
  const groupTotalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / PAGE_SIZE)
  );
  const studentTotalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / PAGE_SIZE)
  );
  const sessionTotalPages = Math.max(
    1,
    Math.ceil(filteredSessions.length / PAGE_SIZE)
  );
  const transcriptTotalPages = Math.max(
    1,
    Math.ceil(filteredTranscripts.length / PAGE_SIZE)
  );
  const reportTotalPages = Math.max(
    1,
    Math.ceil(filteredReports.length / PAGE_SIZE)
  );

  // Reset page to 1 when search changes
  useEffect(() => {
    setCouncilPage(1);
  }, [councilSearch]);

  useEffect(() => {
    setGroupPage(1);
  }, [groupSearch]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch]);

  useEffect(() => {
    setSessionPage(1);
  }, [sessionSearch]);

  useEffect(() => {
    setTranscriptPage(1);
  }, [transcriptSearch]);

  useEffect(() => {
    setReportPage(1);
  }, [reportSearch]);

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
            type="text"
            value={councilSearch}
            onChange={(e) => setCouncilSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search councils..."
          />
          {councilSearch && (
            <button
              onClick={() => setCouncilSearch("")}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
            type="text"
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search groups..."
          />
          {groupSearch && (
            <button
              onClick={() => setGroupSearch("")}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search students..."
          />
          {studentSearch && (
            <button
              onClick={() => setStudentSearch("")}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{s.displayId}</td>
                  <td className="px-3 py-2">{s.userId}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                      {s.groupName}
                    </span>
                  </td>
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

      <div className="mb-4">
        <div className="relative w-96">
          <div className="absolute left-3 top-2">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={sessionSearch}
            onChange={(e) => setSessionSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search sessions..."
          />
          {sessionSearch && (
            <button
              onClick={() => setSessionSearch("")}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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

      <div className="mb-4">
        <div className="relative w-96">
          <div className="absolute left-3 top-2">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={transcriptSearch}
            onChange={(e) => setTranscriptSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search transcripts..."
          />
          {transcriptSearch && (
            <button
              onClick={() => setTranscriptSearch("")}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
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

      <div className="mb-4">
        <div className="relative w-96">
          <div className="absolute left-3 top-2">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Search reports..."
          />
          {reportSearch && (
            <button
              onClick={() => setReportSearch("")}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
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
        existingGroups={groups}
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
        semesterOptions={semesters}
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
      />
      <ReportDetailModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={
          selectedReport
            ? {
                ...selectedReport,
                sessionName: (() => {
                  const session = sessions.find(
                    (s) => s.id === selectedReport.sessionId
                  );
                  return session
                    ? `${session.groupId} - ${session.date} ${session.time}`
                    : undefined;
                })(),
              }
            : null
        }
        onDownload={handleDownloadReport}
      />

      {/* Hidden import inputs */}
      <input
        ref={studentFileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleStudentFileChange}
      />

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
