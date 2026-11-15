
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  Clock,
  AlertCircle,
  Wrench,
  CheckCircle,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import {
  getAdminReportDetails,
  getAdminTechnicians,
  assignTechnician,
  updateReportStatus,
} from "../services/api";
import "./AdminReportDetails.css";

function AdminReportDetails() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [technicians, setTechnicians] = useState([]);
const [selectedTechnician, setSelectedTechnician] = useState("");
const [assigning, setAssigning] = useState(false);
const [assignmentMessage, setAssignmentMessage] = useState("");
const [selectedStatus, setSelectedStatus] = useState("");
const [maintenanceNote, setMaintenanceNote] = useState("");
const [updatingStatus, setUpdatingStatus] = useState(false);
const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    async function loadReport() {
      try {
        const token = localStorage.getItem("fixit_token");
        const data = await getAdminReportDetails(id, token);
        setReport(data);
        const technicianData = await getAdminTechnicians(token);
setTechnicians(technicianData);

if (data.technician_id) {
  setSelectedTechnician(String(data.technician_id));
}
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [id]);

 
async function handleAssignTechnician() {
  if (!selectedTechnician) {
    setAssignmentMessage("Please select a technician.");
    return;
  }

  if (
    String(selectedTechnician) ===
    String(report.technician_id || "")
  ) {
    setAssignmentMessage("This technician is already assigned.");
    return;
  }

  try {
    setAssigning(true);
    setAssignmentMessage("");

    const token = localStorage.getItem("fixit_token");

    const isReassignment = Boolean(report.technician_id);

    await assignTechnician(id, selectedTechnician, token);

    const updatedReport = await getAdminReportDetails(id, token);
    setReport(updatedReport);

    setSelectedTechnician(
      String(updatedReport.technician_id || "")
    );

    setAssignmentMessage(
      isReassignment
        ? "Technician reassigned successfully."
        : "Technician assigned successfully."
    );
  } catch (err) {
    setAssignmentMessage(err.message);
  } finally {
    setAssigning(false);
  }
}


async function handleStatusUpdate() {
  if (!selectedStatus) {
    setStatusMessage("Please select a status.");
    return;
  }

  if (!maintenanceNote.trim()) {
    setStatusMessage("Please enter a maintenance note.");
    return;
  }

  try {
    setUpdatingStatus(true);
    setStatusMessage("");

    const token = localStorage.getItem("fixit_token");

    await updateReportStatus(
      id,
      selectedStatus,
      maintenanceNote.trim(),
      token
    );

    const updatedReport = await getAdminReportDetails(id, token);

    setReport(updatedReport);
    setSelectedStatus("");
    setMaintenanceNote("");

    setStatusMessage("Report status updated successfully.");
  } catch (err) {
    setStatusMessage(err.message);
  } finally {
    setUpdatingStatus(false);
  }
}

  if (loading) {
    return (
      <div className="admin-detail-message">
        <RefreshCw size={22} />
        Loading report details...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="admin-detail-message admin-detail-error">
        <AlertCircle size={22} />
        {error || "Report not found."}
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date.replace(" ", "T") + "Z").toLocaleString();
  };

  return (
    <div className="admin-layout">
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
          <Link to="/admin" className="admin-nav-item">
            <LayoutDashboard size={19} />
            Dashboard
          </Link>

          <Link to="/admin/reports" className="admin-nav-item active">
            <ClipboardList size={19} />
            Manage Reports
          </Link>
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-profile">
            <div className="admin-avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <span>System Admin</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-detail-header">
          <div>
            <span className="admin-breadcrumb">
              Workspace / Manage Reports / Report Details
            </span>
            <h1>Report Details</h1>
          </div>

          <Link to="/admin/reports" className="admin-back-link">
            <ArrowLeft size={16} />
            Back to Reports
          </Link>
        </header>

        <section className="admin-detail-title-card">
          <div>
            <span className="admin-detail-reference">
              {report.reference}
            </span>
            <h2>{report.title}</h2>
            <p>
              Submitted by {report.student_name} ·{" "}
              {formatDate(report.submitted_at)}
            </p>
          </div>

          <div className="admin-detail-badges">
            <span className={`manage-status ${report.status}`}>
              {report.status.replace("_", " ")}
            </span>
            <span className={`manage-urgency ${report.urgency}`}>
              {report.urgency} urgency
            </span>
          </div>
        </section>

        <div className="admin-detail-grid">
          <div className="admin-detail-main-column">
            <section className="admin-detail-card">
              <h3>Report Description</h3>
              <p className="admin-description">
                {report.description}
              </p>
            </section>

            <section className="admin-detail-card">
              <h3>
                <ImageIcon size={18} />
                Uploaded Photographs ({report.photos.length})
              </h3>

              {report.photos.length > 0 ? (
                <div className="admin-photo-grid">
                  {report.photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={`http://localhost:5000${photo.file_path}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={`http://localhost:5000${photo.file_path}`}
                        alt={photo.original_name}
                      />
                      <span>{photo.original_name}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="admin-detail-muted">
                  No photographs were uploaded.
                </p>
              )}
            </section>

            <section className="admin-detail-card">
              <h3>Maintenance History</h3>

              {report.updates.length > 0 ? (
                <div className="admin-history">
                  {report.updates.map((update) => (
                    <div className="admin-history-item" key={update.id}>
                      <div className="admin-history-dot"></div>
                      <div>
                        <strong>
                          {update.author_name}
                          <span>{update.author_role}</span>
                        </strong>

                        {update.previous_status !== update.new_status && (
                          <p>
                            Status changed from{" "}
                            {update.previous_status || "New"} to{" "}
                            {update.new_status}
                          </p>
                        )}

                        <p>{update.note}</p>
                        <small>{formatDate(update.created_at)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="admin-detail-muted">
                  No maintenance updates have been recorded yet.
                </p>
              )}
            </section>
          </div>

          <div className="admin-detail-side-column">
            <section className="admin-detail-card">
              <h3>Student Information</h3>

              <div className="admin-info-row">
                <User size={17} />
                <div>
                  <span>Full Name</span>
                  <strong>{report.student_name}</strong>
                </div>
              </div>

              <div className="admin-info-row">
                <ClipboardList size={17} />
                <div>
                  <span>Student ID</span>
                  <strong>{report.student_number}</strong>
                </div>
              </div>

              <div className="admin-info-row">
                <AlertCircle size={17} />
                <div>
                  <span>Email</span>
                  <strong>{report.student_email}</strong>
                </div>
              </div>
            </section>

            <section className="admin-detail-card">
              <h3>Location Information</h3>

              <div className="admin-info-row">
                <MapPin size={17} />
                <div>
                  <span>Dormitory</span>
                  <strong>{report.dormitory}</strong>
                </div>
              </div>

              <div className="admin-info-row">
                <MapPin size={17} />
                <div>
                  <span>Room</span>
                  <strong>{report.room_number}</strong>
                </div>
              </div>

              <div className="admin-info-row">
                <MapPin size={17} />
                <div>
                  <span>Specific Location</span>
                  <strong>{report.specific_location}</strong>
                </div>
              </div>
            </section>


<section className="admin-detail-card">
  <h3>
    <Wrench size={18} />
    Technician Assignment
  </h3>

  <p className="admin-detail-muted">
    Assign this report to a maintenance technician or
    transfer it to another technician.
  </p>

  <div className="admin-info-row">
    <Wrench size={17} />
    <div>
      <span>Currently Assigned</span>
      <strong>
        {report.technician_name || "Not assigned"}
      </strong>
    </div>
  </div>

  <label className="admin-form-label">
    Select Technician
  </label>

  <select
    value={selectedTechnician}
    onChange={(e) => {
      setSelectedTechnician(e.target.value);
      setAssignmentMessage("");
    }}
    className="admin-technician-select"
  >
    <option value="">Select a technician</option>

    {technicians.map((technician) => (
      <option key={technician.id} value={technician.id}>
        {technician.full_name} ({technician.student_id})
      </option>
    ))}
  </select>

  <button
    type="button"
    className="admin-assign-button"
    onClick={handleAssignTechnician}
    disabled={
      assigning ||
      !selectedTechnician ||
      String(selectedTechnician) ===
        String(report.technician_id || "")
    }
  >
    {assigning
      ? "Saving..."
      : report.technician_id
        ? "Reassign Technician"
        : "Assign Technician"}
  </button>

  {assignmentMessage && (
    <p className="admin-assignment-message">
      {assignmentMessage}
    </p>
  )}
</section>


<section className="admin-detail-card">
  <h3>
    <RefreshCw size={18} />
    Update Report Status
  </h3>

  <p className="admin-detail-muted">
    Change the current status and provide a maintenance update.
  </p>

  <div className="admin-status-current">
    <span>Current Status</span>
    <strong className={`manage-status ${report.status}`}>
      {report.status.replace("_", " ")}
    </strong>
  </div>

  <label className="admin-form-label">
    New Status
  </label>

  <select
    className="admin-technician-select"
    value={selectedStatus}
    onChange={(e) => setSelectedStatus(e.target.value)}
  >
    <option value="">Select new status</option>
    <option value="pending">Pending</option>
    <option value="under_review">Under Review</option>
    <option value="in_progress">In Progress</option>
    <option value="resolved">Resolved</option>
  </select>

  <label className="admin-form-label">
    Maintenance Note
  </label>

  <textarea
    className="admin-maintenance-textarea"
    value={maintenanceNote}
    onChange={(e) => setMaintenanceNote(e.target.value)}
    placeholder="Describe the maintenance progress or work completed..."
    rows={4}
  />

  <button
    type="button"
    className="admin-status-button"
    onClick={handleStatusUpdate}
    disabled={updatingStatus}
  >
    {updatingStatus ? "Updating..." : "Update Report"}
  </button>

  {statusMessage && (
    <p className="admin-status-message">
      {statusMessage}
    </p>
  )}
</section>

            <section className="admin-detail-card">
              <h3>Maintenance Information</h3>

              <div className="admin-info-row">
                <Wrench size={17} />
                <div>
                  <span>Category</span>
                  <strong>{report.category}</strong>
                </div>
              </div>

              <div className="admin-info-row">
                <Clock size={17} />
                <div>
                  <span>Assigned Technician</span>
                  <strong>
                    {report.technician_name || "Not assigned"}
                  </strong>
                </div>
              </div>

              <div className="admin-info-row">
                <Calendar size={17} />
                <div>
                  <span>Submitted</span>
                  <strong>{formatDate(report.submitted_at)}</strong>
                </div>
              </div>

              <div className="admin-info-row">
                <CheckCircle size={17} />
                <div>
                  <span>Resolved</span>
                  <strong>
                    {report.resolved_at
                      ? formatDate(report.resolved_at)
                      : "Not resolved"}
                  </strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminReportDetails;
