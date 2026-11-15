
const db = require("./src/config/database");

try {
  db.exec("BEGIN TRANSACTION");

  // Delete maintenance history
  db.prepare("DELETE FROM report_updates").run();

  // Delete report photographs from the database
  db.prepare("DELETE FROM report_photos").run();

  // Delete maintenance reports
  db.prepare("DELETE FROM reports").run();

  // Reset report numbering
  db.prepare(`
    DELETE FROM sqlite_sequence
    WHERE name IN ('reports', 'report_updates', 'report_photos')
  `).run();

  db.exec("COMMIT");

  console.log("All maintenance reports and their histories were deleted.");
  console.log("User accounts, categories and dormitories were preserved.");

} catch (error) {
  db.exec("ROLLBACK");
  console.error("Reset failed:", error);
}
