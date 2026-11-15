
require("dotenv").config();

const db = require("./postgres");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  const fullName = process.env.ADMIN_FULL_NAME;
  const studentId = process.env.ADMIN_STUDENT_ID;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  try {
    if (!fullName || !studentId || !email || !password) {
      throw new Error("Missing administrator details in .env.");
    }

    const existingAdmin = await db.query(
      `SELECT id FROM users
       WHERE email = $1 OR student_id = $2`,
      [email, studentId]
    );

    if (existingAdmin.rows.length > 0) {
      console.log("An account with these details already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (
        student_id,
        full_name,
        email,
        password_hash,
        role
      )
      VALUES ($1, $2, $3, $4, 'admin')
      RETURNING id`,
      [studentId, fullName, email, passwordHash]
    );

    console.log("Admin account created successfully!");
    console.log("Administrator ID:", result.rows[0].id);
    console.log("Email:", email);
    console.log("Student ID:", studentId);

  } catch (error) {
    if (error.code === "23505") {
      console.error("An account with these details already exists.");
    } else {
      console.error("Error creating admin:", error.message);
    }

  } finally {
    await db.end();
  }
}

createAdmin();
