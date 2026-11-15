const express = require("express");
const db = require("../config/postgres");
const supabase = require("../config/supabase");
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
  async (req, res) => {
    try {
      const technicianId = req.user.id;

      // Retrieve technician statistics
      const statisticsResult = await db.query(`
        SELECT
          COUNT(*)::INTEGER AS total,
          COUNT(*) FILTER (
            WHERE status = 'in_progress'
          )::INTEGER AS in_progress,
          COUNT(*) FILTER (
            WHERE status = 'resolved'
          )::INTEGER AS resolved,
          COUNT(*) FILTER (
            WHERE urgency = 'high'
          )::INTEGER AS high_priority
        FROM reports
        WHERE assigned_technician_id = $1
      `, [technicianId]);

      const statistics = statisticsResult.rows[0];

      // Retrieve reports assigned to this technician
      const reportsResult = await db.query(`
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
        WHERE r.assigned_technician_id = $1
        ORDER BY
          CASE r.urgency
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END,
          r.submitted_at DESC
      `, [technicianId]);

      res.json({
        success: true,
        data: {
          statistics,
          reports: reportsResult.rows
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
  async (req, res) => {
    try {
      const technicianId = req.user.id;
      const reportId = Number(req.params.id);

      if (!Number.isSafeInteger(reportId) || reportId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid report ID."
        });
      }

      // Only retrieve reports assigned to this technician
      const reportResult = await db.query(`
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
        WHERE r.id = $1
          AND r.assigned_technician_id = $2
      `, [reportId, technicianId]);

      const report = reportResult.rows[0];

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Assigned report not found."
        });
      }

      // Retrieve submitted photos
      const photosResult = await db.query(`
        SELECT
          id,
          original_name,
          file_path,
          uploaded_at
        FROM report_photos
        WHERE report_id = $1
      `, [reportId]);
// Generate temporary URLs for private photographs
const photos = await Promise.all(
  photosResult.rows.map(async (photo) => {
    const { data, error } = await supabase.storage
      .from("report-photos")
      .createSignedUrl(photo.file_path, 3600);

    if (error) {
      throw error;
    }

    return {
      ...photo,
      file_path: data.signedUrl
    };
  })
);
      // Retrieve maintenance history
      const updatesResult = await db.query(`
        SELECT
          ru.id,
          ru.previous_status,
          ru.new_status,
          ru.note,
          ru.created_at,
          u.full_name AS author_name
        FROM report_updates ru
        JOIN users u ON ru.author_id = u.id
        WHERE ru.report_id = $1
        ORDER BY ru.created_at ASC, ru.id ASC
      `, [reportId]);

      res.json({
        success: true,
        data: {
          ...report,
          photos: photos,
          updates: updatesResult.rows
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
  async (req, res) => {
    const reportId = Number(req.params.id);
    const technicianId = req.user.id;
    const { status, note } = req.body;

    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
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

    if (
      typeof note !== "string" ||
      !note.trim() ||
      note.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "A maintenance note is required (maximum 1000 characters)."
      });
    }

    let client;

    try {
      // Get a dedicated PostgreSQL client
      client = await db.connect();

      // Begin transaction
      await client.query("BEGIN");

      // Lock the report while checking and updating it
      const reportResult = await client.query(`
        SELECT id, status
        FROM reports
        WHERE id = $1
          AND assigned_technician_id = $2
        FOR UPDATE
      `, [reportId, technicianId]);

      const report = reportResult.rows[0];

      if (!report) {
        await client.query("ROLLBACK");

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
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${report.status} to ${status}.`
        });
      }

      // Update the report
      await client.query(`
        UPDATE reports
        SET
          status = $1,
          updated_at = CURRENT_TIMESTAMP,
          resolved_at = CASE
            WHEN $1 = 'resolved' THEN CURRENT_TIMESTAMP
            ELSE NULL
          END
        WHERE id = $2
          AND assigned_technician_id = $3
      `, [status, reportId, technicianId]);

      // Record the maintenance history
      await client.query(`
        INSERT INTO report_updates (
          report_id,
          author_id,
          previous_status,
          new_status,
          note
        )
        VALUES ($1, $2, $3, $4, $5)
      `, [
        reportId,
        technicianId,
        report.status,
        status,
        note.trim()
      ]);

      // Commit both changes together
      await client.query("COMMIT");

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
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Rollback error:", rollbackError);
        }
      }

      console.error("Technician status update error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update maintenance report."
      });

    } finally {
      if (client) {
        client.release();
      }
    }
  }
);


module.exports = router;
