
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");

// Permanent database location
const dataDirectory = path.join(__dirname, "../../data");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const databasePath = path.join(dataDirectory, "fixit.db");

// Establish database connection
const db = new DatabaseSync(databasePath);

// Enable relational integrity
db.exec("PRAGMA foreign_keys = ON;");

// Improve database reliability
db.exec("PRAGMA journal_mode = WAL;");

console.log("FixIt Jamaica database connected.");

// Create database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    role TEXT NOT NULL CHECK (
      role IN ('student', 'admin', 'technician')
    ),

    specialization TEXT CHECK (
      specialization IN (
        'plumber',
        'electrician',
        'carpenter',
        'general_maintenance'
      )
    ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dormitories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    student_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    dormitory_id INTEGER NOT NULL,
    room_number TEXT NOT NULL,
    specific_location TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    urgency TEXT NOT NULL CHECK (
      urgency IN ('low', 'medium', 'high', 'critical')
    ),

    status TEXT NOT NULL DEFAULT 'pending' CHECK (
      status IN ('pending', 'under_review', 'in_progress', 'resolved')
    ),

    assigned_technician_id INTEGER,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,

    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (dormitory_id) REFERENCES dormitories(id),
    FOREIGN KEY (assigned_technician_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS report_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS report_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_reports_student
    ON reports(student_id);

  CREATE INDEX IF NOT EXISTS idx_reports_status
    ON reports(status);

  CREATE INDEX IF NOT EXISTS idx_reports_category
    ON reports(category_id);

  CREATE INDEX IF NOT EXISTS idx_updates_report
    ON report_updates(report_id);
`);

// =========================================
// DATABASE MIGRATIONS
// =========================================

// Retrieve existing user table columns
const userColumns = db.prepare("PRAGMA table_info(users)").all();

// Check whether account activation column exists
const hasActiveColumn = userColumns.some(
  (column) => column.name === "is_active"
);

// Add account activation status if missing
if (!hasActiveColumn) {
  db.exec(`
    ALTER TABLE users
    ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1
    CHECK (is_active IN (0, 1))
  `);

  console.log("User account activation column added.");
}

// Check whether technician specialization column exists
const hasSpecializationColumn = userColumns.some(
  (column) => column.name === "specialization"
);

// Add technician specialization if missing
if (!hasSpecializationColumn) {
  db.exec(`
    ALTER TABLE users
    ADD COLUMN specialization TEXT CHECK (
      specialization IN (
        'plumber',
        'electrician',
        'carpenter',
        'general_maintenance'
      )
    )
  `);

  console.log("Technician specialization column added.");
}

// =========================================
// DEFAULT MAINTENANCE CATEGORIES
// =========================================

const categories = [
  ["Plumbing", "Water pipes, sinks, showers and drainage."],
  ["Electrical", "Lighting, sockets, fans and electrical systems."],
  ["Furniture", "Beds, desks, chairs and wardrobes."],
  ["Fixtures", "Doors, windows, locks and fittings."],
  ["Other", "Maintenance issues outside the listed categories."]
];

const insertCategory = db.prepare(`
  INSERT OR IGNORE INTO categories (name, description)
  VALUES (?, ?)
`);

for (const category of categories) {
  insertCategory.run(...category);
}

// =========================================
// DEMONSTRATION DORMITORIES
// =========================================

const dormitories = [
  "Dormitory Block A",
  "Dormitory Block B",
  "Dormitory Block C",
  "Dormitory Block D"
];

const insertDormitory = db.prepare(`
  INSERT OR IGNORE INTO dormitories (name)
  VALUES (?)
`);

for (const dormitory of dormitories) {
  insertDormitory.run(dormitory);
}

module.exports = db;
