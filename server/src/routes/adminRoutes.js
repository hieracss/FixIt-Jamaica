const supabase = require("../config/supabase");
const express = require("express");
const db = require("../config/postgres");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
const bcrypt = require("bcryptjs");
// ADMINISTRATOR ACCESS CONTROL
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrator access required."
    });
  }

  next();
}

// GET ADMIN DASHBOARD STATISTICS
router.get("/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
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
    `);

    const statistics = statisticsResult.rows[0];

    const recentReportsResult = await db.query(`
      SELECT
        r.id,
        r.reference,
        r.title,
        r.urgency,
        r.status,
        r.submitted_at,
        u.full_name AS student_name,
        c.name AS category,
        d.name AS dormitory
      FROM reports r
      JOIN users u ON r.student_id = u.id
      JOIN categories c ON r.category_id = c.id
      JOIN dormitories d ON r.dormitory_id = d.id
      ORDER BY r.submitted_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        statistics,
        recentReports: recentReportsResult.rows
      }
    });

  } catch (error) {
    console.error("Admin dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load administrator dashboard."
    });
  }
});


// GET ALL MAINTENANCE REPORTS
router.get("/reports", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
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
        u.student_id,
        c.name AS category,
        d.name AS dormitory,
        (
          SELECT COUNT(*)::INTEGER
          FROM report_photos rp
          WHERE rp.report_id = r.id
        ) AS photo_count
      FROM reports r
      JOIN users u ON r.student_id = u.id
      JOIN categories c ON r.category_id = c.id
      JOIN dormitories d ON r.dormitory_id = d.id
      ORDER BY
        CASE r.urgency
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        r.submitted_at DESC
    `);

    const reports = result.rows;

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });

  } catch (error) {
    console.error("Admin reports error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve maintenance reports."
    });
  }
});


// GET ALL REGISTERED USERS
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, search, status } = req.query;

    let query = `
      SELECT
        u.id,
        u.student_id,
        u.full_name,
        u.email,
        u.role,
        u.specialization,
        u.is_active,
        u.created_at,
        (
          SELECT COUNT(*)::INTEGER
          FROM reports r
          WHERE r.student_id = u.id
        ) AS reports_submitted,
        (
          SELECT COUNT(*)::INTEGER
          FROM reports r
          WHERE r.assigned_technician_id = u.id
        ) AS assigned_reports
      FROM users u
      WHERE 1 = 1
    `;

    const params = [];

    // Filter by account role
    if (role && ["student", "technician", "admin"].includes(role)) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    // Search by name, student ID or email
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;

      params.push(searchTerm);
      const nameParam = `$${params.length}`;

      params.push(searchTerm);
      const studentIdParam = `$${params.length}`;

      params.push(searchTerm);
      const emailParam = `$${params.length}`;

      query += `
        AND (
          u.full_name ILIKE ${nameParam}
          OR u.student_id ILIKE ${studentIdParam}
          OR u.email ILIKE ${emailParam}
        )
      `;
    }

    // Filter by account status
    if (status === "active") {
      query += " AND u.is_active = 1";
    } else if (status === "inactive") {
      query += " AND u.is_active = 0";
    }

    query += " ORDER BY u.created_at DESC";

    const result = await db.query(query, params);
    const users = result.rows;

    res.json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    console.error("User retrieval error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve users."
    });
  }
});



// CREATE A USER ACCOUNT
router.post("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      student_id,
      full_name,
      email,
      password,
      role,
      specialization
    } = req.body;

    // Validate required fields
    if (
      !full_name?.trim() ||
      !email?.trim() ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required account information."
      });
    }

    // Validate role
    const allowedRoles = ["student", "technician", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account role."
      });
    }

    // Validate technician specialization
    const allowedSpecializations = [
      "plumber",
      "electrician",
      "carpenter",
      "general_maintenance"
    ];

    if (
      role === "technician" &&
      !allowedSpecializations.includes(specialization)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid technician specialization."
      });
    }

    // Students and administrators cannot have technician specializations
    if (role !== "technician" && specialization) {
      return res.status(400).json({
        success: false,
        message: "Only technicians can have a specialization."
      });
    }

  // Require student ID for student and technician accounts
if (
  ["student", "technician"].includes(role) &&
  !student_id?.trim()
) {
  return res.status(400).json({
    success: false,
    message: "Student ID is required for student and technician accounts."
  });
}
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const cleanStudentId = student_id?.trim() || null;
    const cleanEmail = email.trim().toLowerCase();

    // Check for duplicate student ID or email
    const existingUser = await db.query(`
      SELECT id
      FROM users
      WHERE email = $1
         OR ($2::TEXT IS NOT NULL AND student_id = $2)
    `, [cleanEmail, cleanStudentId]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with that student ID or email already exists."
      });
    }

    // Hash password before saving
    const passwordHash = await bcrypt.hash(password, 12);

    // Create account
    const result = await db.query(`
      INSERT INTO users (
        student_id,
        full_name,
        email,
        password_hash,
        role,
        specialization
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      cleanStudentId,
      full_name.trim(),
      cleanEmail,
      passwordHash,
      role,
      role === "technician" ? specialization : null
    ]);

    res.status(201).json({
      success: true,
      message: "User account created successfully.",
      data: {
        id: result.rows[0].id,
        student_id: cleanStudentId,
        full_name: full_name.trim(),
        email: cleanEmail,
        specialization: role === "technician" ? specialization : null,
        role,
        is_active: 1
      }
    });

  } catch (error) {
    console.error("User creation error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with that student ID or email already exists."
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to create user account."
    });
  }
});


 // UPDATE USER ACCOUNT DETAILS
router.patch("/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { student_id, full_name, email, specialization } = req.body;

    // Validate user ID
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID."
      });
    }

    // Validate required fields
    if (!full_name?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required."
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    // Find existing user
    const userResult = await db.query(`
      SELECT id, role
      FROM users
      WHERE id = $1
    `, [userId]);

    const existingUser = userResult.rows[0];

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User account not found."
      });
    }

    // Validate technician specialization
    const allowedSpecializations = [
      "plumber",
      "electrician",
      "carpenter",
      "general_maintenance"
    ];

    if (
      existingUser.role === "technician" &&
      !allowedSpecializations.includes(specialization)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid technician specialization."
      });
    }

    // Students and administrators cannot have specializations
    if (existingUser.role !== "technician" && specialization) {
      return res.status(400).json({
        success: false,
        message: "Only technicians can have a specialization."
      });
    }

    const cleanStudentId = student_id?.trim() || null;
    const cleanEmail = email.trim().toLowerCase();

    // Require student ID for students and technicians
    if (
      ["student", "technician"].includes(existingUser.role) &&
      !cleanStudentId
    ) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required for this account."
      });
    }

    // Check whether another account uses this email or student ID
    const duplicateResult = await db.query(`
      SELECT id
      FROM users
      WHERE id != $1
        AND (
          email = $2
          OR ($3::TEXT IS NOT NULL AND student_id = $3)
        )
    `, [userId, cleanEmail, cleanStudentId]);

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Another account already uses that email or student ID."
      });
    }

    // Update account details
    await db.query(`
      UPDATE users
      SET
        student_id = $1,
        full_name = $2,
        email = $3,
        specialization = $4
      WHERE id = $5
    `, [
      cleanStudentId,
      full_name.trim(),
      cleanEmail,
      existingUser.role === "technician" ? specialization : null,
      userId
    ]);

    res.json({
      success: true,
      message: "User account updated successfully."
    });

  } catch (error) {
    console.error("User update error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Another account already uses that email or student ID."
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to update user account."
    });
  }
});


// ACTIVATE OR DEACTIVATE A USER ACCOUNT
router.patch(
  "/users/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const userId = Number(req.params.id);
    const { is_active } = req.body;

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID."
      });
    }

    if (![true, false, 1, 0].includes(is_active)) {
      return res.status(400).json({
        success: false,
        message: "Account status must be active or inactive."
      });
    }

    const activeStatus = is_active === true || is_active === 1 ? 1 : 0;

    let client;

    try {
      client = await db.connect();

      await client.query("BEGIN");

      // Find and lock the account
      const userResult = await client.query(`
        SELECT id, full_name, role, is_active
        FROM users
        WHERE id = $1
        FOR UPDATE
      `, [userId]);

      const targetUser = userResult.rows[0];

      if (!targetUser) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "User account not found."
        });
      }

      // Prevent administrators from deactivating their own account
      if (
        String(userId) === String(req.user.id) &&
        activeStatus === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "You cannot deactivate your own administrator account."
        });
      }

      // No update needed if the account already has this status
      if (targetUser.is_active === activeStatus) {
        await client.query("COMMIT");

        return res.json({
          success: true,
          message: "The account already has the requested status."
        });
      }

      // Prevent deactivation of the last active administrator
      if (
        targetUser.role === "admin" &&
        activeStatus === 0
      ) {
        // Lock active administrator accounts while checking
        await client.query(`
          SELECT id
          FROM users
          WHERE role = 'admin'
            AND is_active = 1
          FOR UPDATE
        `);

        const activeAdminsResult = await client.query(`
          SELECT COUNT(*)::INTEGER AS total
          FROM users
          WHERE role = 'admin'
            AND is_active = 1
        `);

        const activeAdmins = activeAdminsResult.rows[0].total;

        if (activeAdmins <= 1) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: "The last active administrator cannot be deactivated."
          });
        }
      }

      // Prevent deactivation of technicians with unresolved assigned reports
      if (
        targetUser.role === "technician" &&
        activeStatus === 0
      ) {
        const activeJobsResult = await client.query(`
          SELECT COUNT(*)::INTEGER AS total
          FROM reports
          WHERE assigned_technician_id = $1
            AND status IN ('pending', 'under_review', 'in_progress')
        `, [userId]);

        const activeJobs = activeJobsResult.rows[0].total;

        if (activeJobs > 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: "Reassign this technician's unresolved reports before deactivating the account."
          });
        }
      }

      // Update account status
      await client.query(`
        UPDATE users
        SET is_active = $1
        WHERE id = $2
      `, [activeStatus, userId]);

      await client.query("COMMIT");

      res.json({
        success: true,
        message: activeStatus === 1
          ? "User account activated successfully."
          : "User account deactivated successfully.",
        data: {
          id: targetUser.id,
          full_name: targetUser.full_name,
          is_active: activeStatus
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

      console.error("Account status update error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update account status."
      });

    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

// GET DETAILS OF AN INDIVIDUAL REPORT (ADMIN)
router.get("/reports/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reportId = Number(req.params.id);

    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID."
      });
    }

    // Retrieve report and associated information
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
        u.email AS student_email,
        c.name AS category,
        d.name AS dormitory,
        technician.full_name AS technician_name,
        technician.id AS technician_id
      FROM reports r
      JOIN users u ON r.student_id = u.id
      JOIN categories c ON r.category_id = c.id
      JOIN dormitories d ON r.dormitory_id = d.id
      LEFT JOIN users technician
        ON r.assigned_technician_id = technician.id
      WHERE r.id = $1
    `, [reportId]);

    const report = reportResult.rows[0];

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Maintenance report not found."
      });
    }

    // Retrieve uploaded photographs
    const photosResult = await db.query(`
      SELECT
        id,
        filename,
        original_name,
        file_path,
        file_size
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
    console.error("Admin report details error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve report details."
    });
  }
});

// GET ALL REGISTERED TECHNICIANS
router.get("/technicians", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        student_id,
        full_name,
        email,
        specialization
      FROM users
      WHERE role = 'technician'
        AND is_active = 1
      ORDER BY full_name ASC
    `);

    const technicians = result.rows;

    res.json({
      success: true,
      count: technicians.length,
      data: technicians
    });

  } catch (error) {
    console.error("Technician retrieval error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve technicians."
    });
  }
});


// CREATE A TECHNICIAN ACCOUNT

router.post("/technicians", async (req, res) => {
  try {
    const {
      student_id,
      full_name,
      email,
      password,
      specialization
    } = req.body;

    if (!student_id || !full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Student ID, full name, email, and password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long."
      });
    }

    const allowedSpecializations = [
      "plumber",
      "electrician",
      "carpenter",
      "general_maintenance"
    ];

    const selectedSpecialization =
      specialization || "general_maintenance";

    if (!allowedSpecializations.includes(selectedSpecialization)) {
      return res.status(400).json({
        success: false,
        message: "Invalid technician specialization."
      });
    }

    const existingUser = await db.query(
      `SELECT id FROM users
       WHERE student_id = $1 OR email = $2`,
      [student_id, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "A user with that Student ID or email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (
        student_id,
        full_name,
        email,
        password_hash,
        role,
        specialization
      )
      VALUES ($1, $2, $3, $4, 'technician', $5)
      RETURNING id`,
      [
        student_id,
        full_name,
        email,
        passwordHash,
        selectedSpecialization
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Technician created successfully.",
      technician: {
        id: result.rows[0].id,
        student_id,
        full_name,
        email,
        specialization: selectedSpecialization
      }
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A user with that Student ID or email already exists."
      });
    }

    console.error("Create technician error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create technician."
    });
  }
});


// ASSIGN A TECHNICIAN TO A MAINTENANCE REPORT

router.patch("/reports/:id/assign", authenticateToken, requireAdmin, async (req, res) => {
  const reportId = Number(req.params.id);
  const { technician_id } = req.body;

  if (!Number.isSafeInteger(reportId) || reportId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid report ID."
    });
  }

  if (!technician_id || !Number.isSafeInteger(Number(technician_id))) {
    return res.status(400).json({
      success: false,
      message: "A valid technician ID is required."
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const reportResult = await client.query(
      `SELECT id, status
       FROM reports
       WHERE id = $1
       FOR UPDATE`,
      [reportId]
    );

    const report = reportResult.rows[0];

    if (!report) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Report not found."
      });
    }

    const technicianResult = await client.query(
      `SELECT id, full_name
       FROM users
       WHERE id = $1
       AND role = 'technician'
       AND is_active = 1`,
      [technician_id]
    );

    const technician = technicianResult.rows[0];

    if (!technician) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Active technician not found."
      });
    }

await client.query(
  `UPDATE reports
   SET assigned_technician_id = $1,
       status = CASE
         WHEN status = 'pending' THEN 'under_review'
         ELSE status
       END,
       updated_at = CURRENT_TIMESTAMP
   WHERE id = $2`,
  [technician.id, reportId]
);
const newStatus =
  report.status === "pending"
    ? "under_review"
    : report.status;

await client.query(
  `INSERT INTO report_updates (
    report_id,
    author_id,
    previous_status,
    new_status,
    note
  )
  VALUES ($1, $2, $3, $4, $5)`,
  [
    reportId,
    req.user.id,
    report.status,
    newStatus,
    `Maintenance technician assigned: ${technician.full_name}.`
  ]
);


    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Technician assigned successfully."
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Assign technician error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to assign technician."
    });

  } finally {
    client.release();
  }
});

// UPDATE THE STATUS OF A MAINTENANCE REPORT

router.patch("/reports/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  const reportId = Number(req.params.id);
  const { status, note } = req.body;

  const allowedStatuses = [
    "pending",
    "under_review",
    "in_progress",
    "resolved"
  ];

  if (!Number.isSafeInteger(reportId) || reportId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid report ID."
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid report status."
    });
  }

  if (note !== undefined && typeof note !== "string") {
    return res.status(400).json({
      success: false,
      message: "The note must be text."
    });
  }

  const cleanNote =
    note?.trim() || `Report status changed to ${status.replace("_", " ")}.`;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const reportResult = await client.query(
      `SELECT id, status
       FROM reports
       WHERE id = $1
       FOR UPDATE`,
      [reportId]
    );

    const report = reportResult.rows[0];

    if (!report) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Report not found."
      });
    }

    await client.query(
      `UPDATE reports
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP,
           resolved_at = CASE
             WHEN $1 = 'resolved' THEN CURRENT_TIMESTAMP
             ELSE NULL
           END
       WHERE id = $2`,
      [status, reportId]
    );

    await client.query(
      `INSERT INTO report_updates (
        report_id,
        author_id,
        previous_status,
        new_status,
        note
      )
      VALUES ($1, $2, $3, $4, $5)`,
      [
        reportId,
        req.user.id,
        report.status,
        status,
        cleanNote
      ]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Report status updated successfully."
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update report status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update report status."
    });

  } finally {
    client.release();
  }
});


module.exports = router;