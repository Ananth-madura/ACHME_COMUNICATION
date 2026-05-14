const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "subadmin") {
    return res.status(403).json({ message: "Admin or Sub-Admin only" });
  }
  next();
};

const isEmployee = (req, res, next) => {
  if (req.user.role !== "employee" && req.user.role !== "admin" && req.user.role !== "subadmin") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

const isReadOnly = (req, res, next) => {
  if (req.user.role === "employee") {
    return res.status(403).json({ message: "Employees cannot modify data" });
  }
  next();
};

module.exports = {
  verifyToken,
  isAdmin,
  isEmployee,
  isReadOnly,
};