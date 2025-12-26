"use client";

import { useState } from "react";
import { Plus, Trash2, Download, RefreshCw, FileText } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { apiClient } from "@/lib/api/client";
import {
  generateMeetingMinutesBlob,
  formatDateToVietnamese,
  formatDateToEnglish,
  formatTime,
  extractSemesterYear,
} from "@/lib/utils/meetingMinutesDocument";
import { saveAs } from "file-saver";

interface MeetingMinutesFormProps {
  defenseId: string; // Defense ID = Transcript ID
}

export default function MeetingMinutesForm({
  defenseId,
}: MeetingMinutesFormProps) {
  // State management
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false); // Toggle show/hide form

  // Form data - NO hard-coded values
  const [formData, setFormData] = useState({
    semester: "",
    year: "",
    councilId: "",
    chairperson: "",
    secretary: "",
    members: [] as string[],
    time: "",
    timeEn: "",
    venue: "",
    thesisName: "",
    thesisCode: "",
    startTime: "",
    endTime: "",
    studentGroup: [] as { id: string; name: string }[],
    presentationSummary: [] as { student: string; content: string }[],
    qa: [] as {
      questioner: string;
      question: string;
      respondent: string;
      answer: string;
      councilDiscussion: string;
    }[],
    assessments: {
      layout: "",
      theory: "",
      content: "",
      research: "",
    },
    grading: {
      comment: "",
      result: "ĐẠT" as "ĐẠT" | "KHÔNG ĐẠT",
      feedback: "",
    },
    officialGrades: [] as {
      id: string;
      name: string;
      grade: string;
      conclusion: string;
    }[],
    meetingEndTime: "",
    meetingEndDate: "",
    // Bonus mark checkboxes
    bonusMark: {
      research1_0: false, // ISI/Scopus research at 1.0
      app1_0: false, // Application in use at 1.0
      research0_5: false, // State Council research at 0.5
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Map API data to form
  const mapApiDataToForm = (data: any) => {
    const { councilInfo, sessionInfo, projectInfo, defenseProgress } = data;

    // Extract semester and year
    const { semester, year } = extractSemesterYear(projectInfo.semesterName);

    // Extract council members by role
    const chair = councilInfo.members.find((m: any) => m.role === "Chair");
    const secretary = councilInfo.members.find(
      (m: any) => m.role === "Secretary"
    );
    const members = councilInfo.members
      .filter((m: any) => m.role === "Member")
      .map((m: any) => m.fullName);

    // Format dates
    const timeVi = formatDateToVietnamese(
      sessionInfo.defenseDate,
      sessionInfo.startTime
    );
    const timeEn = formatDateToEnglish(
      sessionInfo.defenseDate,
      sessionInfo.startTime
    );

    // Map student presentations
    // API returns: presentationPoints (array of strings)
    const presentations = defenseProgress.studentPresentations.map(
      (p: any) => ({
        student: p.studentName,
        content: (p.presentationPoints || [])
          .map((c: string) => `- ${c}`)
          .join("\n"),
      })
    );

    // Map Q&A
    // API returns: lecturerName, respondentName, answerPoints (array)
    const qaList = defenseProgress.questionsAndAnswers.map((q: any) => ({
      questioner: q.lecturerName,
      question: q.question,
      respondent: q.respondentName,
      answer: (q.answerPoints || []).map((a: string) => `- ${a}`).join("\n"),
      councilDiscussion: q.councilDiscussion || "",
    }));

    // Map students to official grades
    const grades = projectInfo.students.map((s: any) => ({
      id: s.studentId,
      name: s.fullName,
      grade: "",
      conclusion: "",
    }));

    // Get actual times (fallback to session times if defenseProgress shows N/A)
    const actualStartTime =
      defenseProgress.actualStartTime &&
      defenseProgress.actualStartTime !== "N/A"
        ? defenseProgress.actualStartTime
        : sessionInfo.startTime;
    const actualEndTime =
      defenseProgress.actualEndTime && defenseProgress.actualEndTime !== "N/A"
        ? defenseProgress.actualEndTime
        : sessionInfo.endTime;

    // Format meeting end date from sessionInfo.defenseDate
    const defenseDate = sessionInfo.defenseDate?.split("T")[0] || "";
    const [yearStr, monthStr, dayStr] = defenseDate.split("-");
    const formattedEndDate = defenseDate
      ? `${dayStr}/${monthStr}/${yearStr}`
      : "";

    // Update form data
    setFormData({
      semester,
      year,
      councilId: councilInfo.description || "",
      chairperson: chair?.fullName || "",
      secretary: secretary?.fullName || "",
      members,
      time: timeVi,
      timeEn,
      venue: sessionInfo.location,
      thesisName: projectInfo.topicTitleVN || projectInfo.topicTitleEN,
      thesisCode: projectInfo.projectCode,
      startTime: formatTime(actualStartTime),
      endTime: formatTime(actualEndTime),
      studentGroup: projectInfo.students.map((s: any) => ({
        id: s.studentId,
        name: s.fullName,
      })),
      presentationSummary: presentations,
      qa: qaList,
      assessments: {
        layout: "",
        theory: "",
        content: "",
        research: "",
      },
      grading: {
        comment: "",
        result: "ĐẠT",
        feedback: "",
      },
      officialGrades: grades,
      meetingEndTime: formatTime(actualEndTime),
      meetingEndDate: formattedEndDate,
      bonusMark: {
        research1_0: false,
        app1_0: false,
        research0_5: false,
      },
    });
  };

  // Handle Fill Data
  const handleFillData = async () => {
    if (!defenseId) {
      swalConfig.warning("Missing ID", "Defense ID is required");
      return;
    }

    setLoading(true);
    try {
      // API expects POST with defenseSessionId in body
      const result = await apiClient.post<any>(
        "/api/defense-reports/generate",
        {
          defenseSessionId: parseInt(defenseId),
        }
      );

      console.log("API Response:", result);

      if (result.code === "DEF200" && result.data) {
        mapApiDataToForm(result.data);
        swalConfig.success("Success", "Data loaded successfully!");
      } else {
        // Check for 404/transcript not found error
        const responseMessage = result.message || "";
        const responseCode = result.code;
        if (
          responseCode === 404 ||
          responseMessage.includes("Item not found") ||
          responseMessage.includes("not found")
        ) {
          swalConfig.error("Error", "No transcript found for defense session");
        } else {
          swalConfig.error("Error", responseMessage || "Failed to load data");
        }
      }
    } catch (error: any) {
      console.error("Fill data error:", error);
      swalConfig.error(
        "Error",
        error.message || "Failed to load defense report data"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Save Minutes - Generate Word document and upload to server
  const handleSaveMinutes = async () => {
    setSaving(true);
    try {
      // Step 1: Generate Word document using shared utility function
      const wordBlob = await generateMeetingMinutesBlob(formData, defenseId);

      const wordFile = new File(
        [wordBlob],
        `meeting-minutes-${defenseId}.docx`,
        {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
      );

      console.log(
        "📤 Generated Word file:",
        wordFile.name,
        wordFile.size,
        "bytes"
      );

      // Step 2: Upload Word document using apiClient
      const uploadFormData = new FormData();
      uploadFormData.append("file", wordFile);

      const uploadResult = await apiClient.postFormData<any>(
        "/api/defense-reports/upload-pdf",
        uploadFormData
      );

      console.log("📤 Upload API Response:", uploadResult);
      console.log("📤 Upload data:", uploadResult.data);
      console.log("📤 downloadUrl field:", uploadResult.data?.downloadUrl);

      // Extract download URL from response (API returns downloadUrl for secure access)
      const downloadUrl =
        uploadResult.data?.downloadUrl ||
        uploadResult.data?.url ||
        uploadResult.data?.filePath ||
        (typeof uploadResult.data === "string" ? uploadResult.data : null);

      console.log("📤 Extracted downloadUrl:", downloadUrl);

      if (!downloadUrl) {
        throw new Error("No download URL returned from upload");
      }

      // Step 3: Save to DB using apiClient
      const reportPayload = {
        sessionId: parseInt(defenseId),
        filePath: downloadUrl,
        summary: `Defense session completed successfully with all members present`,
      };
      console.log("📤 Sending to /api/reports:", reportPayload);

      await apiClient.post<any>("/api/reports", reportPayload);

      swalConfig.success("Success", "Meeting minutes saved successfully!");
    } catch (error: any) {
      console.error("Save error:", error);
      swalConfig.error(
        "Error",
        error.message || "Failed to save meeting minutes"
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle Export Word
  const handleExportWord = async () => {
    try {
      // Generate Word document using shared utility function
      const blob = await generateMeetingMinutesBlob(formData, defenseId);

      saveAs(blob, `meeting-minutes-${defenseId}.docx`);
      swalConfig.success("Success", "Word document exported successfully!");
    } catch (error: any) {
      console.error("Export Word error:", error);
      swalConfig.error(
        "Error",
        error.message || "Failed to export Word document"
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Toggle Button - Always visible */}
      <div className="mb-4 flex items-center justify-between bg-white p-4 rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="font-bold text-gray-800">Biên bản họp hội đồng</h3>
            <p className="text-sm text-gray-500">Meeting Minutes Form</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Fill Data Button */}
          <button
            onClick={handleFillData}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Fill Data
              </>
            )}
          </button>
          {/* Export Word Button */}
          <button
            onClick={handleExportWord}
            disabled={!formData.semester}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white font-medium hover:from-green-700 hover:to-green-800 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" />
            Export Word
          </button>
          {/* Toggle Button */}
          <button
            onClick={() => setIsFormVisible(!isFormVisible)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
              isFormVisible
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {isFormVisible ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" />
                  <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z" />
                  <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" />
                </svg>
                Hide
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  <path
                    fillRule="evenodd"
                    d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Show
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Content - Conditionally rendered */}
      {isFormVisible && (
        <div
          className="bg-white p-8 md:p-12 shadow-lg rounded-xl border border-gray-200 text-gray-900"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          {/* Header */}
          <div className="mb-10 border-b-2 border-gray-100 pb-6">
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold uppercase text-gray-900 mb-1">
                Biên bản kết luận của hội đồng chấm điểm khóa luận
              </h1>
              <h2 className="text-lg md:text-xl font-bold italic text-gray-600 mb-4">
                Thesis Council Meeting Minutes
              </h2>
              <div className="flex justify-center items-center gap-4 text-lg">
                <p>
                  Học kỳ / <span className="italic">Semester</span>:{" "}
                  <input
                    type="text"
                    value={formData.semester}
                    onChange={(e) =>
                      handleInputChange("semester", e.target.value)
                    }
                    className="font-semibold border-b border-gray-300 focus:border-purple-500 outline-none px-2 w-24 text-center bg-transparent"
                  />
                </p>
                <p>
                  Năm / <span className="italic">Year</span>:{" "}
                  <input
                    type="text"
                    value={formData.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                    className="font-semibold border-b border-gray-300 focus:border-purple-500 outline-none px-2 w-20 text-center bg-transparent"
                  />
                </p>
              </div>
            </div>
          </div>

          {/* 1. Council Members */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4 flex items-baseline">
              1. Thành phần Hội đồng số /{" "}
              <span className="italic font-normal ml-1">
                Member of Thesis Council
              </span>{" "}
              <input
                type="text"
                value={formData.councilId}
                onChange={(e) => handleInputChange("councilId", e.target.value)}
                className="ml-2 font-bold border-b border-gray-300 focus:border-purple-500 outline-none px-2 w-24 bg-transparent"
              />
              , <span className="italic font-normal ml-1">including:</span>
            </h3>
            <div className="pl-4 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 items-center">
                <label className="font-semibold">
                  Chủ tịch hội đồng /{" "}
                  <span className="italic font-normal">Chairperson</span>:
                </label>
                <input
                  type="text"
                  value={formData.chairperson}
                  onChange={(e) =>
                    handleInputChange("chairperson", e.target.value)
                  }
                  className="w-full border-b border-gray-200 focus:border-purple-500 outline-none px-2 py-1 bg-gray-50/50 hover:bg-gray-50 transition-colors rounded"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 items-center">
                <label className="font-semibold">
                  Thư ký / <span className="italic font-normal">Secretary</span>
                  :
                </label>
                <input
                  type="text"
                  value={formData.secretary}
                  onChange={(e) =>
                    handleInputChange("secretary", e.target.value)
                  }
                  className="w-full border-b border-gray-200 focus:border-purple-500 outline-none px-2 py-1 bg-gray-50/50 hover:bg-gray-50 transition-colors rounded"
                />
              </div>
              {formData.members.map((member, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 items-center"
                >
                  <label className="font-semibold">
                    Ủy viên / <span className="italic font-normal">Member</span>
                    :
                  </label>
                  <input
                    type="text"
                    value={member}
                    onChange={(e) => {
                      const newMembers = [...formData.members];
                      newMembers[idx] = e.target.value;
                      handleInputChange("members", newMembers);
                    }}
                    className="w-full border-b border-gray-200 focus:border-purple-500 outline-none px-2 py-1 bg-gray-50/50 hover:bg-gray-50 transition-colors rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 2. Time and Venue */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">
              2. Thời gian, địa điểm /{" "}
              <span className="italic font-normal">Time and venue</span>:
            </h3>
            <div className="pl-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-2 items-center">
                <label>Thời gian:</label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => handleInputChange("time", e.target.value)}
                  className="w-full border-b border-gray-200 focus:border-purple-500 outline-none px-2 py-1 bg-gray-50/50 rounded"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-2 items-center">
                <label>Time:</label>
                <input
                  type="text"
                  value={formData.timeEn}
                  onChange={(e) => handleInputChange("timeEn", e.target.value)}
                  className="w-full border-b border-gray-200 focus:border-purple-500 outline-none px-2 py-1 bg-gray-50/50 rounded"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-2 items-center">
                <label>
                  Địa điểm / <span className="italic">Venue</span>:
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => handleInputChange("venue", e.target.value)}
                  className="w-full border-b border-gray-200 focus:border-purple-500 outline-none px-2 py-1 bg-gray-50/50 rounded"
                />
              </div>
            </div>
          </div>

          {/* 3. Progress */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">
              3. Diễn biến của quá trình bảo vệ khóa luận (tên khóa luận) /{" "}
              <span className="italic font-normal">
                Progress of the thesis defense: (Name of the thesis)
              </span>
              :
            </h3>
            <div className="pl-4 space-y-4">
              {/* Thesis Info */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 items-center">
                  <label className="font-bold">Đề tài:</label>
                  <input
                    type="text"
                    value={formData.thesisName}
                    onChange={(e) =>
                      handleInputChange("thesisName", e.target.value)
                    }
                    className="w-full border border-gray-300 focus:border-purple-500 outline-none px-3 py-1.5 rounded bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 items-center">
                  <label className="font-bold">Mã đề tài:</label>
                  <input
                    type="text"
                    value={formData.thesisCode}
                    onChange={(e) =>
                      handleInputChange("thesisCode", e.target.value)
                    }
                    className="w-full border border-gray-300 focus:border-purple-500 outline-none px-3 py-1.5 rounded bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 items-start">
                  <label className="font-bold pt-2">Nhóm thực hiện:</label>
                  <div className="space-y-2 w-full">
                    {formData.studentGroup.map((student, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="w-6 text-center text-gray-500">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={`${student.name} - ${student.id}`}
                          readOnly
                          className="flex-1 border-b border-transparent px-2 py-0.5 bg-transparent text-gray-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="flex flex-wrap gap-8">
                <div className="flex items-center gap-2">
                  <label>
                    Thời gian bắt đầu /{" "}
                    <span className="italic">Starting time</span>:
                  </label>
                  <input
                    type="text"
                    value={formData.startTime}
                    onChange={(e) =>
                      handleInputChange("startTime", e.target.value)
                    }
                    className="border-b border-gray-300 focus:border-purple-500 outline-none px-2 w-24 text-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label>
                    Thời gian kết thúc /{" "}
                    <span className="italic">Ending time</span>:
                  </label>
                  <input
                    type="text"
                    value={formData.endTime}
                    onChange={(e) =>
                      handleInputChange("endTime", e.target.value)
                    }
                    className="border-b border-gray-300 focus:border-purple-500 outline-none px-2 w-24 text-center"
                  />
                </div>
              </div>

              {/* Presentation Summary Table */}
              <div className="mt-6">
                <p className="mb-2 italic">
                  Tóm tắt phần trình bày của nhóm/sinh viên / Summarize the
                  presentation of the group/student:
                </p>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border-r border-b border-gray-300 p-2 w-1/4 text-left">
                          Sinh viên
                        </th>
                        <th className="border-b border-gray-300 p-2 text-left">
                          Nội dung trình bày
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.presentationSummary.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-200 last:border-0"
                        >
                          <td className="border-r border-gray-200 p-2 align-top">
                            <input
                              type="text"
                              value={item.student}
                              onChange={(e) => {
                                const newSummary = [
                                  ...formData.presentationSummary,
                                ];
                                newSummary[idx].student = e.target.value;
                                handleInputChange(
                                  "presentationSummary",
                                  newSummary
                                );
                              }}
                              className="w-full outline-none bg-transparent"
                              placeholder="Tên SV..."
                            />
                          </td>
                          <td className="p-2">
                            <textarea
                              value={item.content}
                              onChange={(e) => {
                                const newSummary = [
                                  ...formData.presentationSummary,
                                ];
                                newSummary[idx].content = e.target.value;
                                handleInputChange(
                                  "presentationSummary",
                                  newSummary
                                );
                              }}
                              className="w-full h-full min-h-[60px] outline-none resize-none bg-transparent"
                              placeholder="Nội dung..."
                              rows={3}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 text-sm flex items-center justify-center gap-1 transition-colors">
                    <Plus className="w-4 h-4" /> Thêm dòng
                  </button>
                </div>
              </div>

              {/* Q&A Table */}
              <div className="mt-8">
                <p className="mb-2 italic text-justify">
                  Ghi lại tóm tắt các câu hỏi của các thành viên hội đồng và
                  phần trả lời của nhóm/sinh viên đối với từng câu hỏi / summary
                  of questions from the council members and the group / student
                  responses:
                </p>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border-r border-b border-gray-300 p-2 w-1/2 text-left">
                          Câu hỏi từ Hội đồng
                        </th>
                        <th className="border-b border-gray-300 p-2 w-1/2 text-left">
                          Nội dung trả lời từ Nhóm
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.qa.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-200 last:border-0"
                        >
                          <td className="border-r border-gray-200 p-2 align-top">
                            <div className="mb-1">
                              <input
                                type="text"
                                value={item.questioner}
                                onChange={(e) => {
                                  const newQA = [...formData.qa];
                                  newQA[idx].questioner = e.target.value;
                                  handleInputChange("qa", newQA);
                                }}
                                className="font-bold outline-none bg-transparent w-full placeholder-gray-400"
                                placeholder="Người hỏi (VD: Cô Vân)..."
                              />
                            </div>
                            <textarea
                              value={item.question}
                              onChange={(e) => {
                                const newQA = [...formData.qa];
                                newQA[idx].question = e.target.value;
                                handleInputChange("qa", newQA);
                              }}
                              className="w-full min-h-[80px] outline-none resize-none bg-transparent"
                              placeholder="Nội dung câu hỏi..."
                            />
                            {/* Council Discussion - Nhận xét của Hội đồng */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="mb-1">
                                <span className="text-sm font-semibold text-blue-700">
                                  Nhận xét của Hội đồng /{" "}
                                  <span className="italic font-normal">
                                    Council Discussion:
                                  </span>
                                </span>
                              </div>
                              <textarea
                                value={item.councilDiscussion}
                                onChange={(e) => {
                                  const newQA = [...formData.qa];
                                  newQA[idx].councilDiscussion = e.target.value;
                                  handleInputChange("qa", newQA);
                                }}
                                className="w-full min-h-[60px] outline-none resize-none bg-blue-50/50 rounded p-2 text-sm border border-blue-100 focus:border-blue-300"
                                placeholder="Nhận xét về câu trả lời của sinh viên..."
                              />
                            </div>
                          </td>
                          <td className="p-2 align-top">
                            <div className="mb-1">
                              <input
                                type="text"
                                value={item.respondent}
                                onChange={(e) => {
                                  const newQA = [...formData.qa];
                                  newQA[idx].respondent = e.target.value;
                                  handleInputChange("qa", newQA);
                                }}
                                className="font-bold outline-none bg-transparent w-full placeholder-gray-400"
                                placeholder="Người trả lời (VD: Nhóm)..."
                              />
                            </div>
                            <textarea
                              value={item.answer}
                              onChange={(e) => {
                                const newQA = [...formData.qa];
                                newQA[idx].answer = e.target.value;
                                handleInputChange("qa", newQA);
                              }}
                              className="w-full min-h-[80px] outline-none resize-none bg-transparent"
                              placeholder="Nội dung trả lời..."
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 text-sm flex items-center justify-center gap-1 transition-colors">
                    <Plus className="w-4 h-4" /> Thêm câu hỏi
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Comments */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">
              4. Nhận xét, đánh giá của hội đồng đối với nhóm/sinh viên /{" "}
              <span className="italic font-normal">
                Comments and assessments of the council for the group / student:
              </span>
            </h3>
            <div className="space-y-4 pl-4">
              <div>
                <label className="block font-semibold mb-1">
                  4.1 – Bố cục, phương pháp trình bày /{" "}
                  <span className="italic font-normal">
                    Layout, presentation methods:
                  </span>
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded p-2 focus:border-purple-500 outline-none min-h-[60px]"
                  value={formData.assessments.layout}
                  onChange={(e) =>
                    handleInputChange("assessments", {
                      ...formData.assessments,
                      layout: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  4.2– Cơ sở lý luận của khóa luận /{" "}
                  <span className="italic font-normal">
                    Theoretical basis of the thesis:
                  </span>
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded p-2 focus:border-purple-500 outline-none min-h-[60px]"
                  value={formData.assessments.theory}
                  onChange={(e) =>
                    handleInputChange("assessments", {
                      ...formData.assessments,
                      theory: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  4.3- Nội dung đã đạt được: (Tính thực tiễn, khả năng ứng dụng,
                  tính sáng tạo...) /{" "}
                  <span className="italic font-normal">
                    Achieved Content: (practicality, applicability, creativity,
                    etc.)
                  </span>
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded p-2 focus:border-purple-500 outline-none min-h-[60px]"
                  value={formData.assessments.content}
                  onChange={(e) =>
                    handleInputChange("assessments", {
                      ...formData.assessments,
                      content: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  4.4 - Các hướng nghiên cứu của khóa luận /{" "}
                  <span className="italic font-normal">
                    The research directions of the thesis:
                  </span>
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded p-2 focus:border-purple-500 outline-none min-h-[60px]"
                  value={formData.assessments.research}
                  onChange={(e) =>
                    handleInputChange("assessments", {
                      ...formData.assessments,
                      research: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* 5. Grading Results */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">
              5. Kết quả chấm điểm của hội đồng đối với từng sinh viên /{" "}
              <span className="italic font-normal">
                Grading results for each student:
              </span>
            </h3>
            <div className="pl-4 space-y-6">
              <div>
                <p className="font-bold mb-2">
                  a. Nhận xét /{" "}
                  <span className="italic font-normal">Comment:</span>
                </p>
                <textarea
                  className="w-full border border-gray-300 rounded p-2 focus:border-purple-500 outline-none min-h-[60px]"
                  value={formData.grading.comment}
                  onChange={(e) =>
                    handleInputChange("grading", {
                      ...formData.grading,
                      comment: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex items-center gap-4">
                <span className="font-bold text-lg">Kết quả:</span>
                <select
                  value={formData.grading.result}
                  onChange={(e) =>
                    handleInputChange("grading", {
                      ...formData.grading,
                      result: e.target.value,
                    })
                  }
                  className="border border-gray-300 rounded px-4 py-2 font-bold text-purple-700 focus:border-purple-500 outline-none"
                >
                  <option value="ĐẠT">ĐẠT</option>
                  <option value="KHÔNG ĐẠT">KHÔNG ĐẠT</option>
                </select>
              </div>

              <div>
                <p className="font-bold mb-2 italic">
                  *** Phản hồi của Nhóm về đánh giá của Hội đồng:
                </p>
                <textarea
                  className="w-full border border-gray-300 rounded p-2 focus:border-purple-500 outline-none min-h-[60px]"
                  value={formData.grading.feedback}
                  onChange={(e) =>
                    handleInputChange("grading", {
                      ...formData.grading,
                      feedback: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Official Grade Table */}
          <div className="mb-8">
            <p className="font-bold mb-4">
              b. Điểm bảo vệ khóa luận chính thức /{" "}
              <span className="italic font-normal">
                Official grade for the defense:
              </span>
            </p>
            <div className="border border-gray-300 rounded overflow-hidden">
              <table className="w-full border-collapse text-base">
                <thead>
                  <tr className="bg-gray-100 text-center">
                    <th className="border-r border-b border-gray-300 p-3 w-14">
                      TT <br /> <span className="text-sm font-normal">No.</span>
                    </th>
                    <th className="border-r border-b border-gray-300 p-3">
                      MSSV <br />{" "}
                      <span className="text-sm font-normal">Student ID</span>
                    </th>
                    <th className="border-r border-b border-gray-300 p-3">
                      Họ tên <br />{" "}
                      <span className="text-sm font-normal">Full name</span>
                    </th>
                    <th className="border-r border-b border-gray-300 p-3">
                      Điểm khóa luận <br />{" "}
                      <span className="text-sm font-normal">
                        Thesis grade <br /> (on scale of 10)
                      </span>
                    </th>
                    <th className="border-b border-gray-300 p-3">
                      Conclusion <br />{" "}
                      <span className="text-sm font-normal">Kết luận</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.officialGrades.map((student, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-200 last:border-0"
                    >
                      <td className="border-r border-gray-200 p-3 text-center text-lg">
                        {idx + 1}
                      </td>
                      <td className="border-r border-gray-200 p-3 text-center text-lg">
                        {student.id}
                      </td>
                      <td className="border-r border-gray-200 p-3 font-medium text-lg">
                        {student.name}
                      </td>
                      <td className="border-r border-gray-200 p-3">
                        <input
                          type="text"
                          className="w-full text-center outline-none bg-transparent text-lg"
                          placeholder="..."
                          value={student.grade || ""}
                          onChange={(e) => {
                            const updatedGrades = [...formData.officialGrades];
                            updatedGrades[idx] = {
                              ...updatedGrades[idx],
                              grade: e.target.value,
                            };
                            handleInputChange("officialGrades", updatedGrades);
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          className="w-full outline-none bg-transparent text-lg"
                          value={student.conclusion || ""}
                          onChange={(e) => {
                            const updatedGrades = [...formData.officialGrades];
                            updatedGrades[idx] = {
                              ...updatedGrades[idx],
                              conclusion: e.target.value,
                            };
                            handleInputChange("officialGrades", updatedGrades);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* c. Bonus Mark Section */}
          <div className="mb-8">
            <p className="font-bold mb-2">
              c. Điểm thưởng của khóa luận /{" "}
              <span className="italic font-normal">
                Bonus mark of the thesis:
              </span>
            </p>
            <p className="mb-4">
              <span className="font-semibold">
                Điểm thưởng cho đồ án có kết quả nghiên cứu mới hoặc có khả năng
                ứng dụng được cho như bảng dưới đây.
              </span>
              <br />
              <span className="italic">
                Bonus Mark for Students' Project with Research and Application
                Results (Please tick × in the corresponding mark box)
              </span>
            </p>

            <div className="border border-gray-300 rounded overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th
                      className="border-r border-b border-gray-300 p-3 text-center align-middle"
                      rowSpan={2}
                    >
                      Điểm thưởng /{" "}
                      <span className="italic font-normal">Bonus mark</span>
                    </th>
                    <th
                      className="border-r border-b border-gray-300 p-3 text-center"
                      colSpan={2}
                    >
                      Nghiên cứu /{" "}
                      <span className="italic">Research Results</span>
                    </th>
                    <th
                      className="border-b border-gray-300 p-3 text-center"
                      colSpan={2}
                    >
                      Ứng dụng /{" "}
                      <span className="italic">Application Results</span>
                    </th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="border-r border-b border-gray-300 p-2 text-left">
                      Tiêu chí / <span className="italic">Criteria</span>
                    </th>
                    <th className="border-r border-b border-gray-300 p-2 text-center w-20">
                      Chọn/<span className="italic">Mark</span>
                    </th>
                    <th className="border-r border-b border-gray-300 p-2 text-left">
                      Tiêu chí / <span className="italic">Criteria</span>
                    </th>
                    <th className="border-b border-gray-300 p-2 text-center w-20">
                      Chọn/<span className="italic">Mark</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1.0 */}
                  <tr className="border-b border-gray-200">
                    <td className="border-r border-gray-200 p-3 text-center font-bold align-top">
                      1.0
                    </td>
                    <td className="border-r border-gray-200 p-3 align-top">
                      <p>
                        Kết quả nghiên cứu của khóa luận đã được chấp nhận đăng
                        và đóng phí hoặc được xuất bản ở tạp chí/kỷ yếu thuộc
                        danh mục ISI/Scopus/{" "}
                        <span className="italic">
                          The project's research results have either been
                          accepted and paid for or published in ISI/Scopus
                          indexed journal(s) or proceeding(s).
                        </span>
                      </p>
                    </td>
                    <td className="border-r border-gray-200 p-3 text-center align-top">
                      <input
                        type="checkbox"
                        className="w-5 h-5 cursor-pointer accent-purple-600"
                        checked={formData.bonusMark.research1_0}
                        onChange={(e) =>
                          handleInputChange("bonusMark", {
                            ...formData.bonusMark,
                            research1_0: e.target.checked,
                          })
                        }
                      />
                    </td>
                    <td className="border-r border-gray-200 p-3 align-top">
                      <p>
                        Sản phẩm đã được đưa vào sử dụng/{" "}
                        <span className="italic">
                          The product(s) has been put into use.
                        </span>
                      </p>
                    </td>
                    <td className="p-3 text-center align-top">
                      <input
                        type="checkbox"
                        className="w-5 h-5 cursor-pointer accent-purple-600"
                        checked={formData.bonusMark.app1_0}
                        onChange={(e) =>
                          handleInputChange("bonusMark", {
                            ...formData.bonusMark,
                            app1_0: e.target.checked,
                          })
                        }
                      />
                    </td>
                  </tr>

                  {/* Row 0.5 */}
                  <tr>
                    <td className="border-r border-gray-200 p-3 text-center font-bold align-top">
                      0.5
                    </td>
                    <td className="border-r border-gray-200 p-3 align-top">
                      <p>
                        Kết quả nghiên cứu của khóa luận đã được chấp nhận đăng
                        và đóng phí hoặc được xuất bản ở tạp chí/kỷ yếu thuộc
                        danh mục Hội đồng chức danh giáo sư nhà nước/{" "}
                        <span className="italic">
                          The project's research results have either been
                          accepted and paid for or published in journal(s) or
                          proceeding(s) that are on the State Council of
                          Professors' approved list.
                        </span>
                      </p>
                    </td>
                    <td className="border-r border-gray-200 p-3 text-center align-top">
                      <input
                        type="checkbox"
                        className="w-5 h-5 cursor-pointer accent-purple-600"
                        checked={formData.bonusMark.research0_5}
                        onChange={(e) =>
                          handleInputChange("bonusMark", {
                            ...formData.bonusMark,
                            research0_5: e.target.checked,
                          })
                        }
                      />
                    </td>
                    <td className="border-r border-gray-200 p-3 align-top">
                      {/* Empty cell for Application Results at 0.5 */}
                    </td>
                    <td className="p-3 text-center align-top">
                      {/* Empty cell */}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-2 italic">
              Note: Điểm thưởng là điểm lớn nhất trong hai tiêu chí trên /{" "}
              <span className="italic">Bonus mark is the highest one.</span>
            </p>
          </div>

          {/* Meeting End Time and Signatures */}
          <div className="mb-12">
            <p className="mb-8">
              Biên bản kết thúc vào lúc{" "}
              <input
                type="text"
                value={formData.meetingEndTime || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    meetingEndTime: e.target.value,
                  }))
                }
                className="border-b border-gray-300 focus:border-purple-500 outline-none px-2 w-32 text-center bg-transparent"
              />{" "}
              ngày{" "}
              <input
                type="text"
                value={formData.meetingEndDate || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    meetingEndDate: e.target.value,
                  }))
                }
                className="border-b border-gray-300 focus:border-purple-500 outline-none px-2 w-28 text-center bg-transparent"
              />
              <br />
              <span className="italic">
                The meeting <span className="underline">end</span> at{" "}
                {formData.meetingEndTime || "___"} on{" "}
                {formData.meetingEndDate || "___"}
              </span>
            </p>

            <div className="grid grid-cols-2 gap-8 mt-12">
              {/* Chairperson Signature */}
              <div className="text-center">
                <p className="font-bold mb-1">Chủ tịch hội đồng</p>
                <p className="font-bold italic mb-16">Chairperson</p>
                <p className="font-medium">{formData.chairperson}</p>
              </div>

              {/* Secretary Signature */}
              <div className="text-center">
                <p className="font-bold mb-1">Thư ký hội đồng</p>
                <p className="font-bold italic mb-16">Secretary</p>
                <p className="font-medium">{formData.secretary}</p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-4 mt-12 pt-6 border-t border-gray-200">
            <button
              onClick={handleExportWord}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export Word
            </button>
            <button
              onClick={handleSaveMinutes}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Minutes"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
