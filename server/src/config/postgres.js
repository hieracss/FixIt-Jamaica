
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Verify database connection
pool.connect()
  .then((client) => {
    console.log("FixIt Jamaica PostgreSQL connected.");
    client.release();
  })
  .catch((error) => {
    console.error("PostgreSQL connection error:", error.message);
  });

module.exports = pool;
