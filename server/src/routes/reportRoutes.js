
const express = require("express");
const crypto = require("crypto");
const supabase = require("../config/supabase");
const db = require("../config/postgres");
const authenticateToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();


// GET ALL REPORTS BELONGING TO THE LOGGED-IN STUDENT
router.get("/my-reports", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Student access only."
      });
    }

    const result = await db.query(`
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
        COUNT(p.id)::INTEGER AS photo_count
      FROM reports r
      JOIN categories c ON r.category_id = c.id
      JOIN dormitories d ON r.dormitory_id = d.id
      LEFT JOIN report_photos p ON r.id = p.report_id
      WHERE r.student_id = $1
      GROUP BY r.id, c.name, d.name
      ORDER BY r.submitted_at DESC
    `, [req.user.id]);

    const reports = result.rows;

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
router.get("/dashboard", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Student access only."
      });
    }

    const studentId = req.user.id;

    // Retrieve report statistics
    const statisticsResult = await db.query(`
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE status IN ('pending', 'under_review')
        )::INTEGER AS pending,
        COUNT(*) FILTER (
          WHERE status = 'in_progress'
        )::INTEGER AS in_progress,
        COUNT(*) FILTER (
          WHERE status = 'resolved'
        )::INTEGER AS resolved
      FROM reports
      WHERE student_id = $1
    `, [studentId]);

    const statistics = statisticsResult.rows[0];

    // Retrieve the three most recent reports
    const recentReportsResult = await db.query(`
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
      WHERE r.student_id = $1
      ORDER BY r.submitted_at DESC
      LIMIT 3
    `, [studentId]);

    const recentReports = recentReportsResult.rows;

    // Retrieve the latest maintenance update
    const latestUpdateResult = await db.query(`
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
      WHERE r.student_id = $1
      ORDER BY ru.created_at DESC, ru.id DESC
      LIMIT 1
    `, [studentId]);

    const latestUpdate = latestUpdateResult.rows[0] || null;

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
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Student access only."
      });
    }

    const reportId = Number(req.params.id);

    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID."
      });
    }

    // Retrieve report only if it belongs to the logged-in student
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
        c.name AS category,
        d.name AS dormitory,
        u.full_name AS technician_name
      FROM reports r
      JOIN categories c ON r.category_id = c.id
      JOIN dormitories d ON r.dormitory_id = d.id
      LEFT JOIN users u ON r.assigned_technician_id = u.id
      WHERE r.id = $1 AND r.student_id = $2
    `, [reportId, req.user.id]);

    const report = reportResult.rows[0];

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found."
      });
    }

    // Retrieve photographs
    const photosResult = await db.query(`
      SELECT id, filename, original_name, file_path, file_size
      FROM report_photos
      WHERE report_id = $1
      ORDER BY id
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

    // Retrieve maintenance updates
    const updatesResult = await db.query(`
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
  async (req, res) => {
   const files = req.files || [];
const uploadedPaths = [];
let client;

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

      const categoryId = Number(category_id);
      const dormitoryId = Number(dormitory_id);

      if (
        !Number.isSafeInteger(categoryId) ||
        !Number.isSafeInteger(dormitoryId) ||
        categoryId <= 0 ||
        dormitoryId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid category or dormitory."
        });
      }

      // Validate category
      const categoryResult = await db.query(
        "SELECT id FROM categories WHERE id = $1",
        [categoryId]
      );

      // Validate dormitory
      const dormitoryResult = await db.query(
        "SELECT id FROM dormitories WHERE id = $1",
        [dormitoryId]
      );

      if (
        categoryResult.rows.length === 0 ||
        dormitoryResult.rows.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid category or dormitory."
        });
      }

      // Get a dedicated PostgreSQL client for the transaction
      client = await db.connect();

      await client.query("BEGIN");

      // Generate a unique reference
      let reference;
      let referenceExists;

      do {
        const randomNumber = Math.floor(
          100000 + Math.random() * 900000
        );

        reference = `FI-${randomNumber}`;

        const existingReference = await client.query(
          "SELECT id FROM reports WHERE reference = $1",
          [reference]
        );

        referenceExists = existingReference.rows.length > 0;

      } while (referenceExists);

      // Insert report
      const result = await client.query(`
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        RETURNING id
      `, [
        reference,
        req.user.id,
        categoryId,
        dormitoryId,
        room_number.trim(),
        specific_location.trim(),
        title.trim(),
        description.trim(),
        urgency
      ]);

      const reportId = result.rows[0].id;

      // Upload photographs to Supabase Storage
for (const file of files) {
  const extension = file.mimetype === "image/jpeg" ? "jpg" : "png";

  const filename = `${crypto.randomUUID()}.${extension}`;
  const storagePath = `${reportId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("report-photos")
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  uploadedPaths.push(storagePath);

  await client.query(`
    INSERT INTO report_photos (
      report_id,
      filename,
      original_name,
      file_path,
      file_size
    )
    VALUES ($1, $2, $3, $4, $5)
  `, [
    reportId,
    filename,
    file.originalname,
    storagePath,
    file.size
  ]);
}

      // Commit transaction
      await client.query("COMMIT");

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
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Rollback error:", rollbackError);
        }
      }

      // Remove uploaded photographs if submission failed
if (uploadedPaths.length > 0) {
  const { error: cleanupError } = await supabase.storage
    .from("report-photos")
    .remove(uploadedPaths);

  if (cleanupError) {
    console.error("Photo cleanup error:", cleanupError);
  }
}

      console.error("Report submission error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to submit maintenance report."
      });

    } finally {
      // Return the client to the connection pool
      if (client) {
        client.release();
      }
    }
  }
);


module.exports = router;
