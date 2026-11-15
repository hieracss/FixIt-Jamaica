import StudentSidebar from "../components/StudentSidebar";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ClipboardList,
  PlusCircle,
  ArrowLeft,
  Eye,
  LoaderCircle,
} from "lucide-react";

import { getMyReports } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./MyReports.css";

function MyReports() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        const token = localStorage.getItem("fixit_token");
        const result = await getMyReports(token);
        setReports(result.data);
      } catch (err) {
        setError(err.message || "Unable to load reports.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        report.reference.toLowerCase().includes(search.toLowerCase()) ||
        report.title.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  function formatDate(date) {
    return new Date(date.replace(" ", "T") + "Z").toLocaleDateString(
      "en-JM",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatStatus(status) {
    const labels = {
      pending: "Pending",
      under_review: "Under Review",
      in_progress: "In Progress",
      resolved: "Resolved",
    };

    return labels[status] || status;
  }

  function formatUrgency(urgency) {
    return urgency.charAt(0).toUpperCase() + urgency.slice(1);
  }

  if (loading) {
    return (
      <div className="reports-loading">
        <LoaderCircle className="reports-spinner" size={25} />
        Loading your reports...
      </div>
    );
  }

  return (
  <main className="dashboard-page">
    <StudentSidebar />

    <section className="dashboard-main my-reports-main">
      <div className="my-reports-page">


      <header className="my-reports-header">
        <button
          className="reports-back"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={17} />
          Dashboard
        </button>

        <span>FixIt Jamaica</span>
      </header>

      <section className="my-reports-heading">
        <div>
          <span className="reports-eyebrow">STUDENT PORTAL</span>
          <h1>My maintenance reports</h1>
          <p>
            View and track the maintenance issues you've submitted.
          </p>
        </div>

        <button
          className="reports-new-button"
          onClick={() => navigate("/reports/new")}
        >
          <PlusCircle size={17} />
          New report
        </button>
      </section>

      <section className="reports-summary">
        <div>
          <span>Total reports</span>
          <strong>{reports.length}</strong>
        </div>

        <div>
          <span>Pending</span>
          <strong>
            {reports.filter((r) => r.status === "pending" || r.status === "under_review").length}
          </strong>
        </div>

        <div>
          <span>In progress</span>
          <strong>
            {reports.filter((r) => r.status === "in_progress").length}
          </strong>
        </div>

        <div>
          <span>Resolved</span>
          <strong>
            {reports.filter((r) => r.status === "resolved").length}
          </strong>
        </div>
      </section>

      <section className="reports-panel">

        <div className="reports-panel-heading">
          <div>
            <h2>Submitted reports</h2>
            <p>{filteredReports.length} reports found</p>
          </div>
        </div>

        <div className="reports-controls">

          <div className="reports-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search by reference or issue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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

        
{error && (
  <div className="reports-error">{error}</div>
)}

{!error && (
  <>
    {/* ACTIVE REPORTS */}
    <div className="reports-section">
      <div className="reports-section-heading">
        <div>
          <h3>Active reports</h3>
          <p>
            Maintenance requests currently being handled.
          </p>
        </div>

        <span className="reports-count">
          {filteredReports.filter(
            (report) => report.status !== "resolved"
          ).length}
        </span>
      </div>

      {filteredReports.filter(
        (report) => report.status !== "resolved"
      ).length === 0 ? (
        <div className="reports-empty reports-section-empty">
          <ClipboardList size={32} />
          <h3>No active reports</h3>
          <p>
            You don't have any active maintenance requests matching your filters.
          </p>
        </div>
      ) : (
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Issue</th>
                <th>Location</th>
                <th>Submitted</th>
                <th>Urgency</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports
                .filter((report) => report.status !== "resolved")
                .map((report) => (
                  <tr key={report.id}>
                    <td className="report-reference">
                      {report.reference}
                    </td>

                    <td>
                      <strong>{report.title}</strong>
                      <small>{report.category}</small>
                    </td>

                    <td>
                      {report.dormitory}
                      <small>{report.room_number}</small>
                    </td>

                    <td>{formatDate(report.submitted_at)}</td>

                    <td>
                      <span className={`urgency-badge ${report.urgency}`}>
                        {formatUrgency(report.urgency)}
                      </span>
                    </td>

                    <td>
                      <span className={`status-badge ${report.status}`}>
                        {formatStatus(report.status)}
                      </span>
                    </td>

                    <td>
                      <button
                        className="view-report-button"
                        onClick={() => navigate(`/reports/${report.id}`)}
                        aria-label={`View ${report.reference}`}
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* RESOLVED REPORTS */}
    <div className="reports-section resolved-reports-section">
      <div className="reports-section-heading">
        <div>
          <h3>Resolved reports</h3>
          <p>
            Maintenance requests that have been completed.
          </p>
        </div>

        <span className="reports-count resolved-count">
          {filteredReports.filter(
            (report) => report.status === "resolved"
          ).length}
        </span>
      </div>

      {filteredReports.filter(
        (report) => report.status === "resolved"
      ).length === 0 ? (
        <div className="reports-empty reports-section-empty">
          <ClipboardList size={32} />
          <h3>No resolved reports</h3>
          <p>
            Completed maintenance requests will appear here.
          </p>
        </div>
      ) : (
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Issue</th>
                <th>Location</th>
                <th>Submitted</th>
                <th>Urgency</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports
                .filter((report) => report.status === "resolved")
                .map((report) => (
                  <tr key={report.id}>
                    <td className="report-reference">
                      {report.reference}
                    </td>

                    <td>
                      <strong>{report.title}</strong>
                      <small>{report.category}</small>
                    </td>

                    <td>
                      {report.dormitory}
                      <small>{report.room_number}</small>
                    </td>

                    <td>{formatDate(report.submitted_at)}</td>

                    <td>
                      <span className={`urgency-badge ${report.urgency}`}>
                        {formatUrgency(report.urgency)}
                      </span>
                    </td>

                    <td>
                      <span className={`status-badge ${report.status}`}>
                        {formatStatus(report.status)}
                      </span>
                    </td>

                    <td>
                      <button
                        className="view-report-button"
                        onClick={() => navigate(`/reports/${report.id}`)}
                        aria-label={`View ${report.reference}`}
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </>
)}


      </section>

      <footer className="my-reports-footer">
        FixIt Jamaica · {user?.full_name} · Student portal
      </footer>

          </div>
    </section>
  </main>
  );
}

export default MyReports;
