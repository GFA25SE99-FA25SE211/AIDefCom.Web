"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Languages, ArrowLeft, Save } from "lucide-react";
import { groupsApi } from "@/lib/api/groups";
import { studentsApi } from "@/lib/api/students";
import { memberNotesApi } from "@/lib/api/member-notes";
import { rubricsApi } from "@/lib/api/rubrics";
import type { GroupDto, StudentDto } from "@/lib/models";

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

type AllGroupsData = { [key: string]: GroupData };
type NotesVisibility = { [key: string]: boolean };

const allGroupsData: AllGroupsData = {
  "2": {
    name: "Group 2",
    project: "Intelligent Ride-hailing Application",
    students: [
      {
        id: "SV004",
        name: "Pham Van D",
        role: "Team Leader",
        scores: [0, 0, 0, 0, 0],
        note: "",
      },
      {
        id: "SV005",
        name: "Hoang Thi E",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        note: "",
      },
    ],
  },
  "3": {
    name: "Group 3",
    project: "E-commerce Website",
    students: [
      {
        id: "SV006",
        name: "Do Van F",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        note: "",
      },
      {
        id: "SV007",
        name: "Vu Thi G",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        note: "",
      },
    ],
  },
  "4": {
    name: "Group 4",
    project: "AI Health Consultation Chatbot",
    students: [
      {
        id: "SV008",
        name: "Mai Van I",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        note: "",
      },
      {
        id: "SV009",
        name: "Dinh Thi K",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        note: "",
      },
    ],
  },
  "6": {
    name: "Group 6",
    project: "Personal Finance Management App",
    students: [
      {
        id: "SV013",
        name: "Truong Van O",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
        note: "",
      },
      {
        id: "SV014",
        name: "Duong Thi P",
        role: "Developer",
        scores: [0, 0, 0, 0, 0],
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

export default function GradeGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
  const [notesVisibility, setNotesVisibility] = useState<NotesVisibility>({});
  const [loading, setLoading] = useState(true);
  const [rubrics, setRubrics] = useState<any[]>([]);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setLoading(true);
        const [groupRes, studentsRes, rubricsRes] = await Promise.all([
          groupsApi.getById(groupId).catch(() => ({ data: null })),
          studentsApi.getByGroupId(groupId).catch(() => ({ data: [] })),
          rubricsApi.getAll().catch(() => ({ data: [] })),
        ]);

        const group = groupRes.data;
        const students = studentsRes.data || [];
        setRubrics(rubricsRes.data || []);

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

          const groupData: GroupData = {
            name: displayName,
            project: projectTitle,
            students: students.map((s: StudentDto, index: number) => ({
              id: s.id,
              name: s.fullName || s.userName || "Unknown",
              role: index === 0 ? "Team Leader" : "Developer",
              scores: new Array(rubrics.length || 5).fill(0),
              note: "",
            })),
          };
          setGroupData(groupData);
          setStudentScores(groupData.students);
        } else {
          // Fallback to default data
          const defaultData = allGroupsData[groupId] || allGroupsData["2"];
          setGroupData(defaultData);
          setStudentScores(defaultData.students);
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
        const defaultData = allGroupsData[groupId] || allGroupsData["2"];
        setGroupData(defaultData);
        setStudentScores(defaultData.students);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId]);

  const calculateAverage = (scores: number[]) =>
    (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);

  const handleScoreChange = (
    studentIndex: number,
    criterionIndex: number,
    value: string
  ) => {
    const newScores = [...studentScores];
    let newScore = parseFloat(value);
    if (isNaN(newScore)) newScore = 0;
    if (newScore > 10) newScore = 10;
    if (newScore < 0) newScore = 0;
    newScores[studentIndex].scores[criterionIndex] = newScore;
    setStudentScores(newScores);
  };

  const handleNoteChange = (studentIndex: number, value: string) => {
    const newScores = [...studentScores];
    newScores[studentIndex].note = value;
    setStudentScores(newScores);
  };

  const toggleNoteVisibility = (studentId: string) =>
    setNotesVisibility((prev) => ({ ...prev, [studentId]: !prev[studentId] }));

  const handleSave = async () => {
    try {
      // TODO: Save scores to API when score API is available
      // For now, save notes
      for (const student of studentScores) {
        if (student.note && groupData) {
          try {
            await memberNotesApi.create({
              userId: "", // TODO: Get current user ID
              groupId: groupId,
              content: student.note,
            });
          } catch (error) {
            console.error(`Error saving note for student ${student.id}:`, error);
          }
        }
      }
      alert("Scores and notes saved successfully!");
      router.push("/member/groups-to-grade");
    } catch (error: any) {
      console.error("Error saving scores:", error);
      alert(`Error: ${error.message || "Failed to save scores"}`);
    }
  };

  const handleCancel = () => router.push("/member/groups-to-grade");

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
              <p className="text-sm text-gray-500 mt-1">{groupData?.project || ""}</p>
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

              {/* Language */}
              <button className="flex items-center gap-2 mt-4 md:mt-0 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition">
                <Languages className="w-4 h-4" />
                <span>Tiếng Việt</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grading card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Individual Grading
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Grade each member individually
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-100 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition"
              >
                <Save className="w-4 h-4" />
                <span>Save All Scores</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading group data...</div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Student</th>
                      {(rubrics.length > 0 ? rubrics.map((r: any) => r.rubricName) : criteria).map((name) => (
                    <th key={name} className="py-2 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-gray-400">(Max: 10)</span>
                      </div>
                    </th>
                      ))}
                      <th className="py-2 px-3">Average</th>
                      <th className="py-2 px-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {studentScores.map((student, studentIndex) => (
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

                      {student.scores.map((score, criterionIndex) => (
                        <td
                          key={criterionIndex}
                          className="py-3 px-3 align-top"
                        >
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            className="w-20 rounded-md border px-2 py-1 text-sm"
                            value={score.toFixed(1)}
                            onChange={(e) =>
                              handleScoreChange(
                                studentIndex,
                                criterionIndex,
                                e.target.value
                              )
                            }
                          />
                        </td>
                      ))}

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
                              className="w-full p-3 rounded-md bg-white border text-sm"
                              placeholder={`Add notes for ${student.name}...`}
                              value={student.note}
                              onChange={(e) =>
                                handleNoteChange(studentIndex, e.target.value)
                              }
                            />
                            <div className="text-right mt-2">
                              <button
                                className="text-sm text-gray-600 hover:underline"
                                onClick={() => toggleNoteVisibility(student.id)}
                              >
                                Hide
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <footer className="page-footer text-center text-sm text-gray-500 mt-6">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>

        <button className="help-btn fixed bottom-6 right-6 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white flex items-center justify-center shadow-lg">
          ?
        </button>
      </main>
    </>
  );
}
