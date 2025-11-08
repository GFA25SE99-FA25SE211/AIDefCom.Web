"use client";

export default function ChairReportStatus() {
  const reports = [
    {
      group: "Group 1",
      topic: "Smart Learning Management System",
      file: "report-group1-final.pdf",
      submitted: "10/5/2025",
      reviewed: "10/6/2025",
      status: "Approved",
    },
    {
      group: "Group 2",
      topic: "Intelligent Ride-hailing Application",
      file: "report-group2.pdf",
      submitted: "10/6/2025",
      reviewed: "-",
      status: "Pending",
    },
    {
      group: "Group 3",
      topic: "E-commerce Website",
      file: "report-group3.pdf",
      submitted: "10/4/2025",
      reviewed: "10/5/2025",
      status: "Rejected",
    },
    {
      group: "Group 4",
      topic: "AI Health Consultation Chatbot",
      file: "report-group4-v2.pdf",
      submitted: "10/7/2025",
      reviewed: "10/8/2025",
      status: "Approved",
    },
    {
      group: "Group 5",
      topic: "Face Recognition System",
      file: "report-group5.pdf",
      submitted: "10/7/2025",
      reviewed: "-",
      status: "Pending",
    },
  ];

  const statusClass = (status: string) => {
    switch (status) {
      case "Approved":
        return "badge badge-success";
      case "Rejected":
        return "badge badge-error";
      case "Pending":
      default:
        return "badge badge-warning";
    }
  };

  return (
    <>
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Report Review Status
          </h1>
          <p className="text-sm text-gray-500">
            View and manage submitted reports from secretary
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-8 dashboard-grid md:grid-cols-4">
        <div className="stat-card stat-card-purple">
          <div className="stat-info">
            <p className="label">Total Reports</p>
            <p className="value">5</p>
          </div>
          <div className="stat-icon">📄</div>
        </div>

        <div className="stat-card stat-card-green">
          <div className="stat-info">
            <p className="label">Approved</p>
            <p className="value">2</p>
          </div>
          <div className="stat-icon">✔</div>
        </div>

        <div className="stat-card stat-card-orange">
          <div className="stat-info">
            <p className="label">Rejected</p>
            <p className="value">1</p>
          </div>
          <div className="stat-icon">✖</div>
        </div>

        <div className="stat-card stat-card-blue">
          <div className="stat-info">
            <p className="label">Pending</p>
            <p className="value">2</p>
          </div>
          <div className="stat-icon">⏱</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="mt-8 card-base">
        {/* Filter Buttons */}
        <div className="flex gap-3 text-sm mb-4">
          <button className="btn-secondary">All (5)</button>
          <button className="btn-outline">Approved (2)</button>
          <button className="btn-outline">Rejected (1)</button>
          <button className="btn-outline">Pending (2)</button>
        </div>

        {/* Table */}
        <table className="table-base mt-4">
          <thead>
            <tr>
              <th>Group</th>
              <th>Topic</th>
              <th>File Name</th>
              <th>Submitted</th>
              <th>Reviewed</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i}>
                <td>{r.group}</td>
                <td>{r.topic}</td>
                <td className="text-blue-600 underline cursor-pointer hover:text-blue-700 transition">
                  {r.file}
                </td>
                <td>{r.submitted}</td>
                <td>{r.reviewed}</td>
                <td>
                  <span className={statusClass(r.status)}>{r.status}</span>
                </td>
                <td>
                  {/* Nút Download đồng bộ hệ thống */}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                    bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-sm hover:opacity-90
                    transition-all"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                      />
                    </svg>
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <p className="text-xs text-center text-gray-400 mt-10">
        © 2025 AIDefCom · Smart Graduation Defense
      </p>
    </>
  );
}
