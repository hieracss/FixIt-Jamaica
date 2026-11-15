import AdminSidebar from "../components/AdminSidebar";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  SlidersHorizontal,
} from "lucide-react";
import { getAdminReports } from "../services/api";
import "./ManageReports.css";

function ManageReports() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    async function loadReports() {
      try {
        const token = localStorage.getItem("fixit_token");
        const data = await getAdminReports(token);
        setReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const searchTerm = search.toLowerCase();

      const matchesSearch =
        report.reference?.toLowerCase().includes(searchTerm) ||
        report.title?.toLowerCase().includes(searchTerm) ||
        report.student_name?.toLowerCase().includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      const matchesUrgency =
        urgencyFilter === "all" || report.urgency === urgencyFilter;

      const matchesCategory =
        categoryFilter === "all" || report.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesUrgency &&
        matchesCategory
      );
    });
  }, [reports, search, statusFilter, urgencyFilter, categoryFilter]);

  const categories = [...new Set(reports.map((report) => report.category))];
  const activeReports = filteredReports.filter(
  (report) => report.status !== "resolved"
);

const resolvedReports = filteredReports.filter(
  (report) => report.status === "resolved"
);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-breadcrumb">
              Workspace / Manage Reports
            </span>
            <h1>Manage Reports</h1>
          </div>

          <div className="admin-header-tag">
            <span></span>
            Administration Portal
          </div>
        </header>

        <section className="manage-welcome">
          <h2>Maintenance Reports</h2>
          <p>
            Review, prioritize and manage maintenance requests submitted
            by students.
          </p>
        </section>

        <section className="manage-summary">
          <div>
            <strong>{reports.length}</strong>
            <span>Total Reports</span>
          </div>
          <div>
            <strong>
              {reports.filter((r) => r.status === "pending").length}
            </strong>
            <span>Pending</span>
          </div>
          <div>
            <strong>
              {reports.filter((r) => r.status === "in_progress").length}
            </strong>
            <span>In Progress</span>
          </div>
          <div>
            <strong>
              {reports.filter((r) => r.status === "resolved").length}
            </strong>
            <span>Resolved</span>
          </div>
        </section>

        
<section className="manage-reports-card">

  {/* FILTERS */}
  <div className="manage-card-heading">
    <div>
      <h2>Maintenance Reports</h2>
      <p>
        {filteredReports.length} of {reports.length} reports displayed
      </p>
    </div>
  </div>

  <div className="manage-filters">
    <div className="manage-search">
      <Search size={18} />
      <input
        type="text"
        placeholder="Search reference, title or student..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    <div className="manage-select">
      <SlidersHorizontal size={16} />
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="under_review">Under Review</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
      </select>
    </div>

    <div className="manage-select">
      <select
        value={urgencyFilter}
        onChange={(e) => setUrgencyFilter(e.target.value)}
      >
        <option value="all">All urgency levels</option>
        <option value="high">High urgency</option>
        <option value="medium">Medium urgency</option>
        <option value="low">Low urgency</option>
      </select>
    </div>

    <div className="manage-select">
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
      >
        <option value="all">All categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  </div>

  {loading ? (
    <div className="manage-message">
      <RefreshCw size={20} />
      Loading maintenance reports...
    </div>
  ) : error ? (
    <div className="manage-error">
      <AlertCircle size={20} />
      {error}
    </div>
  ) : (
    <>
      {/* ACTIVE REPORTS */}
      <div className="manage-report-group">
        <div className="manage-group-heading">
          <div>
            <h3>Active Reports</h3>
            <p>Requests requiring administrative attention</p>
          </div>
          <span className="manage-group-count">
            {activeReports.length}
          </span>
        </div>

        {activeReports.length > 0 ? (
          <div className="manage-table-wrapper">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>REFERENCE</th>
                  <th>REPORT TITLE</th>
                  <th>STUDENT</th>
                  <th>LOCATION</th>
                  <th>CATEGORY</th>
                  <th>URGENCY</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {activeReports.map((report) => (
                  <tr key={report.id}>
                    <td className="manage-reference">
                      {report.reference}
                    </td>
                    <td>{report.title}</td>
                    <td>{report.student_name}</td>
                    <td>
                      {report.dormitory}
                      {report.room_number
                        ? `, Room ${report.room_number}`
                        : ""}
                    </td>
                    <td>{report.category}</td>
                    <td>
                      <span className={`manage-urgency ${report.urgency}`}>
                        {report.urgency}
                      </span>
                    </td>
                    <td>
                      <span className={`manage-status ${report.status}`}>
                        {report.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <button
                        className="manage-view-button"
                        onClick={() =>
                          navigate(`/admin/reports/${report.id}`)
                        }
                        title="View report"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="manage-empty">
            No active reports match your filters.
          </div>
        )}
      </div>

      {/* RESOLVED REPORTS */}
      <div className="manage-report-group manage-resolved-group">
        <div className="manage-group-heading">
          <div>
            <h3>Resolved Reports</h3>
            <p>Completed maintenance requests</p>
          </div>
          <span className="manage-group-count resolved">
            {resolvedReports.length}
          </span>
        </div>

        {resolvedReports.length > 0 ? (
          <div className="manage-table-wrapper">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>REFERENCE</th>
                  <th>REPORT TITLE</th>
                  <th>STUDENT</th>
                  <th>LOCATION</th>
                  <th>CATEGORY</th>
                  <th>URGENCY</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {resolvedReports.map((report) => (
                  <tr key={report.id}>
                    <td className="manage-reference">
                      {report.reference}
                    </td>
                    <td>{report.title}</td>
                    <td>{report.student_name}</td>
                    <td>
                      {report.dormitory}
                      {report.room_number
                        ? `, Room ${report.room_number}`
                        : ""}
                    </td>
                    <td>{report.category}</td>
                    <td>
                      <span className={`manage-urgency ${report.urgency}`}>
                        {report.urgency}
                      </span>
                    </td>
                    <td>
                      <span className={`manage-status ${report.status}`}>
                        {report.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <button
                        className="manage-view-button"
                        onClick={() =>
                          navigate(`/admin/reports/${report.id}`)
                        }
                        title="View report"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="manage-empty">
            No resolved reports match your filters.
          </div>
        )}
      </div>
    </>
  )}
</section>

      </main>
    </div>
  );
}

export default ManageReports;
