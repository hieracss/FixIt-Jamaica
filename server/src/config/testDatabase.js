
const db = require("./database");

console.log("\n========== DATABASE TEST ==========\n");

// Check database tables
console.log("DATABASE TABLES:");

const tables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
  ORDER BY name
`).all();

console.table(tables);

// Check maintenance categories
console.log("\nMAINTENANCE CATEGORIES:");

const categories = db.prepare(`
  SELECT * FROM categories
`).all();

console.table(categories);

// Check dormitories
console.log("\nDORMITORIES:");

const dormitories = db.prepare(`
  SELECT * FROM dormitories
`).all();

console.table(dormitories);

console.log("\n========== TEST COMPLETED ==========\n");

db.close();

