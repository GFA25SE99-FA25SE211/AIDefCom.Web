"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { rubricsApi } from "@/lib/api/rubrics";
import { scoresApi, type ScoreReadDto } from "@/lib/api/scores";
import { defenseSessionsApi } from "@/lib/api/defense-sessions";
import type { GroupDto, StudentDto } from "@/lib/models";

// --- (Code Icons giữ nguyên) ---

// SỬA ĐỔI: Định nghĩa Type (kiểu dữ liệu) để thay thế 'any'
interface StudentScore {
  id: string;
  name: string;
  role: string;
  scores: number[];
  note: string;
}

interface GroupData {
  name: string;
  project: string;
  students: StudentScore[];
}

type AllGroupsData = {
  [key: string]: GroupData;
};

type NotesVisibility = {
  [key: string]: boolean;
};

// SỬA ĐỔI: Dùng type 'AllGroupsData' thay cho 'any'
const allGroupsData: AllGroupsData = {
  "1": {
    name: "Group 1",
    project: "Smart Learning Management System",
    students: [
      {
        id: "SV001",
        name: "Nguyen Van A",
        role: "Team Leader",
        scores: [8.5, 9.0, 7.5, 8.0, 8.5],
        note: "Good leadership skills, but presentation needs work.",
      },
      {
        id: "SV002",
        name: "Tran Thi B",
        role: "Designer",
        scores: [9.0, 8.5, 8.0, 9.0, 8.5],
        note: "Excellent design, clear presentation.",
      },
      {
        id: "SV003",
        name: "Le Van C",
        role: "Developer",
        scores: [8.0, 8.5, 9.0, 8.5, 7.5],
        note: "Strong technical skills.",
      },
    ],
  },
  "5": {
    name: "Group 5",
    project: "Face Recognition System",
    students: [
      {
        id: "SV010",
        name: "Cao Van L",
        role: "Developer",
        scores: [9.0, 9.0, 8.5, 9.0, 8.0],
        note: "",
      },
      {
        id: "SV011",
        name: "Ly Thi M",
        role: "Developer",
        scores: [8.5, 8.5, 8.5, 8.5, 8.5],
        note: "",
      },
      {
        id: "SV012",
        name: "Phan Van N",
        role: "Developer",
        scores: [9.0, 8.0, 8.5, 9.0, 8.5],
        note: "",
      },
    ],
  },
  "7": {
    name: "Group 7",
    project: "Hotel Booking System",
    students: [
      {
        id: "SV015",
        name: "An Van Z",
        role: "Developer",
        scores: [9.0, 9.0, 9.0, 9.0, 9.0],
        note: "",
      },
      {
        id: "SV016",
        name: "Binh Thi AA",
        role: "Developer",
        scores: [8.5, 9.0, 8.0, 8.5, 9.0],
        note: "",
      },
    ],
  },
};
const criteria = [
  "Innovation",
  "Feasibility",
  "Presentation",
  "Technical",
  "Q&A",
];

export default function ViewScorePage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
  const [notesVisibility, setNotesVisibility] = useState<NotesVisibility>({});
  const [loading, setLoading] = useState(true);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setLoading(true);
        const [groupRes, studentsRes, rubricsRes, sessionsRes] =
          await Promise.all([
            groupsApi.getById(groupId).catch(() => ({ data: null })),
            studentsApi.getByGroupId(groupId).catch(() => ({ data: [] })),
            rubricsApi.getAll().catch(() => ({ data: [] })),
            defenseSessionsApi.getAll().catch(() => ({ data: [] })),
          ]);

        const group = groupRes.data;
        const students = studentsRes.data || [];
        const sessions = sessionsRes.data || [];
        setRubrics(rubricsRes.data || []);

        // Find session for this group
        const groupSession = sessions.find((s: any) => s.groupId === groupId);
        if (groupSession) {
          setSessionId(groupSession.id);
        }

        if (group) {
          const displayName =
            group.groupName ||
            group.projectCode ||
            group.topicTitle_EN ||
            group.topicTitle_VN ||
            `Group ${group.id?.slice(0, 6) || ""}`;
          const projectTitle =
            group.projectTitle ||
            group.topicTitle_EN ||
            group.topicTitle_VN ||
            "No project title";

          // Load existing scores for each student
          const studentsWithScores = await Promise.all(
            students.map(async (s: StudentDto, index: number) => {
              const scoresRes = await scoresApi
                .getByStudentId(s.id)
                .catch(() => ({ data: [] }));
              const existingScores = scoresRes.data || [];

              // Filter scores for current session if available
              const sessionScores = groupSession
                ? existingScores.filter(
                    (score: ScoreReadDto) => score.sessionId === groupSession.id
                  )
                : [];

              // Create scores array based on rubrics
              const scoresArray = new Array(rubricsRes.data?.length || 5).fill(
                0
              );

              // Map existing scores to rubrics
              sessionScores.forEach((score: ScoreReadDto) => {
                const rubricIndex = (rubricsRes.data || []).findIndex(
                  (r: any) => r.id === score.rubricId
                );
                if (rubricIndex >= 0) {
                  scoresArray[rubricIndex] = score.value;
                }
              });

              // Get note from scores (first score with comment) or empty
              const noteFromScore = sessionScores.find(
                (score: ScoreReadDto) => score.comment
              );

              return {
                id: s.id,
                name: s.fullName || s.userName || "Unknown",
                role: index === 0 ? "Team Leader" : "Developer",
                scores: scoresArray,
                note: noteFromScore?.comment || "",
              };
            })
          );

          const groupData: GroupData = {
            name: displayName,
            project: projectTitle,
            students: studentsWithScores,
          };
          setGroupData(groupData);
          setStudentScores(groupData.students);
        } else {
          const defaultData = allGroupsData[groupId] || allGroupsData["1"];
          setGroupData(defaultData);
          setStudentScores(defaultData.students);
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
        const defaultData = allGroupsData[groupId] || allGroupsData["1"];
        setGroupData(defaultData);
        setStudentScores(defaultData.students);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId]);

  const calculateAverage = (scores: number[]) => {
    const total = scores.reduce((acc, score) => acc + score, 0);
    const avg = total / scores.length;
    return avg.toFixed(2);
  };

  const handleScoreChange = (
    studentIndex: number,
    criterionIndex: number,
    value: string
  ) => {
    const newScores = [...studentScores];
    let newScore = parseFloat(value);

    if (isNaN(newScore)) newScore = 0.0;
    if (newScore > 10) newScore = 10.0;
    if (newScore < 0) newScore = 0.0;

    newScores[studentIndex].scores[criterionIndex] = newScore;
    setStudentScores(newScores);
  };

  const handleNoteChange = (studentIndex: number, value: string) => {
    const newScores = [...studentScores];
    newScores[studentIndex].note = value;
    setStudentScores(newScores);
  };

  const toggleNoteVisibility = (studentId: string) => {
    // SỬA ĐỔI: Dùng type 'NotesVisibility'
    setNotesVisibility((prev: NotesVisibility) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSave = () => {
    console.log("Saving scores:", studentScores);
    alert("Scores saved! (Check console for data)");
    router.push("/member/groups-to-grade");
  };

  const handleCancel = () => {
    router.push("/member/groups-to-grade");
  };

  return (
    <>
      <main className="main-content">
        {/* Header card */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-xl shadow px-6 py-4 gap-4">
            {/* Left section */}
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                {groupData?.name || "Loading..."}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {groupData?.project || ""}
              </p>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Back to list */}
              <Link
                href="/member/groups-to-grade"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-100 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to list</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Grading card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          {/* Header của card */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                View Individual Scores
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                View each member's grading results
              </p>
            </div>

            {/* Nút hành động phải */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Back to list */}
              <Link
                href="/member/groups-to-grade"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-100 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to List</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading group data...
            </div>
          ) : (
            <>
              {/* Responsive table container */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Student</th>
                      {(rubrics.length > 0
                        ? rubrics.map((r: any) => r.rubricName)
                        : criteria
                      ).map((name) => (
                        <th key={name} className="py-2 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{name}</span>
                            <span className="text-xs text-gray-400">
                              (Max: 10)
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="py-2 px-3">Average</th>
                      <th className="py-2 px-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {studentScores.map(
                      (student: StudentScore, studentIndex) => (
                        <React.Fragment key={student.id}>
                          <tr className="border-t">
                            <td className="py-4 pr-4 align-top w-64">
                              <div className="flex flex-col">
                                <Link
                                  href={`/member/student-history/${student.id}`}
                                  className="text-sm font-medium text-gray-800 hover:underline"
                                >
                                  {student.name}
                                </Link>
                                <span className="text-xs text-gray-500 mt-1">
                                  ID: {student.id}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {student.role}
                                </span>
                              </div>
                            </td>

                            {student.scores.map(
                              (score: number, criterionIndex) => (
                                <td
                                  key={criterionIndex}
                                  className="py-3 px-3 align-top"
                                >
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    readOnly
                                    className="score-input w-20 rounded-md border px-2 py-1 text-sm bg-gray-50 cursor-not-allowed"
                                    value={score.toFixed(1)}
                                  />
                                </td>
                              )
                            )}

                            <td className="py-3 px-3 align-top">
                              <span className="inline-block bg-blue-50 text-blue-700 text-sm px-2 py-1 rounded-md">
                                {calculateAverage(student.scores)}
                              </span>
                            </td>

                            <td className="py-3 px-3 align-top">
                              <button
                                className="text-sm text-violet-600 border px-3 py-1 rounded-md hover:bg-violet-50"
                                onClick={() => toggleNoteVisibility(student.id)}
                              >
                                Notes
                              </button>
                            </td>
                          </tr>

                          {notesVisibility[student.id] && (
                            <tr>
                              <td colSpan={8} className="py-3">
                                <div className="bg-gray-50 border rounded-md p-3">
                                  <textarea
                                    className="w-full p-3 rounded-md bg-gray-50 border text-sm cursor-not-allowed"
                                    placeholder={`Notes for ${student.name}...`}
                                    value={student.note}
                                    readOnly
                                  />
                                  <div className="text-right mt-2">
                                    <button
                                      className="text-sm text-gray-600 hover:underline"
                                      onClick={() =>
                                        toggleNoteVisibility(student.id)
                                      }
                                    >
                                      Hide
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <footer className="page-footer text-center text-sm text-gray-500 mt-6">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>
      </main>
    </>
  );
}
