// app/moderator/create-sessions/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import CreateSessionForm, {
  SessionFormData,
} from "./components/CreateSessionForm";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import { councilsApi } from "@/lib/api/councils";
import type { DefenseSessionDto, GroupDto, CouncilDto } from "@/lib/models";
import { swalConfig } from "@/lib/utils/sweetAlert";

// Inline SVG icons nhỏ gọn (kích thước 20x20)
const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex w-5 h-5 items-center justify-center text-white">
    {children}
  </span>
);

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

export default function CreateSessionsPage() {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [sessions, setSessions] = useState<DefenseSessionDto[]>([]);
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [councils, setCouncils] = useState<CouncilDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sessionsRes, groupsRes, councilsRes] = await Promise.all([
          defenseSessionsApi.getAll().catch(() => ({ data: [] })),
          groupsApi.getAll().catch(() => ({ data: [] })),
          councilsApi.getAll(false).catch(() => ({ data: [] })),
        ]);

        setSessions(sessionsRes.data || []);
        const normalizedGroups = (groupsRes.data || []).map(normalizeGroup);
        setGroups(normalizedGroups);
        setCouncils(councilsRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      await defenseSessionsApi.downloadTemplate();
      setIsDownloadModalOpen(false);
    } catch (error: any) {
      console.error("Download template failed:", error);
      await swalConfig.error(
        "Download Failed",
        error.message || "Unable to download template."
      );
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
      await defenseSessionsApi.importFromFile(file);
      const refreshed = await defenseSessionsApi.getAll();
      setSessions(refreshed.data || []);
      await swalConfig.success("Import Complete", "Defense sessions imported!");
      setIsUploadModalOpen(false);
    } catch (error: any) {
      console.error("Upload failed:", error);
      await swalConfig.error(
        "Import Failed",
        error.message || "Unable to upload the file."
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleCreateSession = async (formData: SessionFormData) => {
    try {
      if (!formData.groupId || !formData.councilId) {
        await swalConfig.error(
          "Missing Required Fields",
          "Please select both a group and a council."
        );
        return;
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
      console.error("Error creating session:", error);
      await swalConfig.error(
        "Failed to Create Session",
        error.message ||
          "An unexpected error occurred while creating the session."
      );
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
              {scheduledSessions.map((s) => (
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
          </section>

          {/* in progress list */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">In Progress Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgressSessions.map((s) => (
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
              {completedSessions.map((s) => (
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
