// app/moderator/create-sessions/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
} from "lucide-react";
import CreateSessionForm, {
  SessionFormData,
} from "./components/CreateSessionForm";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { groupsApi } from "@/lib/api/groups";
import type { DefenseSessionDto, GroupDto } from "@/lib/models";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sessionsRes, groupsRes] = await Promise.all([
          defenseSessionsApi.getAll().catch(() => ({ data: [] })),
          groupsApi.getAll().catch(() => ({ data: [] })),
        ]);

        setSessions(sessionsRes.data || []);
        const normalizedGroups = (groupsRes.data || []).map(normalizeGroup);
        setGroups(normalizedGroups);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateSession = async (formData: SessionFormData) => {
    try {
      const group = groups.find((g) => g.groupName === formData.groupName);
      if (!group) {
        await swalConfig.error(
          "Group Not Found",
          "The specified group could not be found. Please check the group name and try again."
        );
        return;
      }

      await defenseSessionsApi.create({
        groupId: group.id,
        defenseDate: formData.defenseDate,
        startTime: formData.defenseTime,
        endTime: formData.defenseTime, // TODO: Add endTime to form
        location: formData.location,
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
    .filter((s) => {
      const sessionDate = new Date(s.defenseDate);
      return sessionDate >= new Date();
    })
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
    .filter((s) => {
      const sessionDate = new Date(s.defenseDate);
      return sessionDate < new Date();
    })
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
          />
        </div>
      )}

      {/* summary cards */}
      {!isFormVisible && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
    </div>
  );
}
