"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface MeetingMinutesFormProps {
  sessionData?: any; // Replace with proper type later
}

export default function MeetingMinutesForm({
  sessionData,
}: MeetingMinutesFormProps) {
  // Mock data for initial state - in real app this would come from props/API
  const [formData, setFormData] = useState({
    semester: "Summer",
    year: "2025",
    councilId: "SE 302",
    chairperson: "Nguyễn Thị Cẩm Hương",
    secretary: "Trần Ngọc Như Quỳnh",
    members: ["Nguyễn Thế Hoàng", "Đỗ Tấn Nhàn", "Thân Thị Ngọc Vân"],
    time: "15 giờ 22 phút, ngày 05 tháng 10 năm 2025",
    timeEn: "15h22', 05/10/2025",
    venue: "P.408, Campus Khu CNC, phân hiệu trường Đại học FPT tại Tp.HCM",
    thesisName: "Pregnancy Care Companion",
    thesisCode: "SU25SE107",
    startTime: "15h22'",
    endTime: "16h55'",
    studentGroup: [
      { id: "SE150712", name: "Đỗ Hữu Đức" },
      { id: "SE170605", name: "Phạm Hoàng Khiêm" },
      { id: "SE171276", name: "Trương Nguyễn Thắng Lợi" },
      { id: "SE171333", name: "Lê Minh Nguyên" },
    ],
    presentationSummary: [
      {
        student: "Nguyên",
        content: "- Giới thiệu nhóm và đề tài\n- Actor & features",
      },
      {
        student: "",
        content:
          "- Kiến trúc hệ thống\n- Giới thiệu và demo các chức năng:\n  1. Thai phụ tạo tài khoản trên hệ thống\n  2. Thai phụ nhập thông tin hành trình mang thai...",
      },
      {
        student: "Khiêm",
        content:
          "- Hệ thống đề xuất chế độ dinh dưỡng, các món ăn trong ngày phù hợp với thông tin sức khỏe...",
      },
    ],
    qa: [
      {
        questioner: "Cô Vân",
        question:
          "1. Chức năng đặt lịch khám định kỳ: tư vấn viên có thể xem lại nội dung tư vấn...?",
        respondent: "Nhóm",
        answer: "1. Hệ thống không có.",
      },
      {
        questioner: "",
        question: "2. Hệ thống có phần Dashboard thống kê không?",
        respondent: "",
        answer:
          "2. Nhóm mở trang Dashboard\n=> Nhóm nhận góp ý của hội đồng.\n=> Dữ liệu thống kê về Subscription toàn là 0.",
      },
    ],
    assessments: {
      layout: "",
      theory: "",
      content: "",
      research: "",
    },
    grading: {
      comment: "Hội đồng đánh giá và quyết định: nhóm vừa đủ điều kiện đạt.",
      result: "ĐẠT" as "ĐẠT" | "KHÔNG ĐẠT",
      feedback: "Nhóm đồng thuận với quyết định của hội đồng.",
    },
    officialGrades: [
      {
        id: "SE150712",
        name: "Đỗ Hữu Đức",
        grade: "",
        conclusion: "Passed without corrections",
      },
      // ... others
    ],
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="bg-white p-8 md:p-12 shadow-lg rounded-xl border border-gray-200 max-w-5xl mx-auto text-gray-900"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      {/* Header */}
      <div className="text-center mb-10 border-b-2 border-gray-100 pb-6">
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

      {/* Footer Actions */}
      <div className="flex justify-end gap-4 mt-12 pt-6 border-t border-gray-200">
        <button className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
          Export Word
        </button>
        <button className="px-6 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all transform hover:-translate-y-0.5">
          Save Minutes
        </button>
      </div>
    </div>
  );
}
