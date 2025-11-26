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

// Types (kept)
type Council = {
  id: number;
  name: string;
  description: string;
  createdDate: string;
  status: "Active" | "Inactive";
  majorId?: number;
};
type Group = {
  id: string;
  topicEN: string;
  topicVN: string;
  semester: string;
  semesterId: number;
  majorId: number;
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
  groupId: string | number; // Display value used in UI
  location: string;
  date: string;
  time: string;
  status: "Scheduled" | "Completed";
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

  const [isGroupImportModalOpen, setIsGroupImportModalOpen] = useState(false);
  const [groupImportSemesterId, setGroupImportSemesterId] = useState("");
  const [groupImportMajorId, setGroupImportMajorId] = useState("");
  const groupFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isStudentImportModalOpen, setIsStudentImportModalOpen] =
    useState(false);
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
      setGroupImportMajorId(
        (prev) => prev || (majorsList.length ? String(majorsList[0].id) : "")
      );
      setGroupImportSemesterId(
        (prev) =>
          prev || (semestersList.length ? String(semestersList[0].id) : "")
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
        semesterId: g.semesterId || 1,
        majorId: g.majorId || 1,
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
          councilId: s.councilId ?? 0,
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
    } catch (error: any) {
      console.error("Import council error:", error);
      await swalConfig.error(
        "Import Failed",
        error.message || "Unable to import councils."
      );
    } finally {
      event.target.value = "";
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
        topicVN: g.projectTitle || "Không có tiêu đề",
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

  const handleOpenGroupImport = () => {
    if (!majors.length || !semesters.length) {
      swalConfig.error(
        "Missing Data",
        "Please ensure majors and semesters exist before importing groups."
      );
      return;
    }
    setGroupImportMajorId((prev) => prev || String(majors[0].id));
    setGroupImportSemesterId((prev) => prev || String(semesters[0].id));
    setIsGroupImportModalOpen(true);
  };

  const handleGroupDownloadTemplate = async () => {
    try {
      await studentsApi.downloadStudentGroupTemplate();
      await swalConfig.success(
        "Template Downloaded",
        "Student-Group template has been downloaded successfully."
      );
    } catch (error: any) {
      console.error("Download template error:", error);
      await swalConfig.error(
        "Download Failed",
        error.message || "Unable to download student-group template."
      );
    }
  };

  const handleGroupFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!groupImportMajorId || !groupImportSemesterId) {
      await swalConfig.error(
        "Missing Information",
        "Please choose both semester and major before importing."
      );
      event.target.value = "";
      return;
    }

    try {
      const result = await studentsApi.importStudentGroups({
        semesterId: Number(groupImportSemesterId),
        majorId: Number(groupImportMajorId),
        file,
      });
      const data = result?.data || result;
      const message =
        data?.message ||
        `Successfully imported. Groups: ${
          data?.createdGroupIds?.length || 0
        }, Students: ${data?.createdStudentIds?.length || 0}`;
      await swalConfig.success("Import Complete", message);
      await fetchData();
      setIsGroupImportModalOpen(false);
      setGroupImportMajorId("");
      setGroupImportSemesterId("");
    } catch (error: any) {
      console.error("Import group error:", error);
      await swalConfig.error(
        "Import Failed",
        error.message || "Unable to import groups."
      );
    } finally {
      event.target.value = "";
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
    }
  };

  const handleStudentFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
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
    } catch (error: any) {
      console.error("Import student error:", error);
      await swalConfig.error(
        "Import Failed",
        error.message || "Unable to import students."
      );
    } finally {
      event.target.value = "";
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
        topicVN: g.projectTitle || "Không có tiêu đề",
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
      councilId: number;
    }
  ) => {
    try {
      await defenseSessionsApi.update(id, {
        groupId: data.groupId,
        defenseDate: data.date,
        startTime: data.time.split(" - ")[0] || data.time,
        endTime: data.time.split(" - ")[1] || data.time,
        location: data.location,
        status: data.status,
        councilId: data.councilId,
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
          councilId: s.councilId ?? 0,
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
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-500 text-sm font-medium text-green-600 hover:bg-green-50"
            onClick={handleCouncilDownloadTemplate}
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-500 text-sm font-medium text-purple-600 hover:bg-purple-50"
            onClick={handleOpenCouncilImport}
          >
            <Upload className="w-4 h-4" /> Import File
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
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-500 text-sm font-medium text-green-600 hover:bg-green-50"
            onClick={handleGroupDownloadTemplate}
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-500 text-sm font-medium text-purple-600 hover:bg-purple-50"
            onClick={handleOpenGroupImport}
          >
            <Upload className="w-4 h-4" /> Import File
          </button>
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
              {paginatedGroups.map((g) => (
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
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-500 text-sm font-medium text-green-600 hover:bg-green-50"
            onClick={handleStudentDownloadTemplate}
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-500 text-sm font-medium text-purple-600 hover:bg-purple-50"
            onClick={() => studentFileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" /> Import File
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
                        onClick={() => handleDeleteStudent(s.userId)}
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
                        <button
                          className="p-2 rounded-md hover:bg-gray-100"
                          onClick={() => handleDownloadReport(r.filePath)}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
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
      />
      <AddSessionModal
        isOpen={isAddSessionModalOpen}
        onClose={() => setIsAddSessionModalOpen(false)}
        onSubmit={handleAddSession}
        groupOptions={groups.map((g) => ({ id: g.id, name: g.topicEN }))}
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
        groupData={editingGroup}
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
        groupOptions={groups.map((group) => ({
          id: group.id,
          name: group.topicEN || group.topicVN || `Group ${group.id}`,
        }))}
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

      {/* Hidden import inputs */}
      <input
        ref={councilFileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleCouncilFileChange}
      />
      <input
        ref={groupFileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleGroupFileChange}
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

      {/* Group import modal */}
      {isGroupImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Upload className="w-5 h-5 text-purple-500" />
                  Import Groups / Students
                </div>
                <p className="text-sm text-gray-500">
                  Choose semester & major, then upload the student-group file.
                </p>
              </div>
              <button
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setIsGroupImportModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Semester
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  value={groupImportSemesterId}
                  onChange={(e) => setGroupImportSemesterId(e.target.value)}
                >
                  {semesters.length === 0 && (
                    <option value="">No semesters available</option>
                  )}
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Major
                </label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  value={groupImportMajorId}
                  onChange={(e) => setGroupImportMajorId(e.target.value)}
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
                onClick={() => groupFileInputRef.current?.click()}
                disabled={!groupImportMajorId || !groupImportSemesterId}
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
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-500 text-sm font-medium text-green-600 hover:bg-green-50 w-full justify-center"
                onClick={handleStudentDownloadTemplate}
              >
                <Download className="w-4 h-4" /> Template
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-purple-500 text-sm font-medium text-purple-600 hover:bg-purple-50 w-full justify-center"
                onClick={() => studentFileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" /> Choose File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
