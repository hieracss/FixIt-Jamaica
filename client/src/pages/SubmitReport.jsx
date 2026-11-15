
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  X,
  AlertTriangle,
  FileImage,
  LoaderCircle,
  Wrench,
} from "lucide-react";

import { getCategories, getDormitories, submitReport } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./SubmitReport.css";

function SubmitReport() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [dormitories, setDormitories] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    category_id: "",
    dormitory_id: "",
    room_number: "",
    specific_location: "",
    description: "",
    urgency: "medium",
  });

  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [categoryResult, dormitoryResult] = await Promise.all([
          getCategories(),
          getDormitories(),
        ]);

        setCategories(categoryResult.data);
        setDormitories(dormitoryResult.data);
      } catch (err) {
        setError("Unable to load form options. Please refresh the page.");
      } finally {
        setLoadingOptions(false);
      }
    }

    loadOptions();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handlePhotos(event) {
    const selectedFiles = Array.from(event.target.files);
    setError("");

    if (selectedFiles.length + photos.length > 3) {
      setError("You can upload a maximum of 3 photographs.");
      event.target.value = "";
      return;
    }

    for (const file of selectedFiles) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setError("Only JPG and PNG photographs are allowed.");
        event.target.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Each photograph must be 5 MB or smaller.");
        event.target.value = "";
        return;
      }
    }

    setPhotos((previous) => [...previous, ...selectedFiles]);
    event.target.value = "";
  }

  function removePhoto(index) {
    setPhotos((previous) =>
      previous.filter((_, photoIndex) => photoIndex !== index)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const token = localStorage.getItem("fixit_token");

    if (!token) {
      navigate("/");
      return;
    }

    try {
      setSubmitting(true);

      const reportData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        reportData.append(key, value);
      });

      photos.forEach((photo) => {
        reportData.append("photos", photo);
      });

      const result = await submitReport(reportData, token);

      navigate("/reports/confirmation", {
        state: { report: result.data },
      });

    } catch (err) {
      setError(err.message || "Unable to submit your report.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOptions) {
    return <div className="report-loading">Loading report form...</div>;
  }

  return (
    <main className="report-page">

      <header className="report-header">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </button>

        <div className="report-brand">
          <Wrench size={20} />
          <span>FixIt Jamaica</span>
        </div>
      </header>

      <div className="report-heading">
        <div>
          <span className="report-eyebrow">STUDENT PORTAL</span>
          <h1>Submit a maintenance report</h1>
          <p>
            Tell us what needs attention. Clear details help the team
            respond faster.
          </p>
        </div>
      </div>

      <div className="report-layout">

        <form className="report-form" onSubmit={handleSubmit}>

          <div className="report-section-heading">
            <h2>Issue information</h2>
            <p>Fields marked * are required.</p>
          </div>

          <div className="report-field">
            <label htmlFor="title">Issue title *</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Leaking pipe beneath bathroom sink"
              required
              maxLength={120}
            />
          </div>

          <div className="report-field-grid">

            <div className="report-field">
              <label htmlFor="category_id">Category *</label>
              <select
                id="category_id"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="report-field">
              <label htmlFor="dormitory_id">
                Dormitory / building *
              </label>
              <select
                id="dormitory_id"
                name="dormitory_id"
                value={form.dormitory_id}
                onChange={handleChange}
                required
              >
                <option value="">Select a dormitory</option>

                {dormitories.map((dormitory) => (
                  <option key={dormitory.id} value={dormitory.id}>
                    {dormitory.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="report-field">
            <label htmlFor="room_number">Room number *</label>
            <input
              id="room_number"
              name="room_number"
              value={form.room_number}
              onChange={handleChange}
              placeholder="e.g. Room 204"
              required
              maxLength={40}
            />
          </div>

          <div className="report-field">
            <label htmlFor="specific_location">
              Specific location *
            </label>
            <input
              id="specific_location"
              name="specific_location"
              value={form.specific_location}
              onChange={handleChange}
              placeholder="e.g. Bathroom sink"
              required
              maxLength={150}
            />
            <small>Include the floor and exact area where possible.</small>
          </div>

          <div className="report-field">
            <label htmlFor="description">Problem description *</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe what happened, when it started and any safety concerns."
              rows={5}
              required
              maxLength={2000}
            />
          </div>

          <div className="report-field">
            <label>Photographs</label>

            <label className="photo-upload" htmlFor="photos">
              <Upload size={25} />

              <strong>Click to upload or drag and drop</strong>
              <span>JPG or PNG · Up to 5 MB each · Maximum 3 photos</span>
            </label>

            <input
              id="photos"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handlePhotos}
              hidden
            />

            {photos.length > 0 && (
              <div className="photo-list">
                {photos.map((photo, index) => (
                  <div className="photo-item" key={`${photo.name}-${index}`}>
                    <FileImage size={20} />

                    <div>
                      <strong>{photo.name}</strong>
                      <small>
                        {(photo.size / (1024 * 1024)).toFixed(2)} MB
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      aria-label={`Remove ${photo.name}`}
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <small>
              Show the issue clearly. Avoid including people or personal
              information.
            </small>
          </div>

          <div className="report-field">
            <label>Urgency *</label>

            <div className="urgency-options">
              {["low", "medium", "high", "critical"].map((level) => (
                <label
                  className={`urgency-option ${form.urgency === level ? "selected" : ""}`}
                  key={level}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={level}
                    checked={form.urgency === level}
                    onChange={handleChange}
                  />

                  <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                </label>
              ))}
            </div>

            <small>
              High: an active issue that may cause damage or affect safety.
              Critical: immediate danger.
            </small>
          </div>

          <div className="report-warning">
            <AlertTriangle size={20} />
            <p>
              For immediate danger, move to safety and contact the
              residence office in person. This form is not an emergency
              service.
            </p>
          </div>

          {error && (
            <div className="report-error" role="alert">
              {error}
            </div>
          )}

          <div className="report-actions">
            <button
              type="button"
              className="cancel-report"
              onClick={() => navigate("/dashboard")}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-report"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <LoaderCircle size={17} className="spin-icon" />
                  Submitting...
                </>
              ) : (
                "Submit report"
              )}
            </button>
          </div>

          <p className="submitted-by">
            Submitted as {user?.full_name} · {user?.student_id}
          </p>

        </form>

        <aside className="report-guidance">

          <h2>Before you submit</h2>

          <ol>
            <li>
              Check My reports to avoid reporting the same issue twice.
            </li>
            <li>
              Choose the closest category and exact location.
            </li>
            <li>
              Add a clear photograph to help the team assess the repair.
            </li>
          </ol>

          <div className="guidance-divider" />

          <h3>What happens next?</h3>

          <p>
            You'll receive a reference number immediately. The maintenance
            office will review the issue, assign a team and post progress
            updates.
          </p>

          <p>
            You can track every update in My reports.
          </p>

        </aside>

      </div>

      <footer className="report-footer">
        FixIt Jamaica · Proposed system for The Mico University College
      </footer>

    </main>
  );
}

export default SubmitReport;
