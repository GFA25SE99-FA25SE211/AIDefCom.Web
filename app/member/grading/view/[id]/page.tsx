"use client";

// SỬA ĐỔI: Đã xóa useMemo ra khỏi import
import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Languages, ArrowLeft, Save } from "lucide-react";

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
  const groupData = allGroupsData[groupId] || allGroupsData["1"];

  // SỬA ĐỔI: Dùng type 'StudentScore[]'
  const [studentScores, setStudentScores] = useState<StudentScore[]>(
    groupData.students
  );
  // SỬA ĐỔI: Dùng type 'NotesVisibility'
  const [notesVisibility, setNotesVisibility] = useState<NotesVisibility>({});

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
                {groupData.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{groupData.project}</p>
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

              <button className="flex items-center gap-2 mt-4 md:mt-0 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition">
                <Languages className="w-4 h-4" />
                <span>Tiếng Việt</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grading card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          {/* Header của card */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Individual Grading
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Grade each member individually
              </p>
            </div>

            {/* Nút hành động phải */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Cancel */}
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-100 transition"
              >
                Cancel
              </button>

              {/* Save All Scores */}
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium shadow-sm hover:opacity-90 transition"
              >
                <Save className="w-4 h-4" />
                <span>Save All Scores</span>
              </button>
            </div>
          </div>

          {/* Responsive table container */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Student</th>
                  {criteria.map((name) => (
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
                {studentScores.map((student: StudentScore, studentIndex) => (
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

                      {student.scores.map((score: number, criterionIndex) => (
                        <td
                          key={criterionIndex}
                          className="py-3 px-3 align-top"
                        >
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            className="score-input w-20 rounded-md border px-2 py-1 text-sm"
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
        </div>

        <footer className="page-footer text-center text-sm text-gray-500 mt-6">
          © 2025 AIDefCom - Smart Graduation Defense
        </footer>

        <button
          className="help-btn fixed bottom-6 right-6 w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white flex items-center justify-center shadow-lg"
          aria-label="Help"
        >
          ?
        </button>
      </main>
    </>
  );
}
