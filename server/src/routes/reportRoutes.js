
const express = require("express");
const fs = require("fs");
const db = require("../config/database");
const authenticateToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();


 // GET ALL REPORTS BELONGING TO THE LOGGED-IN STUDENT
router.get("/my-reports", authenticateToken, (req, res) => {
  try {
    // Only student accounts can access this endpoint
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Student access only."
      });
    }

    // Retrieve this student's reports
    const reports = db.prepare(`
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
        c.name AS category,
        d.name AS dormitory,
        COUNT(p.id) AS photo_count

      FROM reports r

      JOIN categories c
        ON r.category_id = c.id

      JOIN dormitories d
        ON r.dormitory_id = d.id

      LEFT JOIN report_photos p
        ON r.id = p.report_id

      WHERE r.student_id = ?

      GROUP BY r.id

      ORDER BY r.submitted_at DESC
    `).all(req.user.id);

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });

  } catch (error) {
    console.error("My reports retrieval error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve maintenance reports."
    });
  }
});


// GET STUDENT DASHBOARD SUMMARY
router.get("/dashboard", authenticateToken, (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Student access only."
      });
    }

    const studentId = req.user.id;

    // Retrieve report statistics
    const statistics = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE
          WHEN status IN ('pending', 'under_review')
          THEN 1 ELSE 0
        END) AS pending,
        SUM(CASE
          WHEN status = 'in_progress'
          THEN 1 ELSE 0
        END) AS in_progress,
        SUM(CASE
          WHEN status = 'resolved'
          THEN 1 ELSE 0
        END) AS resolved
      FROM reports
      WHERE student_id = ?
    `).get(studentId);

    // Retrieve the three most recent reports
    const recentReports = db.prepare(`
      SELECT
        r.id,
        r.reference,
        r.title,
        r.urgency,
        r.status,
        r.submitted_at,
        c.name AS category
      FROM reports r
      JOIN categories c ON r.category_id = c.id
      WHERE r.student_id = ?
      ORDER BY r.submitted_at DESC
      LIMIT 3
    `).all(studentId);

    // Retrieve the latest maintenance update
    const latestUpdate = db.prepare(`
      SELECT
        ru.id,
        ru.note,
        ru.new_status,
        ru.created_at,
        r.id AS report_id,
        r.reference,
        r.title,
        u.full_name AS author_name
      FROM report_updates ru
      JOIN reports r ON ru.report_id = r.id
      JOIN users u ON ru.author_id = u.id
      WHERE r.student_id = ?
      ORDER BY ru.created_at DESC, ru.id DESC
      LIMIT 1
    `).get(studentId) || null;

    res.json({
      success: true,
      data: {
        statistics,
        recentReports,
        latestUpdate
      }
    });

  } catch (error) {
    console.error("Student dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve dashboard information."
    });
  }
});

// GET DETAILS OF ONE STUDENT REPORT
router.get("/:id", authenticateToken, (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Student access only."
      });
    }

    const reportId = Number(req.params.id);

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID."
      });
    }

    // Retrieve report only if it belongs to the logged-in student
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
        c.name AS category,
        d.name AS dormitory,
        u.full_name AS technician_name

      FROM reports r

      JOIN categories c ON r.category_id = c.id
      JOIN dormitories d ON r.dormitory_id = d.id
      LEFT JOIN users u ON r.assigned_technician_id = u.id

      WHERE r.id = ? AND r.student_id = ?
    `).get(reportId, req.user.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found."
      });
    }

    // Retrieve photographs
    const photos = db.prepare(`
      SELECT id, filename, original_name, file_path, file_size
      FROM report_photos
      WHERE report_id = ?
      ORDER BY id
    `).all(reportId);

    // Retrieve maintenance updates
    const updates = db.prepare(`
      SELECT
        ru.id,
        ru.previous_status,
        ru.new_status,
        ru.note,
        ru.created_at,
        u.full_name AS author_name,
        u.role AS author_role

      FROM report_updates ru
      JOIN users u ON ru.author_id = u.id

      WHERE ru.report_id = ?
      ORDER BY ru.created_at ASC, ru.id ASC
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
    console.error("Report details error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve report details."
    });
  }
});

// SUBMIT A MAINTENANCE REPORT
router.post(
  "/",
  authenticateToken,
  upload.array("photos", 3),
  (req, res) => {
    const files = req.files || [];

    let transactionStarted = false;

    try {
      // Only students can submit maintenance reports
      if (req.user.role !== "student") {
        return res.status(403).json({
          success: false,
          message: "Only student accounts can submit reports."
        });
      }

      const {
        category_id,
        dormitory_id,
        room_number,
        specific_location,
        title,
        description,
        urgency
      } = req.body;

      // Validate required fields
      if (
        !category_id ||
        !dormitory_id ||
        !room_number?.trim() ||
        !specific_location?.trim() ||
        !title?.trim() ||
        !description?.trim() ||
        !urgency
      ) {
        return res.status(400).json({
          success: false,
          message: "Please complete all required report fields."
        });
      }

      // Validate urgency
      const validUrgencies = [
        "low",
        "medium",
        "high",
        "critical"
      ];

      if (!validUrgencies.includes(urgency)) {
        return res.status(400).json({
          success: false,
          message: "Invalid urgency level."
        });
      }

      // Validate category
      const category = db.prepare(
        "SELECT id FROM categories WHERE id = ?"
      ).get(Number(category_id));

      // Validate dormitory
      const dormitory = db.prepare(
        "SELECT id FROM dormitories WHERE id = ?"
      ).get(Number(dormitory_id));

      if (!category || !dormitory) {
        return res.status(400).json({
          success: false,
          message: "Invalid category or dormitory."
        });
      }

      // Generate a unique reference
      let reference;

      do {
        const randomNumber = Math.floor(
          100000 + Math.random() * 900000
        );

        reference = `FI-${randomNumber}`;

      } while (
        db.prepare(
          "SELECT id FROM reports WHERE reference = ?"
        ).get(reference)
      );

      // Start SQLite transaction
      db.exec("BEGIN TRANSACTION");
      transactionStarted = true;

      // Insert report
      const result = db.prepare(`
        INSERT INTO reports (
          reference,
          student_id,
          category_id,
          dormitory_id,
          room_number,
          specific_location,
          title,
          description,
          urgency,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        reference,
        req.user.id,
        Number(category_id),
        Number(dormitory_id),
        room_number.trim(),
        specific_location.trim(),
        title.trim(),
        description.trim(),
        urgency
      );

      const reportId = Number(result.lastInsertRowid);

      // Save photographs
      const insertPhoto = db.prepare(`
        INSERT INTO report_photos (
          report_id,
          filename,
          original_name,
          file_path,
          file_size
        )
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const file of files) {
        insertPhoto.run(
          reportId,
          file.filename,
          file.originalname,
          `/uploads/${file.filename}`,
          file.size
        );
      }

      // Commit transaction
      db.exec("COMMIT");
      transactionStarted = false;

      return res.status(201).json({
        success: true,
        message: "Maintenance report submitted successfully.",
        data: {
          id: reportId,
          reference,
          status: "pending",
          photo_count: files.length
        }
      });

    } catch (error) {
      // Roll back database changes if necessary
      if (transactionStarted) {
        try {
          db.exec("ROLLBACK");
        } catch (rollbackError) {
          console.error("Rollback error:", rollbackError);
        }
      }

      // Remove uploaded files if submission failed
      for (const file of files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }

      console.error("Report submission error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to submit maintenance report."
      });
    }
  }
);

module.exports = router;
