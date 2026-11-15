
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  LogOut,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../pages/AdminDashboard.css";

function AdminSidebar() {
  const { user, logout } = useAuth();

  const adminName = user?.full_name || "Administrator";
  const firstName = adminName.split(" ")[0];

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-icon">F</div>

        <div>
          <h2>FixIt Jamaica</h2>
          <span>ADMINISTRATION</span>
        </div>
      </div>

      <p className="admin-nav-label">WORKSPACE</p>

      <nav className="admin-navigation">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `admin-nav-item ${isActive ? "active" : ""}`
          }
        >
          <LayoutDashboard size={19} />
          Dashboard
        </NavLink>

        <NavLink
          to="/admin/reports"
          className={({ isActive }) =>
            `admin-nav-item ${isActive ? "active" : ""}`
          }
        >
          <ClipboardList size={19} />
          Manage Reports
        </NavLink>

        <NavLink
          to="/admin/users"
          className={({ isActive }) =>
            `admin-nav-item ${isActive ? "active" : ""}`
          }
        >
          <Users size={19} />
          Manage Users
        </NavLink>
      </nav>

      <div className="admin-sidebar-bottom">
        <div className="admin-profile">
          <div className="admin-avatar">
            {firstName.charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{adminName}</strong>
            <span>System Admin</span>
          </div>
        </div>

        <button
          className="admin-logout-button"
          onClick={logout}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
