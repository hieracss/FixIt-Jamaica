
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  UserRound,
  CircleHelp,
  LogOut,
  Wrench,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../pages/Dashboard.css";

function StudentSidebar() {
  const { logout } = useAuth();

  const navigation = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "My reports", icon: ClipboardList, path: "/reports" },
    { label: "Submit report", icon: PlusCircle, path: "/reports/new" },
    { label: "Profile", icon: UserRound, path: "/profile" },
  ];

  return (
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
  );
}

export default StudentSidebar;
