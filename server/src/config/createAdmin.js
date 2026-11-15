
const db = require("./database");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  const fullName = "FixIt Administrator";
  const studentId = "ADMIN001";
  const email = "admin@fixitjamaica.com";
  const password = "AdminFixIt2026!";

  try {
    const existingAdmin = db.prepare(
      "SELECT id FROM users WHERE email = ? OR student_id = ?"
    ).get(email, studentId);

    if (existingAdmin) {
      console.log("An account with these details already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    db.prepare(`
      INSERT INTO users (
        student_id,
        full_name,
        email,
        password_hash,
        role
      )
      VALUES (?, ?, ?, ?, 'admin')
    `).run(studentId, fullName, email, passwordHash);

    console.log("Admin account created successfully!");
    console.log("Email:", email);
    console.log("Student ID:", studentId);
    console.log("Temporary password:", password);
  } catch (error) {
    console.error("Error creating admin:", error.message);
  }
}

createAdmin();
