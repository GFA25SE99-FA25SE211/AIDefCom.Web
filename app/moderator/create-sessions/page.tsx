// app/moderator/create-sessions/page.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Download,
  Upload,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import CreateSessionForm, {
  SessionFormData,
} from "./components/CreateSessionForm";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { councilsApi } from "@/lib/api/councils";
import { semestersApi } from "@/lib/api/semesters";
import type {
  DefenseSessionDto,
  GroupDto,
  CouncilDto,
  SemesterDto,
} from "@/lib/models";
import { swalConfig } from "@/lib/utils/sweetAlert";

// Inline SVG icons nhỏ gọn (kích thước 20x20)
const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex w-5 h-5 items-center justify-center text-white">
    {children}
  </span>
);

type GroupWithSemester = GroupDto & {
  semesterStart?: string;
  semesterEnd?: string;
};

const normalizeGroup = (group: GroupDto): GroupDto => ({
  ...group,
  groupName:
    group.groupName ||
    group.projectCode ||
    group.topicTitle_EN ||
    group.topicTitle_VN ||
    `Group ${group.id?.slice(0, 6) || ""}`,
  projectTitle:
    group.projectTitle ||
    group.topicTitle_EN ||
    group.topicTitle_VN ||
    group.projectCode ||
    "No project title",
});

const PAGE_SIZE = 8;

export default function CreateSessionsPage() {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [sessions, setSessions] = useState<DefenseSessionDto[]>([]);
  const [groups, setGroups] = useState<GroupWithSemester[]>([]);
  const [councils, setCouncils] = useState<CouncilDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  
  // Pagination state
  const [scheduledPage, setScheduledPage] = useState(1);
  const [inProgressPage, setInProgressPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sessionsRes, groupsRes, councilsRes, semestersRes] =
          await Promise.all([
            defenseSessionsApi.getAll().catch(() => ({ data: [] })),
            groupsApi.getAll().catch(() => ({ data: [] })),
            councilsApi.getAll(false).catch(() => ({ data: [] })),
            semestersApi.getAll().catch(() => ({ data: [] })),
          ]);

        setSessions(sessionsRes.data || []);
        const semesters = (semestersRes.data || []) as SemesterDto[];
        const normalizedGroups = (groupsRes.data || []).map((group) => {
          const normalized = normalizeGroup(group);
          const semesterInfo = semesters.find(
            (semester) => semester.id === group.semesterId
          );
          return {
            ...normalized,
            semesterStart: semesterInfo?.startDate,
            semesterEnd: semesterInfo?.endDate,
          };
        });
        setGroups(normalizedGroups);
        setCouncils(councilsRes.data || []);
      } catch (error) {
        // Error fetching data
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      swalConfig.loading("Downloading...", "Please wait");
      await defenseSessionsApi.downloadTemplate();
      setIsDownloadModalOpen(false);
      await swalConfig.success("Download Complete", "Template downloaded successfully");
    } catch (error: any) {
      const errorMessage = error?.message || "Template download failed";
      await swalConfig.error("Download Failed", errorMessage);
    }
  };

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      swalConfig.loading("Importing...", "Processing file");
      const response = await defenseSessionsApi.importFromFile(file);
      
      // Refresh sessions
      const refreshed = await defenseSessionsApi.getAll();
      setSessions(refreshed.data || []);
      
      // Show detailed import result
      const result = response.data;
      if (result) {
        const successCount = result.successCount || 0;
        const failureCount = result.failureCount || 0;
        const totalRows = result.totalRows || 0;
        
        if (failureCount === 0) {
          await swalConfig.success(
            "Import Complete",
            `Successfully imported ${successCount} defense session(s)`
          );
        } else {
          // Build concise error message
          let errorDetails = `Success: ${successCount}, Failed: ${failureCount}/${totalRows}\n\n`;
          
          if (result.errors && result.errors.length > 0) {
            // Group duplicate errors
            const duplicateErrors = result.errors.filter((err: any) => 
              err.errorMessage?.toLowerCase().includes("duplicate") ||
              err.errorMessage?.toLowerCase().includes("already") ||
              err.errorMessage?.toLowerCase().includes("active session")
            );
            
            if (duplicateErrors.length > 0) {
              const uniqueGroups = new Set(duplicateErrors.map((e: any) => 
                e.errorMessage?.match(/Group '([^']+)'/)?.[1] || 'Unknown'
              ));
              errorDetails += `${duplicateErrors.length} duplicate(s): ${Array.from(uniqueGroups).slice(0, 3).join(', ')}${uniqueGroups.size > 3 ? '...' : ''}\n`;
            }
            
            const otherErrors = result.errors.filter((err: any) => 
              !duplicateErrors.includes(err)
            );
            
            if (otherErrors.length > 0) {
              errorDetails += `\nOther errors (${otherErrors.length}):\n`;
              otherErrors.slice(0, 3).forEach((err: any, idx: number) => {
                errorDetails += `${idx + 1}. Row ${err.row}: ${err.errorMessage?.substring(0, 60)}...\n`;
              });
              if (otherErrors.length > 3) {
                errorDetails += `... +${otherErrors.length - 3} more`;
              }
            }
          }
          
          await swalConfig.warning("Import Completed with Errors", errorDetails);
        }
      } else {
        await swalConfig.success("Import Complete", "Defense sessions imported!");
      }
      
      setIsUploadModalOpen(false);
    } catch (error: any) {
      // Extract error details from API response
      const errorData = error?.errorData || error?.data || error?.response?.data;
      let errorMessage = "File upload failed";
      
      if (errorData?.data) {
        const result = errorData.data;
        if (result.errors && result.errors.length > 0) {
          const duplicateErrors = result.errors.filter((err: any) => 
            err.errorMessage?.toLowerCase().includes("duplicate") ||
            err.errorMessage?.toLowerCase().includes("already") ||
            err.errorMessage?.toLowerCase().includes("active session")
          );
          
          errorMessage = `Import failed: ${result.failureCount || 0} error(s)\n\n`;
          
          if (duplicateErrors.length > 0) {
            const uniqueGroups = new Set(duplicateErrors.map((e: any) => 
              e.errorMessage?.match(/Group '([^']+)'/)?.[1] || 'Unknown'
            ));
            const groupList = Array.from(uniqueGroups).slice(0, 5).join(', ');
            errorMessage += `${duplicateErrors.length} row(s): ${groupList}${uniqueGroups.size > 5 ? '...' : ''} already have sessions\n\nRemove these groups from Excel`;
          } else if (result.errors.length > 0) {
            errorMessage += `Errors:\n`;
            result.errors.slice(0, 3).forEach((err: any, idx: number) => {
              errorMessage += `${idx + 1}. Row ${err.row}: ${err.errorMessage?.substring(0, 60)}...\n`;
            });
            if (result.errors.length > 3) {
              errorMessage += `... +${result.errors.length - 3} more`;
            }
          }
        } else if (result.message) {
          errorMessage = result.message;
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      await swalConfig.error("Import Failed", errorMessage);
    } finally {
      event.target.value = "";
    }
  };

  const handleCreateSession = async (formData: SessionFormData) => {
    try {
      if (!formData.groupId || !formData.councilId) {
        await swalConfig.error("Missing Required Fields", "Please select group and council");
        return;
      }

      // Prevent scheduling for groups that already completed a session
      const existingPastSession = sessions.find((session) => {
        if (session.groupId !== formData.groupId) return false;
        const sessionDate = new Date(session.defenseDate);
        const isPastDate = sessionDate.getTime() < new Date().getTime();
        const isCompleted =
          session.status && session.status.toLowerCase() === "completed";
        return isPastDate || isCompleted;
      });

      if (existingPastSession) {
        const sessionDate = new Date(
          existingPastSession.defenseDate
        ).toLocaleDateString("en-GB");
        await swalConfig.error("Group Already Defended", "Group already has defense session");
        return;
      }

      const currentGroup = groups.find(
        (group) => group.id === formData.groupId
      );
      if (
        currentGroup?.semesterStart &&
        currentGroup?.semesterEnd &&
        formData.defenseDate
      ) {
        const selectedDate = new Date(formData.defenseDate);
        const semesterStart = new Date(currentGroup.semesterStart);
        const semesterEnd = new Date(currentGroup.semesterEnd);
        if (
          selectedDate.getTime() < semesterStart.getTime() ||
          selectedDate.getTime() > semesterEnd.getTime()
        ) {
          await swalConfig.error("Defense Date Out of Range", "Defense date must be within semester period");
          return;
        }
      }

      // Format times to HH:MM:SS
      const formatTime = (time: string) => {
        if (!time) return "00:00:00";
        const parts = time.split(":");
        if (parts.length === 2) {
          return `${time}:00`;
        }
        return time;
      };

      await defenseSessionsApi.create({
        groupId: formData.groupId,
        councilId: formData.councilId,
        defenseDate: formData.defenseDate,
        startTime: formatTime(formData.startTime),
        endTime: formatTime(formData.endTime),
        location: formData.location,
        status: formData.status || "Scheduled",
      });

      // Refresh sessions
      const response = await defenseSessionsApi.getAll();
      setSessions(response.data || []);
      setIsFormVisible(false);

      await swalConfig.success(
        "Session Created Successfully!",
        "The defense session has been scheduled successfully."
      );
    } catch (error: any) {
      const apiDetails =
        error?.errorData?.details ||
        error?.errorData?.message ||
        error?.message;
      await swalConfig.error("Creation Failed", "Session creation failed");
    }
  };

  const scheduledSessions = sessions
    .filter((s) => s.status === "Scheduled")
    .map((s) => {
      const group = groups.find((g) => g.id === s.groupId);
      const sessionDate = new Date(s.defenseDate);
      return {
        id: s.id,
        groupName: group?.groupName || "Unknown",
        date: sessionDate.toLocaleDateString("en-GB"),
        time: s.startTime || "TBD",
        location: s.location || "TBD",
      };
    });

  const inProgressSessions = sessions
    .filter((s) => s.status === "InProgress")
    .map((s) => {
      const group = groups.find((g) => g.id === s.groupId);
      const sessionDate = new Date(s.defenseDate);
      return {
        id: s.id,
        groupName: group?.groupName || "Unknown",
        date: sessionDate.toLocaleDateString("en-GB"),
        time: s.startTime || "TBD",
        location: s.location || "TBD",
      };
    });

  const completedSessions = sessions
    .filter((s) => s.status === "Completed")
    .map((s) => {
      const group = groups.find((g) => g.id === s.groupId);
      const sessionDate = new Date(s.defenseDate);
      return {
        id: s.id,
        groupName: group?.groupName || "Unknown",
        date: sessionDate.toLocaleDateString("en-GB"),
        time: s.startTime || "TBD",
        location: s.location || "TBD",
      };
    });

  const summaryData = {
    total: sessions.length,
    scheduled: scheduledSessions.length,
    inProgress: inProgressSessions.length,
    completed: completedSessions.length,
  };

  // Paginated sessions
  const paginatedScheduledSessions = useMemo(() => {
    const start = (scheduledPage - 1) * PAGE_SIZE;
    return scheduledSessions.slice(start, start + PAGE_SIZE);
  }, [scheduledSessions, scheduledPage]);

  const paginatedInProgressSessions = useMemo(() => {
    const start = (inProgressPage - 1) * PAGE_SIZE;
    return inProgressSessions.slice(start, start + PAGE_SIZE);
  }, [inProgressSessions, inProgressPage]);

  const paginatedCompletedSessions = useMemo(() => {
    const start = (completedPage - 1) * PAGE_SIZE;
    return completedSessions.slice(start, start + PAGE_SIZE);
  }, [completedSessions, completedPage]);

  const scheduledTotalPages = Math.ceil(scheduledSessions.length / PAGE_SIZE);
  const inProgressTotalPages = Math.ceil(inProgressSessions.length / PAGE_SIZE);
  const completedTotalPages = Math.ceil(completedSessions.length / PAGE_SIZE);

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* header */}
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Create Defense Sessions</h1>
          <p className="text-sm text-gray-600 mt-1">
            Schedule and manage defense sessions for student groups
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-green-500 px-4 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-purple-500 px-4 py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-50"
          >
            <Upload className="w-4 h-4" />
            Import File
          </button>
          <button
            onClick={() => setIsFormVisible(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-2 rounded-lg shadow"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Create New Session</span>
          </button>
        </div>
      </div>

      {/* form */}
      {isFormVisible && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <CreateSessionForm
            onCancel={() => setIsFormVisible(false)}
            onSubmit={handleCreateSession}
            groups={groups}
            councils={councils}
          />
        </div>
      )}

      {/* summary cards */}
      {!isFormVisible && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-500">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-semibold">{summaryData.total}</div>
                <div className="text-sm text-gray-500">Total Sessions</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {summaryData.scheduled}
                </div>
                <div className="text-sm text-gray-500">Scheduled</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {summaryData.inProgress}
                </div>
                <div className="text-sm text-gray-500">In Progress</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {summaryData.completed}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
          </div>

          {/* scheduled list */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Scheduled Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedScheduledSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-lg shadow p-4 relative"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-md bg-purple-50 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-md font-medium">{s.groupName}</h3>
                  </div>
                  <div className="text-sm text-gray-600 flex flex-col gap-1">
                    <div>
                      <Calendar className="w-4 h-4 inline-block mr-2" />
                      {s.date}
                    </div>
                    <div>
                      <Clock className="w-4 h-4 inline-block mr-2" />
                      {s.time}
                    </div>
                    <div>
                      <MapPin className="w-4 h-4 inline-block mr-2" />
                      {s.location}
                    </div>
                  </div>
                  <span className="absolute right-3 top-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
            {scheduledTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setScheduledPage(p => Math.max(1, p - 1))}
                  disabled={scheduledPage === 1}
                  className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: scheduledTotalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setScheduledPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      scheduledPage === page
                        ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white"
                        : "border hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setScheduledPage(p => Math.min(scheduledTotalPages, p + 1))}
                  disabled={scheduledPage === scheduledTotalPages}
                  className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>

          {/* in progress list */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">In Progress Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedInProgressSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-lg shadow p-4 relative"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-md font-medium">{s.groupName}</h3>
                  </div>
                  <div className="text-sm text-gray-600 flex flex-col gap-1">
                    <div>
                      <Calendar className="w-4 h-4 inline-block mr-2" />
                      {s.date}
                    </div>
                    <div>
                      <Clock className="w-4 h-4 inline-block mr-2" />
                      {s.time}
                    </div>
                    <div>
                      <MapPin className="w-4 h-4 inline-block mr-2" />
                      {s.location}
                    </div>
                  </div>
                  <span className="absolute right-3 top-3 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    In Progress
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* completed list */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Completed Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedCompletedSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-lg shadow p-4 relative"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-md bg-green-50 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-md font-medium">{s.groupName}</h3>
                  </div>
                  <div className="text-sm text-gray-600 flex flex-col gap-1">
                    <div>
                      <Calendar className="w-4 h-4 inline-block mr-2" />
                      {s.date}
                    </div>
                    <div>
                      <Clock className="w-4 h-4 inline-block mr-2" />
                      {s.time}
                    </div>
                    <div>
                      <MapPin className="w-4 h-4 inline-block mr-2" />
                      {s.location}
                    </div>
                  </div>
                  <span className="absolute right-3 top-3 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          </section>

          <footer className="text-xs text-gray-400">
            © 2025 AIDefCom - Smart Graduation Defense
          </footer>
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={uploadInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Download modal */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Download className="w-5 h-5 text-green-500" />
                  Download Template
                </div>
                <p className="text-sm text-gray-500">
                  Get the Excel template for defense session import
                </p>
              </div>
              <button
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setIsDownloadModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-4 text-white"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="w-4 h-4" />
                Defense Sessions Template
              </span>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Upload className="w-5 h-5 text-purple-500" />
                  Import File
                </div>
                <p className="text-sm text-gray-500">
                  Import defense sessions from the prepared template
                </p>
              </div>
              <button
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setIsUploadModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleUploadClick}
              className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-4 text-white"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Upload className="w-4 h-4" />
                Choose Excel File
              </span>
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
