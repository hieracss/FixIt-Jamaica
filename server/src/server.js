
const express = require("express");
const cors = require("cors");
const path = require("path");

// Load environment variables before importing database-dependent files
require("dotenv").config({
  path: path.join(__dirname, "../.env")
});

// Import routes and PostgreSQL connection
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const technicianRoutes = require("./routes/technicianRoutes");
const authRoutes = require("./routes/authRoutes");
const db = require("./config/postgres");

// Initialize Express
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/technician", technicianRoutes);

// Serve uploaded photographs
app.use("/uploads", express.static(
  path.join(__dirname, "../uploads")
));

// Health check route
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      success: true,
      message: "FixIt Jamaica API is running!",
      database: "Connected",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Health check database error:", error);

    res.status(503).json({
      success: false,
      message: "API is running, but the database is unavailable.",
      database: "Disconnected"
    });
  }
});

// Categories endpoint
app.get("/api/categories", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM categories ORDER BY name"
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Categories error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve categories."
    });
  }
});

// Dormitories endpoint
app.get("/api/dormitories", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM dormitories ORDER BY name"
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Dormitories error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve dormitories."
    });
  }
});

// Start server after verifying database connection
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await db.query("SELECT 1");

    console.log("PostgreSQL connection verified.");

    app.listen(PORT, () => {
      console.log("----------------------------------");
      console.log("FixIt Jamaica Backend");
      console.log(`Server running on port ${PORT}`);
      console.log("Database connected successfully");
      console.log("----------------------------------");
    });

  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
}

startServer();
