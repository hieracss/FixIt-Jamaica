
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const technicianRoutes = require("./routes/technicianRoutes");

// Load environment variables
dotenv.config({
  path: path.join(__dirname, "../.env")
});

// Import database
const db = require("./config/database");

// Initialize Express
const app = express();
const authRoutes = require("./routes/authRoutes");

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/technician", technicianRoutes);
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photographs
app.use("/uploads", express.static(
  path.join(__dirname, "../uploads")
));

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FixIt Jamaica API is running!",
    database: "Connected",
    timestamp: new Date().toISOString()
  });
});

// Database information route (development only)
app.get("/api/categories", (req, res) => {
  const categories = db.prepare(
    "SELECT * FROM categories ORDER BY name"
  ).all();

  res.json({
    success: true,
    data: categories
  });
});

app.get("/api/dormitories", (req, res) => {
  const dormitories = db.prepare(
    "SELECT * FROM dormitories ORDER BY name"
  ).all();

  res.json({
    success: true,
    data: dormitories
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("----------------------------------");
  console.log("FixIt Jamaica Backend");
  console.log(`Server running on port ${PORT}`);
  console.log("Database connected successfully");
  console.log("----------------------------------");
});

