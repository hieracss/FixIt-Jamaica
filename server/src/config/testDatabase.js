
require("dotenv").config();

const db = require("./postgres");

async function testDatabase() {
  console.log("\n========== DATABASE TEST ==========\n");

  try {
    // Check database tables
    console.log("DATABASE TABLES:");

    const tables = await db.query(`
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.table(tables.rows);


    // Check administrator and technician accounts
    console.log("\nDEMO ACCOUNTS:");

    const users = await db.query(`
      SELECT id, student_id, full_name, email, role, specialization
      FROM users
      ORDER BY id
    `);

    console.table(users.rows);

    // Check maintenance categories
    console.log("\nMAINTENANCE CATEGORIES:");

    const categories = await db.query(`
      SELECT * FROM categories
      ORDER BY name
    `);

    console.table(categories.rows);

    // Check dormitories
    console.log("\nDORMITORIES:");

    const dormitories = await db.query(`
      SELECT * FROM dormitories
      ORDER BY name
    `);

    console.table(dormitories.rows);

    console.log("\n========== TEST COMPLETED ==========\n");

  } catch (error) {
    console.error("Database test failed:", error.message);

  } finally {
    await db.end();
  }
}

testDatabase();
