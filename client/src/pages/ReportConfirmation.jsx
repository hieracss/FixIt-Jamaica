
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Clipboard, ArrowRight, FileText } from "lucide-react";
import "./ReportConfirmation.css";

function ReportConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();

  const report = location.state?.report;

  if (!report) {
    return (
      <main style={{ padding: 40, textAlign: "center" }}>
        <h2>No submission information found.</h2>
        <button onClick={() => navigate("/dashboard")}>
          Return to dashboard
        </button>
      </main>
    );
  }

  return (
    <main className="confirmation-page">
      <section className="confirmation-card">
        <div className="confirmation-icon">
          <CheckCircle2 size={48} />
        </div>

        <span className="confirmation-label">SUBMISSION SUCCESSFUL</span>

        <h1>Your report has been received!</h1>

        <p>
          Your maintenance request has been successfully submitted.
          Keep your reference number so you can track its progress.
        </p>

        <div className="reference-box">
          <span>YOUR REPORT REFERENCE</span>
          <strong>{report.reference}</strong>

          <button
            onClick={() =>
              navigator.clipboard.writeText(report.reference)
            }
          >
            <Clipboard size={15} />
            Copy reference
          </button>
        </div>

        <div className="confirmation-details">
          <div>
            <FileText size={18} />
            <span>Report status</span>
            <strong>Pending</strong>
          </div>

          <div>
            <span>Photographs attached</span>
            <strong>{report.photo_count}</strong>
          </div>
        </div>

        <button
          className="confirmation-primary"
          onClick={() => navigate("/reports")}
        >
          View my reports
          <ArrowRight size={17} />
        </button>

        <button
          className="confirmation-secondary"
          onClick={() => navigate("/dashboard")}
        >
          Return to dashboard
        </button>
      </section>
    </main>
  );
}

export default ReportConfirmation;
