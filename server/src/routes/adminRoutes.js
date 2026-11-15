
const express = require("express");
const db = require("../config/database");
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
router.get("/dashboard", authenticateToken, requireAdmin, (req, res) => {
  try {
    const totalReports = db.prepare(`
      SELECT COUNT(*) AS total FROM reports
    `).get().total;

    const pendingReports = db.prepare(`
      SELECT COUNT(*) AS total
      FROM reports
      WHERE status IN ('pending', 'under_review')
    `).get().total;

    const inProgressReports = db.prepare(`
      SELECT COUNT(*) AS total
      FROM reports
      WHERE status = 'in_progress'
    `).get().total;

    const resolvedReports = db.prepare(`
      SELECT COUNT(*) AS total
      FROM reports
      WHERE status = 'resolved'
    `).get().total;

    const recentReports = db.prepare(`
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
    `).all();

    res.json({
      success: true,
      data: {
        statistics: {
          total: totalReports,
          pending: pendingReports,
          in_progress: inProgressReports,
          resolved: resolvedReports
        },
        recentReports
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
router.get("/reports", authenticateToken, requireAdmin, (req, res) => {
  try {
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
        u.student_id,
        c.name AS category,
        d.name AS dormitory,
        (
          SELECT COUNT(*)
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
    `).all();

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
router.get("/users", authenticateToken, requireAdmin, (req, res) => {
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
          SELECT COUNT(*)
          FROM reports r
          WHERE r.student_id = u.id
        ) AS reports_submitted,
        (
          SELECT COUNT(*)
          FROM reports r
          WHERE r.assigned_technician_id = u.id
        ) AS assigned_reports
      FROM users u
      WHERE 1 = 1
    `;


    const params = [];

    // Filter by account role
    if (role && ["student", "technician", "admin"].includes(role)) {
      query += " AND u.role = ?";
      params.push(role);
    }

    // Search by name, student ID or email
    if (search && search.trim()) {
      query += `
        AND (
          u.full_name LIKE ?
          OR u.student_id LIKE ?
          OR u.email LIKE ?
        )
      `;

      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Filter by account status
    if (status === "active") {
      query += " AND u.is_active = 1";
    } else if (status === "inactive") {
      query += " AND u.is_active = 0";
    }

    query += " ORDER BY u.created_at DESC";

    const users = db.prepare(query).all(...params);

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
    // Require student ID for students and technicians
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
    const existingUser = db.prepare(`
      SELECT id
      FROM users
      WHERE email = ?
         OR (? IS NOT NULL AND student_id = ?)
    `).get(cleanEmail, cleanStudentId, cleanStudentId);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with that student ID or email already exists."
      });
    }

    // Hash password before saving
    const passwordHash = await bcrypt.hash(password, 12);

    // Create account
    const result = db.prepare(`
      INSERT INTO users (
  student_id,
  full_name,
  email,
  password_hash,
  role,
  specialization
)
VALUES (?, ?, ?, ?, ?, ?)
    `).run(
  cleanStudentId,
  full_name.trim(),
  cleanEmail,
  passwordHash,
  role,
  role === "technician" ? specialization : null
);

    res.status(201).json({
      success: true,
      message: "User account created successfully.",
      data: {
        id: Number(result.lastInsertRowid),
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

    res.status(500).json({
      success: false,
      message: "Unable to create user account."
    });
  }
});


// UPDATE USER ACCOUNT DETAILS
router.patch("/users/:id", authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { student_id, full_name, email, specialization } = req.body;

    // Validate user ID
    if (!Number.isInteger(userId) || userId <= 0) {
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
    const existingUser = db.prepare(`
      SELECT id, role
      FROM users
      WHERE id = ?
    `).get(userId);

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
    const duplicateUser = db.prepare(`
      SELECT id
      FROM users
      WHERE id != ?
        AND (
          email = ?
          OR (? IS NOT NULL AND student_id = ?)
        )
    `).get(
      userId,
      cleanEmail,
      cleanStudentId,
      cleanStudentId
    );

    if (duplicateUser) {
      return res.status(409).json({
        success: false,
        message: "Another account already uses that email or student ID."
      });
    }

    // Update account details
    db.prepare(`
      UPDATE users
SET
  student_id = ?,
  full_name = ?,
  email = ?,
  specialization = ?
WHERE id = ?
    `).run(
  cleanStudentId,
  full_name.trim(),
  cleanEmail,
  existingUser.role === "technician" ? specialization : null,
  userId
);
    res.json({
      success: true,
      message: "User account updated successfully."
    });

  } catch (error) {
    console.error("User update error:", error);

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
  (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { is_active } = req.body;

      // Validate user ID
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID."
        });
      }

      // Accept only true, false, 1 or 0
      if (![true, false, 1, 0].includes(is_active)) {
        return res.status(400).json({
          success: false,
          message: "Account status must be active or inactive."
        });
      }

      const activeStatus = is_active === true || is_active === 1 ? 1 : 0;

      // Find the account
      const targetUser = db.prepare(`
        SELECT id, full_name, role, is_active
        FROM users
        WHERE id = ?
      `).get(userId);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "User account not found."
        });
      }

      // Prevent administrators from deactivating their own account
      if (userId === req.user.id && activeStatus === 0) {
        return res.status(400).json({
          success: false,
          message: "You cannot deactivate your own administrator account."
        });
      }

      // No update needed if the account already has this status
      if (targetUser.is_active === activeStatus) {
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
        const activeAdmins = db.prepare(`
          SELECT COUNT(*) AS total
          FROM users
          WHERE role = 'admin'
            AND is_active = 1
        `).get().total;

        if (activeAdmins <= 1) {
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
        const activeJobs = db.prepare(`
          SELECT COUNT(*) AS total
          FROM reports
          WHERE assigned_technician_id = ?
            AND status IN ('pending', 'under_review', 'in_progress')
        `).get(userId).total;

        if (activeJobs > 0) {
          return res.status(400).json({
            success: false,
            message: "Reassign this technician's unresolved reports before deactivating the account."
          });
        }
      }

      // Update account status
      db.prepare(`
        UPDATE users
        SET is_active = ?
        WHERE id = ?
      `).run(activeStatus, userId);

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
      console.error("Account status update error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update account status."
      });
    }
  }
);

// GET DETAILS OF AN INDIVIDUAL REPORT (ADMIN)
router.get("/reports/:id", authenticateToken, requireAdmin, (req, res) => {
  try {
    const reportId = Number(req.params.id);

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID."
      });
    }

    // Retrieve report and associated information
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

      WHERE r.id = ?
    `).get(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Maintenance report not found."
      });
    }

    // Retrieve uploaded photographs
    const photos = db.prepare(`
      SELECT
        id,
        filename,
        original_name,
        file_path,
        file_size
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
    console.error("Admin report details error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve report details."
    });
  }
});

// GET ALL REGISTERED TECHNICIANS
router.get("/technicians", authenticateToken, requireAdmin, (req, res) => {
  try {
    
    const technicians = db.prepare(`
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
    `).all();


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
router.post("/technicians", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
  student_id,
  full_name,
  email,
  password,
  specialization
} = req.body;

    if (
      !student_id?.trim() ||
      !full_name?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all technician account fields."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const existingUser = db.prepare(`
      SELECT id FROM users
      WHERE student_id = ? OR email = ?
    `).get(student_id.trim(), email.trim().toLowerCase());

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with that student ID or email already exists."
      });
    }
    const allowedSpecializations = [
  "plumber",
  "electrician",
  "carpenter",
  "general_maintenance"
];

if (!allowedSpecializations.includes(specialization)) {
  return res.status(400).json({
    success: false,
    message: "Please select a valid technician specialization."
  });
}

    const passwordHash = await bcrypt.hash(password, 12);

   const result = db.prepare(`
  INSERT INTO users (
    student_id,
    full_name,
    email,
    password_hash,
    role,
    specialization
  )
  VALUES (?, ?, ?, ?, 'technician', ?)
`).run(
  student_id.trim(),
  full_name.trim(),
  email.trim().toLowerCase(),
  passwordHash,
  specialization
);

    res.status(201).json({
      success: true,
      message: "Technician account created successfully.",
      data: {
        id: Number(result.lastInsertRowid),
        student_id: student_id.trim(),
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        role: "technician",
        specialization
      }
    });

  } catch (error) {
    console.error("Technician creation error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create technician account."
    });
  }
});

// ASSIGN A TECHNICIAN TO A MAINTENANCE REPORT
router.patch(
  "/reports/:id/assign",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    try {
      const reportId = Number(req.params.id);
      const technicianId = Number(req.body.technician_id);

      if (
        !Number.isInteger(reportId) ||
        reportId <= 0 ||
        !Number.isInteger(technicianId) ||
        technicianId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid report or technician ID."
        });
      }

      const report = db.prepare(`
        SELECT id, status
        FROM reports
        WHERE id = ?
      `).get(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Maintenance report not found."
        });
      }

      const technician = db.prepare(`
  SELECT id, full_name
  FROM users
  WHERE id = ?
    AND role = 'technician'
    AND is_active = 1
`).get(technicianId);

      if (!technician) {
        return res.status(404).json({
          success: false,
          message: "Registered technician not found."
        });
      }

      db.exec("BEGIN TRANSACTION");

      try {
        db.prepare(`
          UPDATE reports
          SET
            assigned_technician_id = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(technicianId, reportId);

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
          req.user.id,
          report.status,
          report.status,
          `Maintenance technician assigned: ${technician.full_name}.`
        );

        db.exec("COMMIT");

      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }

      res.json({
        success: true,
        message: "Technician assigned successfully.",
        data: {
          report_id: reportId,
          technician_id: technician.id,
          technician_name: technician.full_name
        }
      });

    } catch (error) {
      console.error("Technician assignment error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to assign technician."
      });
    }
  }
);

// UPDATE THE STATUS OF A MAINTENANCE REPORT
router.patch(
  "/reports/:id/status",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    try {
      const reportId = Number(req.params.id);
      const { status, note } = req.body;

      const allowedStatuses = [
        "pending",
        "under_review",
        "in_progress",
        "resolved"
      ];

      // Validate report ID
      if (!Number.isInteger(reportId) || reportId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid report ID."
        });
      }

      // Validate status
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid report status."
        });
      }

      // Validate optional note
      if (note !== undefined && typeof note !== "string") {
        return res.status(400).json({
          success: false,
          message: "Maintenance note must be text."
        });
      }

      // Find the existing report
      const report = db.prepare(`
        SELECT id, status
        FROM reports
        WHERE id = ?
      `).get(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Maintenance report not found."
        });
      }

      const previousStatus = report.status;

      const cleanNote = note?.trim() ||
        `Report status changed from ${previousStatus} to ${status}.`;

      // Begin database transaction
      db.exec("BEGIN TRANSACTION");

      try {
        // Update report status
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
        `).run(status, status, reportId);

        // Record the status change in maintenance history
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
          req.user.id,
          previousStatus,
          status,
          cleanNote
        );

        db.exec("COMMIT");

      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }

      res.json({
        success: true,
        message: "Report status updated successfully.",
        data: {
          report_id: reportId,
          previous_status: previousStatus,
          new_status: status,
          note: cleanNote
        }
      });

    } catch (error) {
      console.error("Report status update error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update report status."
      });
    }
  }
);

module.exports = router;
