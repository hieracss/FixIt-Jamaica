
const bcrypt = require("bcryptjs");
const db = require("./database");

async function createTechnician() {
  const studentId = "TECH002";
  const fullName = "Test Technician Two";
  const email = "technician2@fixitjamaica.com";
  const password = "TechTest2026!";

  try {
    const existing = db.prepare(`
      SELECT id FROM users
      WHERE student_id = ? OR email = ?
    `).get(studentId, email);

    if (existing) {
      console.log("TECH002 already exists.");
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
      VALUES (?, ?, ?, ?, 'technician')
    `).run(studentId, fullName, email, passwordHash);

    console.log("Second technician created successfully.");
    console.log("Student ID:", studentId);
    console.log("Password:", password);
  } catch (error) {
    console.error("Unable to create technician:", error);
  }
}

createTechnician();
