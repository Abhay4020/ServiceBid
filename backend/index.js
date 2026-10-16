require("dotenv").config();
const express  = require("express");
const http     = require("http");
const { Server: SocketServer } = require("socket.io");
const cors     = require("cors");
const passport = require("passport");
const { testConnection } = require("./config/db");

const authRoutes  = require("./routes/authRoutes");
const rfqRoutes   = require("./routes/rfqRoutes");
const bidRoutes   = require("./routes/bidRoutes");
const adminRoutes = require("./routes/adminRoutes");
const healthRoutes = require("./routes/healthRoutes");

const app    = express();
const server = http.createServer(app);

// Read allowed origins from env (comma-separated)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\r/g, ""))
  : ["http://localhost:5173"];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(passport.initialize());

// ── Socket.IO ──────────────────────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Attach io to every request so controllers can emit events
app.use((req, _res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  // Client joins a room named after the RFQ ID so only viewers of that RFQ get updates
  socket.on("join_rfq", (rfqId) => {
    socket.join(`rfq_${rfqId}`);
  });

  socket.on("leave_rfq", (rfqId) => {
    socket.leave(`rfq_${rfqId}`);
  });
});

const PORT = process.env.PORT || 5000;

// Routes
app.use("/api", authRoutes);
app.use("/api", rfqRoutes);
app.use("/api", bidRoutes);
app.use("/api", adminRoutes);
app.use("/api", healthRoutes);

// Google OAuth routes are registered in authRoutes.js
// Route: GET /api/auth/google  →  passport.authenticate("google", { scope: ["profile","email"] })
// Route: GET /api/auth/google/callback  →  passport.authenticate("google") then issue JWT
// See authController.js for googleCallback handler.

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

testConnection();

server.listen(PORT, () => {
  console.log(`ServiceBid backend running on port ${PORT}`);
  console.log(`Socket.IO ready on port ${PORT}`);
});

module.exports = { app, io };
