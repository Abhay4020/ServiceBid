const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "servicebid_jwt_secret_key";

/**
 * Middleware: verify JWT token from Authorization header
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

/**
 * Middleware: restrict to admin role only
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
  next();
};

/**
 * Middleware: restrict to user role only (not admin)
 */
const requireUser = (req, res, next) => {
  if (!req.user || req.user.role !== "user") {
    return res.status(403).json({ success: false, message: "Access denied. Users only." });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireUser };
