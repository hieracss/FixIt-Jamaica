
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  UserRound,
  CircleHelp,
  LogOut,
  Wrench,
  ArrowRight,
  Clock,
  Activity,
  CheckCircle2,
} from "lucide-react";

import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { getStudentDashboard } from "../services/api";
import "./Dashboard.css";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.full_name?.split(" ")[0] || "Student";

  // Dashboard data and loading states
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Retrieve dashboard information from the backend
  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("fixit_token");
        const data = await getStudentDashboard(token);
        setDashboardData(data);
      } catch (err) {
        setError(err.message || "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // Sidebar navigation
  const navigation = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "My reports", icon: ClipboardList, path: "/reports" },
    { label: "Submit report", icon: PlusCircle, path: "/reports/new" },
    { label: "Profile", icon: UserRound, path: "/profile" },
  ];

  // Report statistics
  const statistics = dashboardData?.statistics || {};

  const stats = [
    {
      label: "Total reports",
      value: loading ? "--" : (statistics.total ?? 0),
      description: "All submitted reports",
      icon: ClipboardList,
    },
    {
      label: "Pending / Under review",
      value: loading ? "--" : (statistics.pending ?? 0),
      description: "Awaiting review",
      icon: Clock,
    },
    {
      label: "In progress",
      value: loading ? "--" : (statistics.in_progress ?? 0),
      description: "Maintenance underway",
      icon: Activity,
    },
    {
      label: "Resolved",
      value: loading ? "--" : (statistics.resolved ?? 0),
      description: "Repairs completed",
      icon: CheckCircle2,
    },
  ];

  const recentReports = dashboardData?.recentReports || [];
  const latestUpdate = dashboardData?.latestUpdate;

  return (
    <main className="dashboard-page">

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">
            <Wrench size={21} />
          </div>

          <div>
            <h2>FixIt Jamaica</h2>
            <span>DORMITORY MAINTENANCE</span>
          </div>
        </div>

        <p className="sidebar-label">STUDENT PORTAL</p>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <NavLink to="/help" className="sidebar-link">
            <CircleHelp size={19} />
            Help & support
          </NavLink>

          <button
            className="sidebar-link"
            onClick={logout}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <LogOut size={19} />
            Sign out
          </button>

          <div style={{ marginTop: 25, paddingLeft: 10 }}>
            <p style={{ fontSize: 12, margin: 0 }}>
              The Mico University College
            </p>
            <p style={{ fontSize: 10, color: "#91a6c2" }}>
              Proposed campus system
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section className="dashboard-main">

        <header className="dashboard-topbar">
          <div className="dashboard-date">
            STUDENT RESIDENCE SERVICES
          </div>

          <div className="dashboard-user">
            <div>
              <p>{user?.full_name}</p>
              <span>Student · {user?.student_id}</span>
            </div>

            <div className="dashboard-avatar">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* WELCOME */}
        <section className="dashboard-welcome">
          <div>
            <h1>Good morning, {firstName}</h1>
            <p>
              Here's what's happening with your maintenance reports.
            </p>
          </div>

          <button
            className="primary-action"
            onClick={() => navigate("/reports/new")}
          >
            <PlusCircle size={16} style={{ marginRight: 7 }} />
            Submit maintenance report
          </button>
        </section>

        {/* STATISTICS */}
        <section className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article className="stat-card" key={stat.label}>
                <p>
                  <Icon size={15} style={{ marginRight: 6 }} />
                  {stat.label}
                </p>

                <h2>{stat.value}</h2>
                <span>{stat.description}</span>
              </article>
            );
          })}
        </section>

        {/* RECENT REPORTS */}
        <section className="dashboard-panel">

          <div className="dashboard-panel-header">
            <h2>Recent submissions</h2>

            <Link to="/reports">
              View all reports <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="empty-reports">
              <p>Loading your reports...</p>
            </div>
          ) : error ? (
            <div className="empty-reports">
              <h3>Unable to load reports</h3>
              <p>{error}</p>
            </div>
          ) : recentReports.length > 0 ? (
            <div className="dashboard-recent-list">
              {recentReports.map((report) => (
                <Link
                  to={`/reports/${report.id}`}
                  className="dashboard-report-row"
                  key={report.id}
                >
                  <div>
                    <span className="dashboard-report-reference">
                      {report.reference}
                    </span>

                    <h3>{report.title}</h3>
                    <p>{report.category}</p>
                  </div>

                  <span className={`manage-status ${report.status}`}>
                    {report.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-reports">
              <ClipboardList size={38} color="#9aabc0" />
              <h3>No maintenance reports yet</h3>
              <p>
                When you submit a maintenance request, it will appear here.
              </p>
            </div>
          )}

        </section>

        {/* LATEST MAINTENANCE UPDATE */}
        <section className="dashboard-panel">

          <div className="dashboard-panel-header">
            <h2>Latest maintenance update</h2>
          </div>

          {loading ? (
            <div className="empty-reports">
              <p>Loading latest update...</p>
            </div>
          ) : error ? (
            <div className="empty-reports">
              <p>Unable to load the latest update.</p>
            </div>
          ) : latestUpdate ? (
            <div className="dashboard-latest-update">
              <span className="dashboard-report-reference">
                {latestUpdate.reference}
              </span>

              <h3>{latestUpdate.title}</h3>
              <p>{latestUpdate.note}</p>

              <span>
                Updated by {latestUpdate.author_name}
              </span>

              <Link to={`/reports/${latestUpdate.report_id}`}>
                View report <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="empty-reports">
              <Activity size={30} color="#9aabc0" />
              <h3>No updates available</h3>
              <p>
                Updates from the maintenance team will appear here.
              </p>
            </div>
          )}

        </section>

        {/* FOOTER */}
        <footer className="dashboard-footer">
          FixIt Jamaica · Proposed system for The Mico University College
          · All times Jamaica (EST)
        </footer>

      </section>
    </main>
  );
}

export default Dashboard;
