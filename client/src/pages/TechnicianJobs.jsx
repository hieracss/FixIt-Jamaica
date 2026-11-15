
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTechnicianDashboard } from "../services/api";
import "./TechnicianJobs.css";

function TechnicianJobs() {
  const { user, logout } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    async function loadAssignments() {
      try {
        const token = localStorage.getItem("fixit_token");
        const data = await getTechnicianDashboard(token);
        setReports(data.reports || []);
      } catch (err) {
        setError(err.message || "Unable to load assignments.");
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, []);

  const filteredReports = reports.filter((report) => {
    const matchesStatus =
      statusFilter === "all" || report.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" || report.urgency === priorityFilter;

    return matchesStatus && matchesPriority;
  });

  return (
    <div className="technician-layout">
      <aside className="technician-sidebar">
        <div className="technician-brand">
          <div className="technician-brand-icon">
            <Wrench size={22} />
          </div>
          <div>
            <h2>FixIt Jamaica</h2>
            <span>TECHNICIAN PORTAL</span>
          </div>
        </div>

        <p className="technician-nav-label">WORKSPACE</p>

        <nav className="technician-navigation">
          <Link to="/technician" className="technician-nav-item">
            <LayoutDashboard size={19} />
            Dashboard
          </Link>

          <Link to="/technician/jobs" className="technician-nav-item active">
            <ClipboardList size={19} />
            My Assignments
          </Link>
        </nav>

        <div className="technician-sidebar-bottom">
          <div className="technician-profile">
            <div className="technician-avatar">
              {user?.full_name?.charAt(0) || "T"}
            </div>
            <div>
              <strong>{user?.full_name || "Technician"}</strong>
              <span>Maintenance Technician</span>
            </div>
          </div>

          <button className="technician-logout" onClick={logout}>
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="technician-main">
        <header className="technician-header">
          <div>
            <span className="technician-breadcrumb">
              Workspace / My Assignments
            </span>
            <h1>My Assignments</h1>
            <p>Manage and track your assigned maintenance jobs.</p>
          </div>
        </header>

        <section className="technician-jobs-section">
          <div className="technician-section-heading">
            <div>
              <h2>Assigned Maintenance Reports</h2>
              <p>
                {reports.length} job(s) assigned to you.
              </p>
            </div>
          </div>

          <div className="technician-job-filters">
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

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {error && (
            <div className="technician-error">{error}</div>
          )}

          {loading ? (
            <div className="technician-empty-state">
              Loading assignments...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="technician-empty-state">
              <ClipboardList size={38} />
              <h2>No matching assignments</h2>
              <p>
                Try changing your filters or check back when
                new jobs have been assigned.
              </p>
            </div>
          ) : (
            <div className="technician-job-list">
{filteredReports.map((report) => (
  <Link
    to={`/technician/jobs/${report.id}`}
    className="technician-job-card"
    key={report.id}
  >
    <div className="technician-job-main">
      <span className="technician-job-reference">
        {report.reference}
      </span>

      <h3>{report.title}</h3>

      <p>
        {report.category} · {report.dormitory}
        {report.room_number
          ? ` · Room ${report.room_number}`
          : ""}
      </p>

      <span className="technician-job-student">
        Reported by {report.student_name}
      </span>
    </div>

    <div className="technician-job-meta">
      <span className={`technician-job-urgency ${report.urgency}`}>
        {report.urgency} priority
      </span>

      <span className={`technician-job-status ${report.status}`}>
        {report.status.replace("_", " ")}
      </span>
    </div>
  </Link>
))}

            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default TechnicianJobs;
