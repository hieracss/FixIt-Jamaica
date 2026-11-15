
const express = require("express");
const db = require("../config/database");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// TECHNICIAN ACCESS CONTROL
function requireTechnician(req, res, next) {
  if (req.user.role !== "technician") {
    return res.status(403).json({
      success: false,
      message: "Technician access required."
    });
  }

  next();
}

// GET TECHNICIAN DASHBOARD AND ASSIGNED REPORTS
router.get(
  "/dashboard",
  authenticateToken,
  requireTechnician,
  (req, res) => {
    try {
      const technicianId = req.user.id;

      // Retrieve technician statistics
      const statistics = db.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
          SUM(CASE WHEN urgency = 'high' THEN 1 ELSE 0 END) AS high_priority
        FROM reports
        WHERE assigned_technician_id = ?
      `).get(technicianId);

      // Retrieve reports assigned to this technician
      const reports = db.prepare(`
        SELECT
          r.id,
          r.reference,
          r.title,
          r.description,
          r.urgency,
          r.status,
          r.submitted_at,
          r.room_number,
          r.specific_location,
          u.full_name AS student_name,
          c.name AS category,
          d.name AS dormitory

        FROM reports r

        JOIN users u ON r.student_id = u.id
        JOIN categories c ON r.category_id = c.id
        JOIN dormitories d ON r.dormitory_id = d.id

        WHERE r.assigned_technician_id = ?

        ORDER BY
          CASE r.urgency
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END,
          r.submitted_at DESC
      `).all(technicianId);

      res.json({
        success: true,
        data: {
          statistics,
          reports
        }
      });

    } catch (error) {
      console.error("Technician dashboard error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load technician dashboard."
      });
    }
  }
);

// GET DETAILS OF AN INDIVIDUAL ASSIGNED REPORT
router.get(
  "/reports/:id",
  authenticateToken,
  requireTechnician,
  (req, res) => {
    try {
      const technicianId = req.user.id;
      const reportId = Number(req.params.id);

      if (!Number.isInteger(reportId) || reportId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid report ID."
        });
      }

      // Only retrieve reports assigned to this technician
      const report = db.prepare(`
        SELECT
          r.id,
          r.reference,
          r.title,
          r.description,
          r.urgency,
          r.status,
          r.room_number,
          r.specific_location,
          r.submitted_at,
          r.updated_at,
          r.resolved_at,
          u.full_name AS student_name,
          u.student_id AS student_number,
          c.name AS category,
          d.name AS dormitory
        FROM reports r
        JOIN users u ON r.student_id = u.id
        JOIN categories c ON r.category_id = c.id
        JOIN dormitories d ON r.dormitory_id = d.id
        WHERE r.id = ?
          AND r.assigned_technician_id = ?
      `).get(reportId, technicianId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Assigned report not found."
        });
      }

      // Retrieve submitted photos
      const photos = db.prepare(`
        SELECT
          id,
          original_name,
          file_path,
          uploaded_at
        FROM report_photos
        WHERE report_id = ?
      `).all(reportId);

      // Retrieve maintenance history
      const updates = db.prepare(`
        SELECT
          ru.id,
          ru.previous_status,
          ru.new_status,
          ru.note,
          ru.created_at,
          u.full_name AS author_name
        FROM report_updates ru
        JOIN users u ON ru.author_id = u.id
        WHERE ru.report_id = ?
        ORDER BY ru.created_at ASC
      `).all(reportId);

      res.json({
        success: true,
        data: {
          ...report,
          photos,
          updates
        }
      });

    } catch (error) {
      console.error("Technician report details error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve assigned report."
      });
    }
  }
);

// UPDATE THE STATUS OF AN ASSIGNED MAINTENANCE REPORT
router.patch(
  "/reports/:id/status",
  authenticateToken,
  requireTechnician,
  (req, res) => {
    const reportId = Number(req.params.id);
    const technicianId = req.user.id;
    const { status, note } = req.body;

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID."
      });
    }

    const validStatuses = ["in_progress", "resolved"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status selected."
      });
    }

    if (typeof note !== "string" || !note.trim() || note.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "A maintenance note is required (maximum 1000 characters)."
      });
    }

    try {
      // Verify that this report belongs to the logged-in technician
      const report = db.prepare(`
        SELECT id, status
        FROM reports
        WHERE id = ?
          AND assigned_technician_id = ?
      `).get(reportId, technicianId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Assigned report not found."
        });
      }

      // Enforce the permitted maintenance workflow
      const allowedTransition =
        (["pending", "under_review"].includes(report.status) &&
          status === "in_progress") ||
        (report.status === "in_progress" &&
          status === "resolved");

      if (!allowedTransition) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${report.status} to ${status}.`
        });
      }

      // Update the report and record its history together
      db.exec("BEGIN TRANSACTION");

      try {
        db.prepare(`
          UPDATE reports
          SET
            status = ?,
            updated_at = CURRENT_TIMESTAMP,
            resolved_at = CASE
              WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP
              ELSE NULL
            END
          WHERE id = ?
            AND assigned_technician_id = ?
        `).run(status, status, reportId, technicianId);

        db.prepare(`
          INSERT INTO report_updates (
            report_id,
            author_id,
            previous_status,
            new_status,
            note
          )
          VALUES (?, ?, ?, ?, ?)
        `).run(
          reportId,
          technicianId,
          report.status,
          status,
          note.trim()
        );

        db.exec("COMMIT");

      } catch (transactionError) {
        db.exec("ROLLBACK");
        throw transactionError;
      }

      res.json({
        success: true,
        message: "Maintenance report updated successfully.",
        data: {
          reportId,
          previousStatus: report.status,
          newStatus: status
        }
      });

    } catch (error) {
      console.error("Technician status update error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update maintenance report."
      });
    }
  }
);

module.exports = router;
