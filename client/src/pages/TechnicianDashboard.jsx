
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Wrench,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTechnicianDashboard } from "../services/api";
import "./TechnicianDashboard.css";

function TechnicianDashboard() {
  const { user, logout } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("fixit_token");
        const data = await getTechnicianDashboard(token);
        setDashboard(data);
      } catch (err) {
        setError(err.message || "Unable to load your dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const statistics = dashboard?.statistics || {};
  const reports = dashboard?.reports || [];

  function formatStatus(status) {
    return status.replace("_", " ");
  }

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
          <Link to="/technician" className="technician-nav-item active">
            <LayoutDashboard size={19} />
            Dashboard
          </Link>

          <Link to="/technician/jobs" className="technician-nav-item">
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
              Workspace / Dashboard
            </span>

            <h1>Technician Dashboard</h1>

            <p>
              Welcome back, {user?.full_name || "Technician"}.
              Here's your maintenance workspace.
            </p>
          </div>
        </header>

        <section className="technician-welcome-card">
          <div>
            <span>MAINTENANCE WORKSPACE</span>
            <h2>Ready to get things fixed?</h2>
            <p>
              Review your assigned maintenance reports,
              track ongoing work and keep students informed.
            </p>

            <Link to="/technician/jobs">
              View My Assignments
              <ClipboardList size={17} />
            </Link>
          </div>

          <Wrench size={65} />
        </section>

        {error && (
          <div className="technician-error">
            {error}
          </div>
        )}

        <section className="technician-stats">
          <div className="technician-stat-card">
            <div className="technician-stat-icon blue">
              <ClipboardList size={21} />
            </div>
            <span>Assigned Jobs</span>
            <strong>
              {loading ? "--" : statistics.total ?? 0}
            </strong>
          </div>

          <div className="technician-stat-card">
            <div className="technician-stat-icon orange">
              <Clock size={21} />
            </div>
            <span>In Progress</span>
            <strong>
              {loading ? "--" : statistics.in_progress ?? 0}
            </strong>
          </div>

          <div className="technician-stat-card">
            <div className="technician-stat-icon green">
              <CheckCircle size={21} />
            </div>
            <span>Completed</span>
            <strong>
              {loading ? "--" : statistics.resolved ?? 0}
            </strong>
          </div>

          <div className="technician-stat-card">
            <div className="technician-stat-icon red">
              <AlertCircle size={21} />
            </div>
            <span>High Priority</span>
            <strong>
              {loading ? "--" : statistics.high_priority ?? 0}
            </strong>
          </div>
        </section>

        <section className="technician-jobs-section">
          <div className="technician-section-heading">
            <div>
              <h2>Recent Assignments</h2>
              <p>Maintenance reports assigned to you.</p>
            </div>

            <Link to="/technician/jobs">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="technician-empty-state">
              <p>Loading your assignments...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="technician-empty-state">
              <ClipboardList size={38} />
              <h2>No assigned jobs yet</h2>
              <p>
                Once an administrator assigns a maintenance
                report to you, it will appear here.
              </p>
            </div>
          ) : (
            <div className="technician-job-list">
              {reports.slice(0, 5).map((report) => (
                <Link
  to={`/technician/jobs/${report.id}`}
  className="technician-job-card"
  key={report.id}
  style={{ textDecoration: "none", color: "inherit" }}
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
                      {formatStatus(report.status)}
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

export default TechnicianDashboard;
