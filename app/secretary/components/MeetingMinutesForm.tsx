"use client";

import { useState } from "react";
import { Plus, Trash2, Download, RefreshCw, FileText } from "lucide-react";
import { swalConfig } from "@/lib/utils/sweetAlert";
import { apiClient } from "@/lib/api/client";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";

interface MeetingMinutesFormProps {
  defenseId: string; // Defense ID = Transcript ID
}

// Helper function: Format ISO date to Vietnamese
const formatDateToVietnamese = (isoDate: string, time: string): string => {
  const date = new Date(isoDate);
  const hours = time.split(":")[0];
  const minutes = time.split(":")[1];

  return `${hours} giờ ${minutes} phút, ngày ${date
    .getDate()
    .toString()
    .padStart(2, "0")} tháng ${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")} năm ${date.getFullYear()}`;
};

// Helper function: Format ISO date to English
const formatDateToEnglish = (isoDate: string, time: string): string => {
  const date = new Date(isoDate);
  const hours = time.split(":")[0];
  const minutes = time.split(":")[1];

  return `${hours}h${minutes}', ${date
    .getDate()
    .toString()
    .padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
};

// Helper function: Format time HH:mm:ss to HHhMM'
const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(":");
  return `${hours}h${minutes}'`;
};

// Helper function: Extract semester and year from semesterName
const extractSemesterYear = (
  semesterName: string
): { semester: string; year: string } => {
  // e.g., "Fall 2025" -> { semester: "Fall", year: "2025" }
  const parts = semesterName.split(" ");
  return {
    semester: parts[0] || "",
    year: parts[1] || "",
  };
};

export default function MeetingMinutesForm({
  defenseId,
}: MeetingMinutesFormProps) {
  // State management
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    const presentations = defenseProgress.studentPresentations.map(
      (p: any) => ({
        student: p.studentName,
        content: p.presentationContent.map((c: string) => `- ${c}`).join("\n"),
      })
    );

    // Map Q&A
    const qaList = defenseProgress.questionsAndAnswers.map((q: any) => ({
      questioner: q.lecturer,
      question: q.question,
      respondent: q.respondent,
      answer: q.answerContent,
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
        swalConfig.error("Error", result.message || "Failed to load data");
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

  // Handle Save Minutes
  const handleSaveMinutes = async () => {
    setSaving(true);
    try {
      // Step 1: Generate PDF from current form (placeholder - will need actual PDF generation)
      // For now, we'll create a simple text representation
      const pdfBlob = new Blob([JSON.stringify(formData, null, 2)], {
        type: "application/pdf",
      });
      const pdfFile = new File([pdfBlob], `meeting-minutes-${defenseId}.pdf`, {
        type: "application/pdf",
      });

      // Step 2: Upload PDF using apiClient
      const uploadFormData = new FormData();
      uploadFormData.append("file", pdfFile);

      const uploadResult = await apiClient.postFormData<any>(
        "/api/defense-reports/upload-pdf",
        uploadFormData
      );

      // Extract PDF URL from response (API returns fileUrl)
      const pdfUrl =
        uploadResult.data?.fileUrl ||
        uploadResult.data?.url ||
        uploadResult.data?.filePath ||
        (typeof uploadResult.data === "string" ? uploadResult.data : null);

      if (!pdfUrl) {
        throw new Error("No PDF URL returned from upload");
      }

      // Step 3: Save to DB using apiClient
      await apiClient.post<any>("/api/reports", {
        sessionId: parseInt(defenseId),
        filePath: pdfUrl,
        summary: `Defense session completed successfully with all members present`,
      });

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
      // Create presentation table rows
      const presentationTableRows = formData.presentationSummary.map(
        (p) =>
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: p.student, size: 22 })],
                  }),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: p.content || "", size: 22 }),
                    ],
                  }),
                ],
                width: { size: 80, type: WidthType.PERCENTAGE },
              }),
            ],
          })
      );

      // Create Q&A table rows - group by questioner
      const qaTableRows = formData.qa.map(
        (q) =>
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${q.questioner}:`,
                        bold: true,
                        size: 22,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: q.question, size: 22 })],
                  }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${q.respondent}:`,
                        bold: true,
                        size: 22,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: q.answer, size: 22 })],
                  }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
            ],
          })
      );

      // Create official grades table rows
      const gradesTableRows = formData.officialGrades.map(
        (g, idx) =>
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: `${idx + 1}`, size: 22 })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: g.id, size: 22 })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: g.name, size: 22 })],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: g.grade || "", size: 22 })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: g.conclusion || "", size: 22 }),
                    ],
                  }),
                ],
              }),
            ],
          })
      );

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Header - FPT University
              new Paragraph({
                children: [
                  new TextRun({
                    text: "FPT Education",
                    color: "FF6600",
                    bold: true,
                    size: 28,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "TRƯỜNG ĐẠI HỌC FPT",
                    bold: true,
                    size: 28,
                    color: "FF6600",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
              }),

              // Title
              new Paragraph({
                children: [
                  new TextRun({
                    text: "BIÊN BẢN KẾT LUẬN CỦA HỘI ĐỒNG CHẤM ĐIỂM KHÓA LUẬN",
                    bold: true,
                    size: 26,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "THESIS COUNCIL MEETING MINUTES",
                    italics: true,
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Học kỳ / Semester `, size: 24 }),
                  new TextRun({ text: formData.semester, size: 24 }),
                  new TextRun({ text: ` Năm / Year `, size: 24 }),
                  new TextRun({ text: formData.year, size: 24 }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
              }),

              // Section 1: Council members
              new Paragraph({
                children: [
                  new TextRun({ text: "1. ", bold: true, size: 24 }),
                  new TextRun({
                    text: "Thành phần Hội đồng số / Member of Thesis ",
                    bold: true,
                    size: 24,
                  }),
                  new TextRun({
                    text: "Council ",
                    bold: true,
                    italics: true,
                    size: 24,
                  }),
                  new TextRun({ text: formData.councilId, size: 24 }),
                  new TextRun({
                    text: ", including:",
                    italics: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 150 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Chủ tịch hội đồng / ", size: 24 }),
                  new TextRun({ text: "Chairperson", italics: true, size: 24 }),
                  new TextRun({ text: `: ${formData.chairperson}`, size: 24 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Thư ký / ", size: 24 }),
                  new TextRun({ text: "Secretary", italics: true, size: 24 }),
                  new TextRun({ text: `: ${formData.secretary}`, size: 24 }),
                ],
              }),
              ...formData.members.map(
                (member) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Ủy viên / ", size: 24 }),
                      new TextRun({ text: "Member", italics: true, size: 24 }),
                      new TextRun({ text: `: ${member}`, size: 24 }),
                    ],
                  })
              ),

              // Section 2: Time and venue
              new Paragraph({
                children: [
                  new TextRun({ text: "2. ", bold: true, size: 24 }),
                  new TextRun({
                    text: "Thời gian, địa điểm / ",
                    bold: true,
                    size: 24,
                  }),
                  new TextRun({
                    text: "Time and venue:",
                    bold: true,
                    italics: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 150 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Thời gian: ${formData.time}`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Time: ${formData.timeEn}`,
                    italics: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Địa điểm / ", size: 24 }),
                  new TextRun({ text: "Venue", italics: true, size: 24 }),
                  new TextRun({ text: `: ${formData.venue}`, size: 24 }),
                ],
              }),

              // Section 3: Progress of defense
              new Paragraph({
                children: [
                  new TextRun({ text: "3. ", bold: true, size: 24 }),
                  new TextRun({
                    text: "Diễn biến của quá trình bảo vệ khóa luận (tên khóa luận) / ",
                    bold: true,
                    size: 24,
                  }),
                  new TextRun({
                    text: "Progress of the thesis defense: (Name of the thesis):",
                    bold: true,
                    italics: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 150 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Thời gian bắt đầu / Starting time: ${formData.startTime}`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Thời gian kết thúc / Ending time: ${formData.endTime}`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Tóm tắt phần trình bày của nhóm/sinh viên / ",
                    size: 24,
                  }),
                  new TextRun({
                    text: "Summarize the presentation of the group/student:",
                    italics: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Đề tài:", bold: true, size: 24 }),
                ],
                indent: { left: 720 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: formData.thesisName, size: 24 }),
                ],
                indent: { left: 720 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Mã đề tài: ", bold: true, size: 24 }),
                  new TextRun({ text: formData.thesisCode, size: 24 }),
                ],
                indent: { left: 720 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Nhóm thực hiện:",
                    bold: true,
                    size: 24,
                  }),
                ],
                indent: { left: 720 },
              }),
              ...formData.studentGroup.map(
                (student, idx) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${idx + 1}. ${student.name} - ${student.id}`,
                        size: 24,
                      }),
                    ],
                    indent: { left: 1080 },
                  })
              ),

              // Presentation Table
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Sinh viên",
                                bold: true,
                                size: 22,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        shading: { fill: "E0E0E0" },
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Nội dung trình bày",
                                bold: true,
                                size: 22,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        width: { size: 80, type: WidthType.PERCENTAGE },
                        shading: { fill: "E0E0E0" },
                      }),
                    ],
                  }),
                  ...presentationTableRows,
                ],
              }),

              // Q&A Section
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Ghi lại tóm tắt các câu hỏi của các thành viên hội đồng và phản trả lời của nhóm/ sinh viên đối với từng câu hỏi / ",
                    size: 24,
                  }),
                  new TextRun({
                    text: "summary of questions from the council members and the group / student responses:",
                    italics: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 150 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Câu hỏi từ Hội đồng",
                                bold: true,
                                size: 22,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        shading: { fill: "E0E0E0" },
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Nội dung trả lời từ Nhóm",
                                bold: true,
                                size: 22,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        shading: { fill: "E0E0E0" },
                      }),
                    ],
                  }),
                  ...qaTableRows,
                ],
              }),

              // Section 4: Assessments
              new Paragraph({
                children: [
                  new TextRun({ text: "1. ", bold: true, size: 24 }),
                  new TextRun({
                    text: "Nhận xét, đánh giá của hội đồng đối với nhóm/sinh viên / ",
                    bold: true,
                    size: 24,
                  }),
                  new TextRun({
                    text: "Comments and assessments of the council for the group / student:",
                    bold: true,
                    italics: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "4.1 – Bố cục, phương pháp trình bày / ",
                    size: 24,
                  }),
                  new TextRun({
                    text: "Layout, presentation methods:",
                    italics: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: formData.assessments.layout || "",
                    size: 24,
                  }),
                ],
                indent: { left: 720 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "4.2 – Cơ sở lý luận của khóa luận / ",
                    size: 24,
                  }),
                  new TextRun({
                    text: "Theoretical basis of the thesis:",
                    italics: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: formData.assessments.theory || "",
                    size: 24,
                  }),
                ],
                indent: { left: 720 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "4.3 – Nội dung đã đạt được: (Tính thực tiễn, khả năng ứng dụng, tính sáng tạo...) / ",
                    size: 24,
                  }),
                  new TextRun({
                    text: "Achieved Content: (practicality, applicability, creativity, etc.)",
                    italics: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: formData.assessments.content || "",
                    size: 24,
                  }),
                ],
                indent: { left: 720 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "4.4 – Các hướng nghiên cứu của khóa luận / ",
                    size: 24,
                  }),
                  new TextRun({
                    text: "The research directions of the thesis:",
                    italics: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: formData.assessments.research || "",
                    size: 24,
                  }),
                ],
                indent: { left: 720 },
              }),

              // Section 2: Grading Results
              new Paragraph({
                children: [
                  new TextRun({ text: "2. ", bold: true, size: 24 }),
                  new TextRun({
                    text: "Kết quả chấm điểm của hội đồng đối với từng sinh viên / ",
                    bold: true,
                    size: 24,
                  }),
                  new TextRun({
                    text: "Grading results for each student:",
                    bold: true,
                    italics: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "a. ", bold: true, size: 24 }),
                  new TextRun({ text: "Nhận xét / ", size: 24 }),
                  new TextRun({ text: "Comment:", italics: true, size: 24 }),
                ],
                indent: { left: 360 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: formData.grading.comment || "",
                    size: 24,
                  }),
                ],
                indent: { left: 720 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Kết quả: ", bold: true, size: 24 }),
                  new TextRun({
                    text: formData.grading.result,
                    bold: true,
                    size: 24,
                  }),
                ],
                indent: { left: 720 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "*** Phản hồi của Nhóm về đánh giá của Hội đồng:",
                    italics: true,
                    size: 24,
                  }),
                ],
                indent: { left: 720 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: formData.grading.feedback || "",
                    size: 24,
                  }),
                ],
                indent: { left: 720 },
              }),

              // Official Grades Table
              new Paragraph({
                children: [
                  new TextRun({ text: "b. ", bold: true, size: 24 }),
                  new TextRun({
                    text: "Điểm bảo vệ khóa luận chính thức / ",
                    size: 24,
                  }),
                  new TextRun({
                    text: "Official grade for the defense:",
                    italics: true,
                    size: 24,
                  }),
                ],
                indent: { left: 360 },
                spacing: { before: 150 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: "TT", bold: true, size: 20 }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "No.",
                                italics: true,
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        shading: { fill: "E0E0E0" },
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "MSSV",
                                bold: true,
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Student ID",
                                italics: true,
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        shading: { fill: "E0E0E0" },
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Họ tên",
                                bold: true,
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Full name",
                                italics: true,
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        shading: { fill: "E0E0E0" },
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Điểm khóa luận",
                                bold: true,
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "(thang điểm 10)",
                                size: 18,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Thesis grade",
                                italics: true,
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "(on scale of 10)",
                                italics: true,
                                size: 18,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        shading: { fill: "E0E0E0" },
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Conclusion",
                                italics: true,
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Kết luận",
                                bold: true,
                                size: 20,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        shading: { fill: "E0E0E0" },
                      }),
                    ],
                  }),
                  ...gradesTableRows,
                ],
              }),

              // Meeting end
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Biên bản kết thúc vào lúc ${formData.meetingEndTime} ngày ${formData.meetingEndDate}`,
                    size: 24,
                  }),
                ],
                spacing: { before: 300 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `The meeting `,
                    italics: true,
                    size: 24,
                  }),
                  new TextRun({
                    text: "end",
                    italics: true,
                    underline: {},
                    size: 24,
                  }),
                  new TextRun({
                    text: ` at ${formData.meetingEndTime} on ${formData.meetingEndDate}`,
                    italics: true,
                    size: 24,
                  }),
                ],
                spacing: { after: 300 },
              }),

              // Signatures
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Chủ tịch hội đồng",
                    bold: true,
                    size: 24,
                  }),
                  new TextRun({
                    text: "                                                  ",
                    size: 24,
                  }),
                  new TextRun({
                    text: "Thư ký hội đồng",
                    bold: true,
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 400 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Chairperson", italics: true, size: 24 }),
                  new TextRun({
                    text: "                                                            ",
                    size: 24,
                  }),
                  new TextRun({ text: "Secretary", italics: true, size: 24 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: formData.chairperson, size: 24 }),
                  new TextRun({
                    text: "                                                  ",
                    size: 24,
                  }),
                  new TextRun({ text: formData.secretary, size: 24 }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 600 },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
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
    <div
      className="bg-white p-8 md:p-12 shadow-lg rounded-xl border border-gray-200 max-w-5xl mx-auto text-gray-900"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      {/* Header */}
      <div className="mb-10 border-b-2 border-gray-100 pb-6">
        {/* Fill Data Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleFillData}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        </div>

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
                onChange={(e) => handleInputChange("semester", e.target.value)}
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
              onChange={(e) => handleInputChange("chairperson", e.target.value)}
              className="w-full border-b border-gray-200 focus:border-purple-500 outline-none px-2 py-1 bg-gray-50/50 hover:bg-gray-50 transition-colors rounded"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 items-center">
            <label className="font-semibold">
              Thư ký / <span className="italic font-normal">Secretary</span>:
            </label>
            <input
              type="text"
              value={formData.secretary}
              onChange={(e) => handleInputChange("secretary", e.target.value)}
              className="w-full border-b border-gray-200 focus:border-purple-500 outline-none px-2 py-1 bg-gray-50/50 hover:bg-gray-50 transition-colors rounded"
            />
          </div>
          {formData.members.map((member, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 items-center"
            >
              <label className="font-semibold">
                Ủy viên / <span className="italic font-normal">Member</span>:
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
                onChange={(e) => handleInputChange("startTime", e.target.value)}
                className="border-b border-gray-300 focus:border-purple-500 outline-none px-2 w-24 text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <label>
                Thời gian kết thúc / <span className="italic">Ending time</span>
                :
              </label>
              <input
                type="text"
                value={formData.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
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
              Ghi lại tóm tắt các câu hỏi của các thành viên hội đồng và phần
              trả lời của nhóm/sinh viên đối với từng câu hỏi / summary of
              questions from the council members and the group / student
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
              a. Nhận xét / <span className="italic font-normal">Comment:</span>
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
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="border-r border-b border-gray-300 p-2 w-12">
                  TT <br /> <span className="text-xs font-normal">No.</span>
                </th>
                <th className="border-r border-b border-gray-300 p-2">
                  MSSV <br />{" "}
                  <span className="text-xs font-normal">Student ID</span>
                </th>
                <th className="border-r border-b border-gray-300 p-2">
                  Họ tên <br />{" "}
                  <span className="text-xs font-normal">Full name</span>
                </th>
                <th className="border-r border-b border-gray-300 p-2">
                  Điểm khóa luận <br />{" "}
                  <span className="text-xs font-normal">
                    Thesis grade <br /> (on scale of 10)
                  </span>
                </th>
                <th className="border-b border-gray-300 p-2">
                  Conclusion <br />{" "}
                  <span className="text-xs font-normal">Kết luận</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {formData.officialGrades.map((student, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-200 last:border-0"
                >
                  <td className="border-r border-gray-200 p-2 text-center">
                    {idx + 1}
                  </td>
                  <td className="border-r border-gray-200 p-2 text-center">
                    {student.id}
                  </td>
                  <td className="border-r border-gray-200 p-2 font-medium">
                    {student.name}
                  </td>
                  <td className="border-r border-gray-200 p-2">
                    <input
                      type="text"
                      className="w-full text-center outline-none bg-transparent"
                      placeholder="..."
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full outline-none bg-transparent"
                      defaultValue={student.conclusion}
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
          <span className="italic font-normal">Bonus mark of the thesis:</span>
        </p>
        <p className="mb-4">
          <span className="font-semibold">
            Điểm thưởng cho đồ án có kết quả nghiên cứu mới hoặc có khả năng ứng
            dụng được cho như bảng dưới đây.
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
                  Nghiên cứu / <span className="italic">Research Results</span>
                </th>
                <th
                  className="border-b border-gray-300 p-3 text-center"
                  colSpan={2}
                >
                  Ứng dụng / <span className="italic">Application Results</span>
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
                    Kết quả nghiên cứu của khóa luận đã được chấp nhận đăng và
                    đóng phí hoặc được xuất bản ở tạp chí/kỷ yếu thuộc danh mục
                    ISI/Scopus/{" "}
                    <span className="italic">
                      The project's research results have either been accepted
                      and paid for or published in ISI/Scopus indexed journal(s)
                      or proceeding(s).
                    </span>
                  </p>
                </td>
                <td className="border-r border-gray-200 p-3 text-center align-top">
                  <input
                    type="checkbox"
                    className="w-5 h-5 cursor-pointer accent-purple-600"
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
                    Kết quả nghiên cứu của khóa luận đã được chấp nhận đăng và
                    đóng phí hoặc được xuất bản ở tạp chí/kỷ yếu thuộc danh mục
                    Hội đồng chức danh giáo sư nhà nước/{" "}
                    <span className="italic">
                      The project's research results have either been accepted
                      and paid for or published in journal(s) or proceeding(s)
                      that are on the State Council of Professors' approved
                      list.
                    </span>
                  </p>
                </td>
                <td className="border-r border-gray-200 p-3 text-center align-top">
                  <input
                    type="checkbox"
                    className="w-5 h-5 cursor-pointer accent-purple-600"
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
  );
}
