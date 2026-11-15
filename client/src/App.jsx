import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import SubmitReport from "./pages/SubmitReport";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/AdminDashboard";
import AdminReportDetails from "./pages/AdminReportDetails";
import TechnicianJobDetails from "./pages/TechnicianJobDetails";
import MyReports from "./pages/MyReports";
import ManageReports from "./pages/ManageReports";
import ManageUsers from "./pages/ManageUsers";
import ReportDetails from "./pages/ReportDetails";
import TechnicianRoute from "./components/TechnicianRoute";
import TechnicianJobs from "./pages/TechnicianJobs";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import ReportConfirmation from "./pages/ReportConfirmation";
import { useState } from "react";
import { loginStudent } from "./services/api";
import {
  ClipboardList,
  Activity,
  MessageSquareText,
  Eye,
  EyeOff,
  Wrench,
  ArrowRight,
} from "lucide-react";
import "./App.css";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event) {
  event.preventDefault();
  setMessage("");

  if (!studentId.trim() || !password.trim()) {
    setMessage("Please enter your user ID/email and password.");
    return;
  }

  try {
    setIsLoading(true);

    const response = await loginStudent({
      identifier: studentId.trim(),
      password,
    });

    // Administrator login
if (response.user.role === "admin") {
  login(response.user, response.token);
  navigate("/admin");
  return;
}

// Technician login
if (response.user.role === "technician") {
  login(response.user, response.token);
  navigate("/technician");
  return;
}

// Reject unsupported account roles
if (response.user.role !== "student") {
  setMessage("Your account role is not supported yet.");
  return;
}
    // Save the authentication session for subsequent API requests
    login(response.user, response.token); 
  navigate("/dashboard");
  } catch (error) {
    setMessage(error.message || "Unable to log in. Please try again.");
  } finally {
    setIsLoading(false);
  }
}

  return (
    <main className="login-page">
      <section className="welcome-panel">
        <div className="brand">
          <div className="brand-icon">
            <Wrench size={22} />
          </div>

          <div>
            <h2>FixIt Jamaica</h2>
            <span>DORMITORY MAINTENANCE</span>
          </div>
        </div>

        <div className="welcome-content">
          <span className="institution-label">
            THE MICO UNIVERSITY COLLEGE
          </span>

          <h1>
            A better way to care
            <br />
            for your dorm.
          </h1>

          <p className="welcome-description">
            Report a maintenance issue, follow its progress
            and stay informed — all in one place.
          </p>

          <div className="accent-line"></div>

          <div className="features">
            <div className="feature">
              <ClipboardList size={21} />
              <div>
                <h3>Report with confidence</h3>
                <p>Share the location, details and a photo.</p>
              </div>
            </div>

            <div className="feature">
              <Activity size={21} />
              <div>
                <h3>Track every step</h3>
                <p>See when your report is reviewed and repaired.</p>
              </div>
            </div>

            <div className="feature">
              <MessageSquareText size={21} />
              <div>
                <h3>Stay up to date</h3>
                <p>Read updates from the maintenance team.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="welcome-footer">
          <p>University project concept</p>
          <p>Proposed service · Not an official deployed platform</p>
        </div>
      </section>

      <section className="login-area">
        <div className="login-card">
         <div className="portal-label">UNIVERSITY MAINTENANCE PORTAL</div>

          <h2>Welcome back</h2>
          <p className="login-subtitle">
            Sign in to access your FixIt Jamaica workspace.
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="studentId">Email address or User ID</label>

              <input
                id="studentId"
                type="text"
                placeholder="Enter your email or user ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="forgot-password">
              <button
                type="button"
                onClick={() =>
                  setMessage("Please contact your residence office for account assistance.")
                }
              >
                Forgot password?
              </button>
            </div>

            {message && (
              <div className="form-message" role="status">
                {message}
              </div>
            )}

            <button
  type="submit"
  className="login-button"
  disabled={isLoading}
>
  {isLoading ? "Signing in..." : "Login"}
  {!isLoading && <ArrowRight size={17} />}
</button>
          </form>

          <p className="account-note">
            Access your workspace using your registered account.
          </p>

          <div className="card-divider"></div>

          <div className="help-section">
            <h3>Need help signing in?</h3>
            <p>
              Contact your residence office for account assistance.
            </p>
          </div>
        </div>

        <div className="login-disclaimer">
          <p>FixIt Jamaica · Demonstration environment</p>
          <p>The Mico University College, Kingston, Jamaica</p>
        </div>
      </section>
    </main>
  );
}

import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<Dashboard />} />
       <Route path="/reports/new" element={<SubmitReport />} />
       <Route
       path="/reports/confirmation"
         element={<ReportConfirmation />}
         />
       </Route>
       <Route path="/reports" element={<MyReports />} />
       <Route element={<AdminRoute />}>
  <Route
    path="/admin/reports/:id"
    element={<AdminReportDetails />}
  />

  <Route
    path="/admin/reports"
    element={<ManageReports />}
  />

  <Route
    path="/admin/users"
    element={<ManageUsers />}
  />

  <Route
    path="/admin"
    element={<AdminDashboard />}
  />
</Route>
<Route element={<TechnicianRoute />}>
  <Route
    path="/technician"
    element={<TechnicianDashboard />}
  />
  <Route
  path="/technician/jobs/:id"
  element={<TechnicianJobDetails />}
/>
  <Route
    path="/technician/jobs"
    element={<TechnicianJobs />}
  />
</Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/reports/:id" element={<ReportDetails />} />
    </Routes>
  );
}

export default App;
