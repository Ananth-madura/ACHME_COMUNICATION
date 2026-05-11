const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const http = require("http");
const db = require("./config/database");
const { initSocket } = require("./sockets/chatsockets");
const { initNotificationsSocket } = require("./sockets/notifications");

// ── Fail fast if required env vars are missing ──────────────────────────────
const REQUIRED_ENV = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  console.error("   Copy backend/.env.example to backend/.env and fill in the values.");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
module.exports = app;

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production set ALLOWED_ORIGIN in your .env, e.g. https://yourdomain.com
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
const corsOrigins = allowedOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? corsOrigins : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    ok: true,
    database: "ready",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  const shouldEmit = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  res.json = (body) => {
    if (shouldEmit && res.statusCode < 400) {
      const io = req.app.get("io");
      if (io) {
        io.emit("data_changed", {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          at: new Date().toISOString()
        });
      }
    }
    return originalJson(body);
  };

  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/Telecalls", require("./routes/telecallRoutes"));
app.use("/api/Walkins", require("./routes/walkinRoutes"));
app.use("/api/quotations", require("./routes/quotationRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/task", require("./routes/taskRoutes"));
app.use("/api/Fields", require("./routes/fieldRoutes"));
app.use("/api/client", require("./routes/newclient"));
app.use("/api/invoice", require("./routes/invoice"));
app.use("/api/payments", require("./routes/payment"));
app.use("/api/estimate-client", require("./routes/newestimates"));
app.use("/api/estimate", require("./routes/estimate"));
app.use("/api/contract", require("./routes/contract"));
app.use("/api/teammember", require("./routes/team"));
app.use("/api/performainvoice", require("./routes/performaInvoiceRoutes"));
app.use("/api/estimate-invoice", require("./routes/estimateInvoiceRoutes"));
app.use("/api/service-estimation", require("./routes/serviceEstimationRoutes"));
app.use("/api/call-reports", require("./routes/callReportRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/leads", require("./routes/leadManagementRoutes"));
app.use("/api/targets", require("./routes/targetRoutes"));
app.use("/api/amc", require("./routes/amcRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

app.use("/uploads", express.static("uploads"));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Either stop the process currently listening on port ${PORT} or set a different PORT in backend/.env.`);
    process.exit(1);
  }
  throw error;
});

db.ready.then(() => {
  const io = initSocket(server, process.env.NODE_ENV === "production" ? corsOrigins : "*");
  const notificationIO = initNotificationsSocket(io, process.env.NODE_ENV === "production" ? corsOrigins : "*");
  app.set("io", io);
  app.set("notificationIO", io);
  require("./backendutil/reminderScheduler");
  server.listen(PORT, () => {
    console.log(`✅ Server running: http://localhost:${PORT} [${process.env.NODE_ENV || "development"}]`);
  });
}).catch((error) => {
  console.error("Database is not ready. Server not started.");
  console.error(`Check DB_HOST, DB_PORT, DB_USER, DB_PASS, and DB_NAME in backend/.env. Details: ${error.message}`);
  process.exit(1);
});
