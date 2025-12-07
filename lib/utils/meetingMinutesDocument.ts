import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

// HELPER FUNCTIONS

// Format ISO date to Vietnamese
export const formatDateToVietnamese = (
  isoDate: string,
  time: string
): string => {
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

// Format ISO date to English
export const formatDateToEnglish = (isoDate: string, time: string): string => {
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

// Format time HH:mm:ss to HHhMM'
export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(":");
  return `${hours}h${minutes}'`;
};

// Extract semester and year from semesterName
export const extractSemesterYear = (
  semesterName: string
): { semester: string; year: string } => {
  const parts = semesterName.split(" ");
  return {
    semester: parts[0] || "",
    year: parts[1] || "",
  };
};

// MEETING MINUTES WORD DOCUMENT GENERATOR

/**
 * Generates a Word document blob for meeting minutes
 * Uses the exact same format as the original handleExportWord function
 */
export async function generateMeetingMinutesBlob(
  formData: any,
  defenseId: string
): Promise<Blob> {
  // Create presentation table rows
  const presentationTableRows = formData.presentationSummary.map(
    (p: any) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: p.student, size: 24 })],
              }),
            ],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: p.content || "", size: 24 })],
              }),
            ],
            width: { size: 80, type: WidthType.PERCENTAGE },
          }),
        ],
      })
  );

  // Create Q&A table rows - group by questioner
  const qaTableRows = formData.qa.map(
    (q: any) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${q.questioner}:`,
                    bold: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [new TextRun({ text: q.question, size: 24 })],
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
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [new TextRun({ text: q.answer, size: 24 })],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      })
  );

  // Create official grades table rows
  const gradesTableRows = formData.officialGrades.map(
    (g: any, idx: number) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${idx + 1}`, size: 24 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: g.id, size: 24 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: g.name, size: 24 })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: g.grade || "", size: 24 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: g.conclusion || "", size: 24 })],
              }),
            ],
          }),
        ],
      })
  );

  // Fetch logo image
  let logoImageBuffer: ArrayBuffer | null = null;
  try {
    const logoResponse = await fetch("/fpt-logo.png");
    if (logoResponse.ok) {
      logoImageBuffer = await logoResponse.arrayBuffer();
    }
  } catch (error) {
    console.warn("Could not load logo:", error);
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header - FPT University Logo
          ...(logoImageBuffer
            ? [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: logoImageBuffer,
                      transformation: {
                        width: 224,
                        height: 87,
                      },
                      type: "png",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 100 },
                }),
              ]
            : [
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
              ]),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: "BIÊN BẢN KẾT LUẬN CỦA HỘI ĐỒNG CHẤM ĐIỂM KHÓA LUẬN",
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "THESIS COUNCIL MEETING MINUTES",
                bold: true,
                italics: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Học kỳ / Semester `,
                bold: true,
                size: 24,
              }),
              new TextRun({
                text: formData.semester,
                size: 24,
              }),
              new TextRun({ text: ` Năm / Year `, bold: true, size: 24 }),
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
            (member: string) =>
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
            children: [new TextRun({ text: "Đề tài:", bold: true, size: 24 })],
            indent: { left: 720 },
          }),
          new Paragraph({
            children: [new TextRun({ text: formData.thesisName, size: 24 })],
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
            (student: { id: string; name: string }, idx: number) =>
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
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 24, type: WidthType.PERCENTAGE },
                    shading: { fill: "E0E0E0" },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Nội dung trình bày",
                            bold: true,
                            size: 24,
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
                            size: 24,
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
                            size: 24,
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
                          new TextRun({ text: "TT", bold: true, size: 24 }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "No.",
                            italics: true,
                            size: 24,
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
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Student ID",
                            italics: true,
                            size: 24,
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
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Full name",
                            italics: true,
                            size: 24,
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
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "(thang điểm 10)",
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Thesis grade",
                            bold: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "(on scale of 10)",
                            size: 24,
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
                            bold: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Kết luận",
                            bold: true,
                            size: 24,
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

          // c. Bonus Mark Section
          new Paragraph({
            children: [
              new TextRun({ text: "c. ", bold: true, size: 24 }),
              new TextRun({
                text: "Điểm thưởng của khóa luận / ",
                size: 24,
              }),
              new TextRun({
                text: "Bonus mark of the thesis:",
                italics: true,
                size: 24,
              }),
            ],
            indent: { left: 360 },
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Điểm thưởng cho đồ án có kết quả nghiên cứu mới hoặc có khả năng ứng dụng được cho như bảng dưới đây.",
                size: 24,
              }),
            ],
            indent: { left: 360 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Bonus Mark for Students' Project with Research and Application Results (Please tick × in the corresponding mark box)",
                italics: true,
                size: 24,
              }),
            ],
            indent: { left: 360 },
            spacing: { after: 100 },
          }),
          // Bonus Mark Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header Row 1
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Điểm thưởng/",
                            bold: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Bonus mark",
                            italics: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { fill: "E0E0E0" },
                    rowSpan: 2,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Nghiên cứu / ",
                            bold: true,
                            size: 24,
                          }),
                          new TextRun({
                            text: "Research Results",
                            italics: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { fill: "E0E0E0" },
                    columnSpan: 2,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Ứng dụng / ",
                            bold: true,
                            size: 24,
                          }),
                          new TextRun({
                            text: "Application Results",
                            italics: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { fill: "E0E0E0" },
                    columnSpan: 2,
                  }),
                ],
              }),
              // Header Row 2
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Tiêu chí/", size: 24 }),
                          new TextRun({
                            text: "Criteria",
                            italics: true,
                            size: 24,
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
                          new TextRun({ text: "Chọn/", size: 24 }),
                          new TextRun({
                            text: "Mark",
                            italics: true,
                            size: 24,
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
                          new TextRun({ text: "Tiêu chí/", size: 24 }),
                          new TextRun({
                            text: "Criteria",
                            italics: true,
                            size: 24,
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
                          new TextRun({ text: "Chọn/", size: 24 }),
                          new TextRun({
                            text: "Mark",
                            italics: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { fill: "E0E0E0" },
                  }),
                ],
              }),
              // Data Row 1.0
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "1.0",
                            bold: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Kết quả nghiên cứu của khóa luận đã được chấp nhận đăng và đóng phí hoặc được xuất bản ở tạp chí/kỷ yếu thuộc danh mục ISI/Scopus/ ",
                            size: 24,
                          }),
                          new TextRun({
                            text: "The project's research results have either been accepted and paid for or published in ISI/Scopus indexed journal(s) or proceeding(s).",
                            italics: true,
                            size: 24,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: formData.bonusMark.research1_0 ? "☑" : "☐",
                            size: 28,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Sản phẩm đã được đưa vào sử dụng/ ",
                            size: 24,
                          }),
                          new TextRun({
                            text: "The product(s) has been put into use.",
                            italics: true,
                            size: 24,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: formData.bonusMark.app1_0 ? "☑" : "☐",
                            size: 28,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                ],
              }),
              // Data Row 0.5
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "0.5",
                            bold: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Kết quả nghiên cứu của khóa luận đã được chấp nhận đăng và đóng phí hoặc được xuất bản ở tạp chí/kỷ yếu thuộc danh mục Hội đồng chức danh giáo sư nhà nước/ ",
                            size: 24,
                          }),
                          new TextRun({
                            text: "The project's research results have either been accepted and paid for or published in journal(s) or proceeding(s) that are on the State Council of Professors' approved list.",
                            italics: true,
                            size: 24,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: formData.bonusMark.research0_5 ? "☑" : "☐",
                            size: 28,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [] })],
                  }),
                ],
              }),
            ],
          }),
          // Bonus note
          new Paragraph({
            children: [
              new TextRun({
                text: "Note: Điểm thưởng là điểm lớn nhất trong hai tiêu chí trên / ",
                italics: true,
                size: 24,
              }),
              new TextRun({
                text: "Bonus mark is the highest one.",
                italics: true,
                size: 24,
              }),
            ],
            indent: { left: 360 },
            spacing: { after: 200 },
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

  return await Packer.toBlob(doc);
}
