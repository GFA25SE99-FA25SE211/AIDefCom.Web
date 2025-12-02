"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import { rubricsApi } from "@/lib/api/rubrics";
import { memberNotesApi } from "@/lib/api/member-notes";
import type {
  GroupDto,
  StudentDto,
  DefenseSessionDto,
  RubricDto,
  MemberNoteDto,
  ScoreDto,
} from "@/lib/models";
import { scoresApi } from "@/lib/api/scores";
import CreateTaskModal from "../../../chair/components/CreateTaskModal";
import { swalConfig } from "@/lib/utils/sweetAlert";

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [group, setGroup] = useState<GroupDto | null>(null);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [defenseSession, setDefenseSession] =
    useState<DefenseSessionDto | null>(null);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [rubrics, setRubrics] = useState<RubricDto[]>([]);
  const [memberNotes, setMemberNotes] = useState<MemberNoteDto[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isChair, setIsChair] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [openTaskModal, setOpenTaskModal] = useState(false);

  // Score Table State
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentScores, setStudentScores] = useState<ScoreDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch group first to get majorId
        const [groupRes, studentsRes, sessionsRes, memberNotesRes] =
          await Promise.all([
            groupsApi.getById(id),
            studentsApi.getByGroupId(id),
            defenseSessionsApi.getByGroupId(id),
            memberNotesApi.getByGroupId(id),
          ]);

        // Get current user from localStorage
        const storedUser = localStorage.getItem("user");

        let currentUid = "";
        let isSystemChair = false;
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          currentUid = parsedUser.id;
          setCurrentUserId(currentUid);

          // Check if user has system Chair role (for testing/override)
          if (
            parsedUser.roles &&
            parsedUser.roles.some((r: string) => r.toLowerCase() === "chair")
          ) {
            isSystemChair = true;
          } else if (
            parsedUser.role &&
            parsedUser.role.toLowerCase() === "chair"
          ) {
            isSystemChair = true;
          }
        }

        if (groupRes.data) {
          setGroup(groupRes.data);
          
          // 2. Fetch rubrics by majorId after getting group
          if (groupRes.data.majorId) {
            try {
              const rubricsRes = await rubricsApi.getByMajorId(groupRes.data.majorId);
              if (rubricsRes.data) {
                setRubrics(rubricsRes.data);
              }
            } catch (rubricError) {
              console.error("Error fetching rubrics by major:", rubricError);
              setRubrics([]);
            }
          } else {
            // Fallback to getAll if no majorId
            try {
              const rubricsRes = await rubricsApi.getAll();
              if (rubricsRes.data) {
                setRubrics(rubricsRes.data);
              }
            } catch (rubricError) {
              console.error("Error fetching rubrics:", rubricError);
              setRubrics([]);
            }
          }
        }
        if (studentsRes.data) {
          setStudents(studentsRes.data);
        }

        // Set member notes directly from API response
        if (memberNotesRes.data) {
          setMemberNotes(memberNotesRes.data);
        }

        // 2. If session exists, fetch lecturers and check access
        if (sessionsRes.data && sessionsRes.data.length > 0) {
          const session = sessionsRes.data[0];
          setDefenseSession(session);

          try {
            const lecturersRes = await defenseSessionsApi.getUsersBySessionId(
              session.id
            );
            if (lecturersRes.data) {
              // Filter out students
              const studentIds = new Set(
                studentsRes.data?.map((s) => s.id) || []
              );
              const onlyLecturers = lecturersRes.data.filter(
                (user: any) => !studentIds.has(user.id)
              );
              setLecturers(onlyLecturers);

              // Check if current user is Chair in the council
              if (currentUid) {
                const currentUserInSession = onlyLecturers.find(
                  (l: any) =>
                    String(l.id).toLowerCase() ===
                    String(currentUid).toLowerCase()
                );

                // Only allow access if user is Chair (system role or council role)
                let isUserChair = false;
                if (isSystemChair) {
                  isUserChair = true;
                  setIsChair(true);
                } else if (
                  currentUserInSession &&
                  currentUserInSession.role &&
                  currentUserInSession.role.toLowerCase() === "chair"
                ) {
                  isUserChair = true;
                  setIsChair(true);
                }

                if (isUserChair) {
                  setHasAccess(true);
                } else {
                  // Not a chair, show error message and redirect
                  setHasAccess(false);
                  await swalConfig.error(
                    "Không có quyền truy cập",
                    "Chỉ có Chair mới có quyền xem chi tiết phiên bảo vệ này."
                  );
                  router.push("/home");
                  return;
                }
              } else {
                // No user ID, show error and redirect
                setHasAccess(false);
                await swalConfig.error(
                  "Lỗi xác thực",
                  "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
                );
                router.push("/home");
                return;
              }
            } else {
              // No council members, show error and redirect
              setHasAccess(false);
              await swalConfig.error(
                "Lỗi",
                "Không tìm thấy thành viên hội đồng cho phiên bảo vệ này."
              );
              router.push("/home");
              return;
            }
          } catch (lecErr) {
            console.error("Failed to fetch lecturers:", lecErr);
            // Error fetching lecturers, show error and redirect
            setHasAccess(false);
            await swalConfig.error(
              "Lỗi",
              "Không thể xác minh quyền truy cập. Vui lòng thử lại sau."
            );
            router.push("/home");
            return;
          }
        } else {
          // No defense session, show error and redirect
          setHasAccess(false);
          await swalConfig.error(
            "Không tìm thấy",
            "Không tìm thấy phiên bảo vệ cho nhóm này."
          );
          router.push("/home");
          return;
        }
      } catch (err) {
        console.error("Failed to fetch details:", err);
        setError("Failed to load group details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Set initial selected student when students are loaded
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  // Fetch scores when selected student changes
  useEffect(() => {
    const fetchScores = async () => {
      if (!selectedStudentId) return;
      try {
        const res = await scoresApi.getByStudentId(selectedStudentId);
        if (res.data) {
          setStudentScores(res.data);
        } else {
          setStudentScores([]);
        }
      } catch (err) {
        console.error("Failed to fetch scores:", err);
        setStudentScores([]);
      }
    };

    fetchScores();
  }, [selectedStudentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-500">Loading group details...</div>
      </div>
    );
  }

  if (error || !hasAccess) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="text-gray-500">Redirecting...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="text-gray-500">Group not found.</div>
        <button onClick={() => router.push("/home")} className="btn-secondary">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <CreateTaskModal
        open={openTaskModal}
        onClose={() => setOpenTaskModal(false)}
        lecturers={lecturers}
        rubrics={rubrics}
        currentUserId={currentUserId}
      />

      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/home")}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 text-gray-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {group.groupName || group.projectCode || "Group Details"}
          </h1>
          <p className="text-gray-500 text-sm">
            {group.semesterName} · {group.majorName}
          </p>
        </div>
        <div className="ml-auto">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              group.status === "Active"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {group.status}
          </span>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Project Info Card */}
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-purple-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
              Project Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Code
                </label>
                <p className="text-gray-900 font-medium">
                  {group.projectCode || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  English Title
                </label>
                <p className="text-gray-900 font-medium">
                  {group.topicTitle_EN || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vietnamese Title
                </label>
                <p className="text-gray-900 font-medium">
                  {group.topicTitle_VN || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Members Card */}
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-blue-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              Group Students
            </h2>
            {students.length > 0 ? (
              <div className="space-y-4">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {student.userName
                        ? student.userName.charAt(0).toUpperCase()
                        : "S"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.userName || "Unknown Name"}
                      </p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                    {student.studentCode && (
                      <div className="ml-auto">
                        <span className="badge badge-info text-xs">
                          {student.studentCode}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">
                No members found in this group.
              </p>
            )}
          </div>

          {/* Individual Scores Card */}
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">
              Individual Scores from Committee Members
            </h2>

            {/* Student Tabs */}
            {students.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 pb-1">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`px-6 py-2 rounded-t-lg text-sm font-medium transition-colors relative top-[1px] ${
                        selectedStudentId === student.id
                          ? "bg-white text-blue-600 border border-gray-200 border-b-white shadow-sm"
                          : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {student.userName || student.email}
                    </button>
                  ))}
                </div>

                {/* Scores Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 font-medium">Criteria</th>
                        <th className="px-4 py-3 font-medium text-center">
                          Score
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Evaluator
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {studentScores.length > 0 ? (
                        studentScores.map((score) => (
                          <tr key={score.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {score.rubricName || "Unknown Criteria"}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-900">
                              {score.value}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {score.evaluatorName || "Unknown Evaluator"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-8 text-center text-gray-500 italic"
                          >
                            No scores available for this student.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No students found in this group.
              </p>
            )}
          </div>

          {/* Member Notes Card */}
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-orange-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
              Committee Member Note
            </h2>
            {memberNotes.length > 0 ? (
              <div className="space-y-3">
                {memberNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <p className="text-sm font-semibold text-blue-600 mb-1">
                      {note.userName || "Unknown User"}
                    </p>
                    <p className="text-sm text-gray-600">{note.noteContent}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No notes found for this group.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Defense Council Card */}
          <div className="card-base p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Defense Council
              </h2>
              {isChair && (
                <button
                  onClick={() => setOpenTaskModal(true)}
                  className="btn-gradient"
                >
                  + Create Task
                </button>
              )}
            </div>

            {defenseSession ? (
              <div className="space-y-4">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium mb-1">
                    Session Info
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>
                      📅{" "}
                      {new Date(
                        defenseSession.defenseDate
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                    <span>
                      ⏰ {defenseSession.startTime} - {defenseSession.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                    <span>📍 {defenseSession.location}</span>
                  </div>
                </div>

                <div className="h-px bg-gray-100 my-2"></div>

                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Council Members
                </p>
                {lecturers.length > 0 ? (
                  <div className="space-y-3">
                    {lecturers.map((lecturer) => (
                      <div
                        key={lecturer.id}
                        className="flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                          {lecturer.fullName
                            ? lecturer.fullName.charAt(0).toUpperCase()
                            : "L"}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {lecturer.fullName ||
                              lecturer.userName ||
                              "Unknown Lecturer"}
                            {lecturer.role && (
                              <span className="text-gray-500 font-normal ml-1">
                                ({lecturer.role})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {lecturer.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No lecturers assigned yet.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No defense session scheduled for this group.
              </p>
            )}
          </div>

          {/* Status Card */}
          <div className="card-base p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Status & Scoring
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Score</span>
                <span className="font-bold text-gray-900 text-lg">
                  {group.totalScore !== null && group.totalScore !== undefined
                    ? group.totalScore
                    : "N/A"}
                </span>
              </div>
              <div className="h-px bg-gray-100 my-2"></div>
              <div>
                <span className="text-gray-600 text-sm">Semester</span>
                <p className="font-medium text-gray-900">
                  {group.semesterName}
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Major</span>
                <p className="font-medium text-gray-900">{group.majorName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
