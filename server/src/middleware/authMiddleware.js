
const jwt = require("jsonwebtoken");
const db = require("../config/database");

// Verify the user's authentication token
function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Check whether an authorization header exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Retrieve the user's current account status
    const user = db.prepare(`
      SELECT id, role, is_active
      FROM users
      WHERE id = ?
    `).get(decoded.id);

    // Check whether the account still exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found."
      });
    }

    // Prevent deactivated accounts from accessing the system
    if (user.is_active !== 1) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact an administrator."
      });
    }

    // Attach current database information to the request
    req.user = {
      id: user.id,
      role: user.role
    };

    // Allow request to continue
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
}

module.exports = authenticateToken;
