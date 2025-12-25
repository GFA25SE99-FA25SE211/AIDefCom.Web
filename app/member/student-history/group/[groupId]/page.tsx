"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, User } from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { useVoiceEnrollmentCheck } from "@/lib/hooks/useVoiceEnrollmentCheck";
import type { GroupDto, StudentDto } from "@/lib/models";

export default function GroupStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  // Voice enrollment check
  const { isChecking: checkingVoice } = useVoiceEnrollmentCheck();

  const [group, setGroup] = useState<GroupDto | null>(null);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch group details
        const groupRes = await groupsApi.getById(groupId);
        setGroup(groupRes.data);

        // Fetch students in this group
        const studentsRes = await studentsApi.getByGroupId(groupId);
        setStudents(studentsRes.data || []);
      } catch (error) {
        console.error("Error fetching group data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchData();
    }
  }, [groupId]);

  return (
    <>
      <main className="main-content">
        {/* Header */}
        <header className="flex flex-col bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                Group: {groupId}
              </h1>
              <p className="text-gray-500 text-sm">
                View students in this group
              </p>
            </div>
          </div>

          {/* Group Info */}
          {group && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Project Code</p>
                  <p className="font-medium text-gray-800">
                    {group.projectCode || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Semester</p>
                  <p className="font-medium text-gray-800">
                    {group.semesterId || "N/A"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Topic (EN)</p>
                  <p className="font-medium text-gray-800">
                    {group.topicTitle_EN || "No title"}
                  </p>
                </div>
                {group.topicTitle_VN && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Topic (VN)</p>
                    <p className="font-medium text-gray-800">
                      {group.topicTitle_VN}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Students List */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Students ({students.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading students...
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {student.fullName || student.userName || "Unknown"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {student.studentCode || student.id} • {student.email}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/member/student-history/${student.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 transition whitespace-nowrap"
                  >
                    View History
                  </Link>
                </div>
              ))}

              {students.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No students found in this group.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-8">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>
      </main>
    </>
  );
}
