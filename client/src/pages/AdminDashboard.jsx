import AdminSidebar from "../components/AdminSidebar";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  Wrench,
  CheckCircle,
  Users,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("fixit_token");

        const response = await fetch(
  `${import.meta.env.VITE_API_URL}/admin/dashboard`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load dashboard.");
        }

        setDashboard(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const stats = dashboard
  ? [
      {
        label: "Total Reports",
        value: dashboard.statistics.total,
        icon: ClipboardList,
        color: "blue",
      },
      {
        label: "Pending Reports",
        value: dashboard.statistics.pending,
        icon: Clock,
        color: "orange",
      },
      {
        label: "In Progress",
        value: dashboard.statistics.in_progress,
        icon: Wrench,
        color: "purple",
      },
      {
        label: "Resolved",
        value: dashboard.statistics.resolved,
        icon: CheckCircle,
        color: "green",
      },
    ]
  : [];

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-breadcrumb">Workspace / Dashboard</span>
            <h1>Admin Dashboard</h1>
          </div>

          <div className="admin-header-tag">
            <span></span>
            Administration Portal
          </div>
        </header>

        <section className="admin-welcome">
          <div>
            <p>OVERVIEW</p>
            <h2>Welcome back, Administrator</h2>
            <span>
              Here's what's happening with maintenance reports across the
              residence halls.
            </span>
          </div>
          <div className="admin-welcome-icon">
            <Wrench size={38} />
          </div>
        </section>

        {loading ? (
          <div className="admin-message">
            <RefreshCw className="admin-spinner" size={22} />
            Loading dashboard information...
          </div>
        ) : error ? (
          <div className="admin-error">
            <AlertCircle size={20} />
            {error}
          </div>
        ) : (
          <>
            <section className="admin-stats-grid">
              {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div className="admin-stat-card" key={stat.label}>
                    <div className={`admin-stat-icon ${stat.color}`}>
                      <Icon size={21} />
                    </div>
                    <p>{stat.label}</p>
                    <h2>{stat.value ?? 0}</h2>
                  </div>
                );
              })}
            </section>

            <section className="admin-reports-section">
              <div className="admin-section-heading">
                <div>
                  <h2>Recent Maintenance Reports</h2>
                  <p>Latest reports submitted by students</p>
                </div>

                <Link to="/admin/reports" className="admin-view-all">
                  View all reports <ArrowRight size={16} />
                </Link>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>REFERENCE</th>
                      <th>REPORT</th>
                      <th>STUDENT</th>
                      <th>LOCATION</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>

                 
<tbody>
  {dashboard.recentReports?.length > 0 ? (
    dashboard.recentReports.map((report) => (
      <tr key={report.id}>
        <td className="admin-reference">
          {report.reference}
        </td>
        <td>{report.title}</td>
        <td>{report.student_name}</td>
        <td>{report.dormitory}</td>
        <td>
          <span className={`admin-status ${report.status}`}>
            {report.status?.replace("_", " ")}
          </span>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="5" className="admin-empty">
        No maintenance reports found.
      </td>
    </tr>
  )}
</tbody>

                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
