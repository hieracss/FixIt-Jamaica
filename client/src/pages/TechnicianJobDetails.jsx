
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  ClipboardList,
  Wrench,
  LogOut,
  MapPin,
  User,
  Calendar,
  Image as ImageIcon,
  History,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getTechnicianJobDetails,
  updateTechnicianJobStatus,
} from "../services/api";
import "./TechnicianJobDetails.css";


function TechnicianJobDetails() {
  const { id } = useParams();
  const { user, logout } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("in_progress");
const [maintenanceNote, setMaintenanceNote] = useState("");
const [updating, setUpdating] = useState(false);
const [updateMessage, setUpdateMessage] = useState("");
const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    async function loadReport() {
      try {
        const token = localStorage.getItem("fixit_token");
       const data = await getTechnicianJobDetails(id, token);

setReport(data);

// Select the next valid status automatically
if (data.status === "in_progress") {
  setSelectedStatus("resolved");
} else {
  setSelectedStatus("in_progress");
}
      } catch (err) {
        setError(err.message || "Unable to load this maintenance job.");
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [id]);

  function formatDate(date) {
    if (!date) return "Not available";

    return new Date(date).toLocaleString();
  }
async function handleStatusUpdate(event) {
  event.preventDefault();

  setUpdateMessage("");
  setUpdateError("");

  if (!maintenanceNote.trim()) {
    setUpdateError("Please enter a maintenance note.");
    return;
  }

  try {
    setUpdating(true);

    const token = localStorage.getItem("fixit_token");

    await updateTechnicianJobStatus(
      id,
      selectedStatus,
      maintenanceNote,
      token
    );

    const updatedReport = await getTechnicianJobDetails(id, token);

    setReport(updatedReport);
    setMaintenanceNote("");
    setUpdateMessage("Maintenance report updated successfully.");
  } catch (err) {
    setUpdateError(err.message || "Unable to update maintenance report.");
  } finally {
    setUpdating(false);
  }
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
              Workspace / My Assignments / Job Details
            </span>
            <h1>Maintenance Job Details</h1>
            <p>Review the issue and its maintenance history.</p>
          </div>
        </header>

        <Link to="/technician/jobs" className="technician-back-link">
          <ArrowLeft size={17} />
          Back to My Assignments
        </Link>

        {loading ? (
          <div className="technician-empty-state">
            Loading maintenance report...
          </div>
        ) : error ? (
          <div className="technician-error">{error}</div>
        ) : report ? (
          <div className="technician-details-content">
            <section className="technician-details-card">
              <div className="technician-details-heading">
                <div>
                  <span className="technician-job-reference">
                    {report.reference}
                  </span>
                  <h2>{report.title}</h2>
                </div>

                <span className={`technician-job-status ${report.status}`}>
                  {report.status.replace("_", " ")}
                </span>
              </div>

              <div className="technician-details-badges">
                <span className={`technician-job-urgency ${report.urgency}`}>
                  {report.urgency} priority
                </span>
                <span className="technician-details-category">
                  {report.category}
                </span>
              </div>

              <div className="technician-details-divider" />

              <h3>Issue Description</h3>
              <p className="technician-details-description">
                {report.description}
              </p>

              <div className="technician-details-grid">
                <div>
                  <MapPin size={18} />
                  <div>
                    <span>Location</span>
                    <strong>{report.dormitory}</strong>
                  </div>
                </div>

                <div>
                  <MapPin size={18} />
                  <div>
                    <span>Specific Location</span>
                    <strong>
                      {report.specific_location || "Not specified"}
                    </strong>
                  </div>
                </div>

                <div>
                  <User size={18} />
                  <div>
                    <span>Reported By</span>
                    <strong>{report.student_name}</strong>
                  </div>
                </div>

                <div>
                  <Calendar size={18} />
                  <div>
                    <span>Date Submitted</span>
                    <strong>{formatDate(report.submitted_at)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="technician-details-card">
              <div className="technician-section-heading">
                <div>
                  <h2>Submitted Photos</h2>
                  <p>Images provided by the student.</p>
                </div>
                <ImageIcon size={21} />
              </div>

              {report.photos?.length > 0 ? (
                <div className="technician-photo-grid">
                  {report.photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.file_path}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={photo.file_path}
                        alt={photo.original_name}
                      />
                      <span>{photo.original_name}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="technician-no-photos">
                  No photos were submitted with this report.
                </p>
              )}
            </section>
<section className="technician-details-card">
  <div className="technician-section-heading">
    <div>
      <h2>Update Maintenance Job</h2>
      <p>Record your progress and keep the student informed.</p>
    </div>
    <Wrench size={21} />
  </div>

  {report.status !== "resolved" ? (
    <form
      className="technician-update-form"
      onSubmit={handleStatusUpdate}
    >
      <label htmlFor="jobStatus">New Status</label>

      <select
        id="jobStatus"
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value)}
      >
        {["pending", "under_review"].includes(report.status) && (
          <option value="in_progress">In Progress</option>
        )}

        {report.status === "in_progress" && (
          <option value="resolved">Resolved</option>
        )}
      </select>

      <label htmlFor="maintenanceNote">Maintenance Note</label>

      <textarea
        id="maintenanceNote"
        value={maintenanceNote}
        onChange={(e) => setMaintenanceNote(e.target.value)}
        placeholder="Describe the work performed or the current progress..."
        rows={4}
        maxLength={1000}
        required
      />

      <div className="technician-note-count">
        {maintenanceNote.length}/1000 characters
      </div>

      {updateError && (
        <div className="technician-error">{updateError}</div>
      )}

      {updateMessage && (
        <div className="technician-success">{updateMessage}</div>
      )}

      <button
        type="submit"
        className="technician-update-button"
        disabled={updating}
      >
        {updating ? "Updating..." : "Update Job"}
      </button>
    </form>
  ) : (
    <p className="technician-completed-message">
      This maintenance job has been marked as resolved.
    </p>
  )}
</section>
            <section className="technician-details-card">
              <div className="technician-section-heading">
                <div>
                  <h2>Maintenance History</h2>
                  <p>Previous updates recorded for this report.</p>
                </div>
                <History size={21} />
              </div>

              {report.updates?.length > 0 ? (
                <div className="technician-history-list">
                  {report.updates.map((update) => (
                    <div className="technician-history-item" key={update.id}>
                      <div className="technician-history-marker" />

                      <div>
                        <strong>
                          {update.new_status
                            ? update.new_status.replace("_", " ")
                            : "Maintenance update"}
                        </strong>

                        <p>{update.note}</p>

                        <span>
                          {update.author_name} · {formatDate(update.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="technician-no-photos">
                  No maintenance updates have been recorded yet.
                </p>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default TechnicianJobDetails;
