const express = require("express");
const webPush = require('web-push');
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const productsRoutes = require("./routes/product");
const app = express();

// Trust proxy - required when behind nginx/reverse proxy
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: [process.env.CORS_ORIGIN, "http://localhost:5173"] || "*",
    credentials: true,
  }),
);

// Request logging
app.use(morgan("dev"));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const healthRoutes = require("./routes/health");
const adminAuthRoutes = require("./routes/adminAuth");
const adminUsersRoutes = require("./routes/adminUsers");
const adminFlagsRoutes = require("./routes/adminFlags");
const adminCacheRoutes = require("./routes/adminCache");
const featureFlagsRoutes = require("./routes/featureFlags");
const sessionCheckRoutes = require("./routes/sessionCheck");
const { router: internalRouter } = require('./routes/internal');
const paymentRoutes = require("./routes/paymentRoutes");
const chatRoutes = require("./routes/chat");
const pushRoutes = require("./routes/push");

// Mount routes
app.use('/health', healthRoutes);
app.use('/internal', internalRouter);
app.use('/admin/auth', adminAuthRoutes);
app.use('/admin/users', adminUsersRoutes);
app.use('/admin/flags', adminFlagsRoutes);
app.use('/admin/cache', adminCacheRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/products', productsRoutes);
app.use('/feature-flags', featureFlagsRoutes);
app.use('/session', sessionCheckRoutes);
app.use('/uploads/chat', express.static(path.join(__dirname, '../uploads/chat')));

// Root endpoint (buat dapetin metadata)
app.get("/api", (req, res) => {
  res.json({
    message: "Nimonspedia Node.js API",
    version: process.env.API_VERSION,
    endpoints: {
      health: "/health",
      admin: {
        auth: "/admin/auth",
        users: "/admin/users",
        flags: "/admin/flags",
        cache: "/admin/cache",
        chat: "/api/chat",
        payment: "/api/payment",
      },
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
