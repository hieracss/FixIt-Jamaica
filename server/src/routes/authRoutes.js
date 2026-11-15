
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// STUDENT REGISTRATION
router.post("/register", async (req, res) => {
  try {
    const { student_id, full_name, email, password } = req.body;

    // 1. Validate required fields
    if (!student_id || !full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields."
      });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    // 3. Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters."
      });
    }

    // 4. Check whether student ID or email already exists
    const existingUser = db.prepare(`
      SELECT id FROM users
      WHERE student_id = ? OR email = ?
    `).get(student_id.trim(), email.trim().toLowerCase());

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Student ID or email is already registered."
      });
    }

    // 5. Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // 6. Save the student in the database
    const result = db.prepare(`
      INSERT INTO users (
        student_id,
        full_name,
        email,
        password_hash,
        role
      )
      VALUES (?, ?, ?, ?, 'student')
    `).run(
      student_id.trim(),
      full_name.trim(),
      email.trim().toLowerCase(),
      passwordHash
    );

    // 7. Create authentication token
    const token = jwt.sign(
      {
        id: Number(result.lastInsertRowid),
        role: "student"
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 8. Send successful response
    res.status(201).json({
      success: true,
      message: "Student account created successfully.",
      token,
      user: {
        id: Number(result.lastInsertRowid),
        student_id: student_id.trim(),
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        role: "student"
      }
    });

  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to register student."
    });
  }
});

// USER LOGIN
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // 1. Validate required fields
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide your student ID/email and password."
      });
    }

    // 2. Find user using student ID or email
    const user = db.prepare(`
      SELECT * FROM users
      WHERE student_id = ? OR email = ?
    `).get(
      identifier.trim(),
      identifier.trim().toLowerCase()
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid student ID/email or password."
      });
    }

    // 3. Check whether the account is active
    if (user.is_active !== 1) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact an administrator."
      });
    }

    // 4. Verify password against stored hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid student ID/email or password."
      });
    }

    // 5. Generate authentication token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 6. Return successful login response
    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        student_id: user.student_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to log in."
    });
  }
});

// GET CURRENT AUTHENTICATED USER
router.get("/me", authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, student_id, full_name, email, role, created_at
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found."
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error("Profile retrieval error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve user profile."
    });
  }
});

module.exports = router;
