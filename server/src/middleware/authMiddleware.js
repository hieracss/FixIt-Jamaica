
const jwt = require("jsonwebtoken");
const db = require("../config/postgres");

// Verify the user's authentication token
async function authenticateToken(req, res, next) {
  // Check whether an authorization header exists
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  // Extract the token
  const token = authHeader.split(" ")[1];

  let decoded;

  // Verify the token
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }

  try {
    // Retrieve the user's current account status
    const result = await db.query(
      `SELECT id, role, is_active
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    const user = result.rows[0];

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
    console.error("Authentication database error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify your account."
    });
  }
}

module.exports = authenticateToken;
