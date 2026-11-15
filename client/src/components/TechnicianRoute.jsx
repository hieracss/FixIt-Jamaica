
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function TechnicianRoute() {
  const { user } = useAuth();

  // Redirect users who are not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Only technicians can access this portal
  if (user.role !== "technician") {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default TechnicianRoute;
