
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  MapPin,
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  UserRound,
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";

import { getReportDetails } from "../services/api";
import "./ReportDetails.css";

const API_SERVER = import.meta.env.VITE_API_URL.replace(/\/api$/, "");

const statusSteps = [
  { value: "pending", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];


function formatDate(date) {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    console.error("Invalid date received:", date);
    return "Date unavailable";
  }

  return parsedDate.toLocaleString("en-JM", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}


function formatStatus(status) {
  const labels = {
    pending: "Pending",
    under_review: "Under Review",
    in_progress: "In Progress",
    resolved: "Resolved",
  };

  return labels[status] || status;
}

function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadReport() {
      try {
        const token = localStorage.getItem("fixit_token");

        if (!token) {
          navigate("/", { replace: true });
          return;
        }

        const result = await getReportDetails(id, token);

        if (isActive) {
          setReport(result.data);
        }
      } catch (err) {
        if (isActive) {
          setError(err.message || "Unable to load this report.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      isActive = false;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="report-details-loading">
        <LoaderCircle size={25} className="details-spinner" />
        Loading report details...
      </div>
    );
  }

  if (error || !report) {
    return (
      <main className="report-details-page">
        <button
          className="details-back-button"
          onClick={() => navigate("/reports")}
        >
          <ArrowLeft size={17} />
          Back to my reports
        </button>

        <div className="details-error">
          <AlertTriangle size={30} />
          <h2>Unable to display this report</h2>
          <p>{error || "The requested report could not be found."}</p>
          <button onClick={() => navigate("/reports")}>
            Return to My Reports
          </button>
        </div>
      </main>
    );
  }

  const currentStep = statusSteps.findIndex(
    (step) => step.value === report.status
  );

  return (
    <main className="report-details-page">

      <header className="details-header">
        <button
          className="details-back-button"
          onClick={() => navigate("/reports")}
        >
          <ArrowLeft size={17} />
          Back to my reports
        </button>

        <span className="details-brand">FixIt Jamaica</span>
      </header>

      <section className="details-heading">
        <div>
          <span className="details-eyebrow">REPORT TRACKING</span>
          <h1>{report.title}</h1>
          <p>
            Reference: <strong>{report.reference}</strong>
          </p>
        </div>

        <span className={`details-status ${report.status}`}>
          {formatStatus(report.status)}
        </span>
      </section>

      <div className="details-layout">

        <div className="details-main-column">

          {/* REPORT PROGRESS */}
          <section className="details-card">
            <div className="details-card-heading">
              <h2>Report progress</h2>
              <span>Current status: {formatStatus(report.status)}</span>
            </div>

            <div className="status-timeline">
              {statusSteps.map((step, index) => {
                const completed = index <= currentStep;
                const current = index === currentStep;

                return (
                  <div
                    className={`timeline-step ${completed ? "completed" : ""} ${current ? "current" : ""}`}
                    key={step.value}
                  >
                    <div className="timeline-marker">
                      {completed ? (
                        <CheckCircle2 size={22} />
                      ) : (
                        <Circle size={22} />
                      )}
                    </div>

                    <div className="timeline-label">
                      <strong>{step.label}</strong>
                      {current && <small>Current stage</small>}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="timeline-note">
              Your report was submitted on {formatDate(report.submitted_at)}.
            </p>
          </section>

          {/* ISSUE DESCRIPTION */}
          <section className="details-card">
            <div className="details-card-heading">
              <h2>Issue description</h2>
              <ClipboardList size={19} />
            </div>

            <p className="details-description">{report.description}</p>

            <div className="details-information-grid">
              <div>
                <span>Category</span>
                <strong>{report.category}</strong>
              </div>

              <div>
                <span>Urgency</span>
                <strong className={`details-urgency ${report.urgency}`}>
                  {report.urgency.charAt(0).toUpperCase() +
                    report.urgency.slice(1)}
                </strong>
              </div>

              <div>
                <span>Room number</span>
                <strong>{report.room_number}</strong>
              </div>

              <div>
                <span>Specific location</span>
                <strong>{report.specific_location}</strong>
              </div>
            </div>
          </section>

          {/* PHOTOGRAPHS */}
          <section className="details-card">
            <div className="details-card-heading">
              <h2>Attached photographs</h2>
              <ImageIcon size={19} />
            </div>

            {report.photos.length > 0 ? (
              <div className="details-photo-grid">
                {report.photos.map((photo) => (
                  <a
                    href={photo.file_path}
                    target="_blank"
                    rel="noreferrer"
                    key={photo.id}
                    className="details-photo"
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
              <p className="details-muted">
                No photographs were attached to this report.
              </p>
            )}
          </section>

          {/* MAINTENANCE UPDATES */}
          <section className="details-card">
            <div className="details-card-heading">
              <h2>Maintenance updates</h2>
              <Clock size={19} />
            </div>

            {report.updates.length > 0 ? (
              <div className="maintenance-updates">
                {report.updates.map((update) => (
                  <article className="maintenance-update" key={update.id}>
                    <div className="update-icon">
                      <UserRound size={17} />
                    </div>

                    <div>
                      <strong>{update.author_name}</strong>
                      <span className="update-role">
                        {update.author_role}
                      </span>

                      {update.new_status && (
                        <p>
                          Status changed to{" "}
                          <strong>{formatStatus(update.new_status)}</strong>
                        </p>
                      )}

                      <p>{update.note}</p>

                      <small>{formatDate(update.created_at)}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="details-muted">
                No maintenance updates have been posted yet. Updates from
                the maintenance team will appear here.
              </p>
            )}
          </section>

        </div>

        {/* REPORT SIDEBAR */}
        <aside className="details-side-column">

          <section className="details-card">
            <h2>Report information</h2>

            <div className="details-side-item">
              <ClipboardList size={18} />
              <div>
                <span>Reference number</span>
                <strong>{report.reference}</strong>
              </div>
            </div>

            <div className="details-side-item">
              <CalendarDays size={18} />
              <div>
                <span>Date submitted</span>
                <strong>{formatDate(report.submitted_at)}</strong>
              </div>
            </div>

            <div className="details-side-item">
              <MapPin size={18} />
              <div>
                <span>Dormitory</span>
                <strong>{report.dormitory}</strong>
              </div>
            </div>

            <div className="details-side-item">
              <UserRound size={18} />
              <div>
                <span>Assigned technician</span>
                <strong>
                  {report.technician_name || "Not yet assigned"}
                </strong>
              </div>
            </div>

            {report.resolved_at && (
              <div className="details-side-item">
                <CheckCircle2 size={18} />
                <div>
                  <span>Resolved on</span>
                  <strong>{formatDate(report.resolved_at)}</strong>
                </div>
              </div>
            )}
          </section>

          <section className="details-help-card">
            <AlertTriangle size={20} />
            <h3>Need immediate assistance?</h3>
            <p>
              If this issue presents an immediate danger, move to safety
              and contact your residence office directly.
            </p>
          </section>

        </aside>

      </div>
    </main>
  );
}

export default ReportDetails;
