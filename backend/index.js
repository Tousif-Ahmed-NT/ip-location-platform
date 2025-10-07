const express = require("express");
const { Pool } = require("pg");
const geolocationService = require("./services/geolocationService");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || "user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "ip_to_location",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173", // Allow frontend origin
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  keyGenerator: (req) => {
    // Use API key for rate limiting if available, otherwise fall back to IP
    return req.headers["authorization"] || req.ip;
  },
});

// API Key Authentication Middleware (simplified for demonstration)
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers["authorization"];
  // In a real application, you would validate this API key against a database
  // For now, a simple check for a predefined key
  if (process.env.API_KEY && apiKey === `Bearer ${process.env.API_KEY}`) {
    next();
  } else if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. API authentication is disabled.");
    next(); // Allow access if API_KEY is not set (for development ease)
  } else {
    res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }
};

// Fraud/VPN Detection Placeholder
const fraudDetection = async (req, res, next) => {
  const ipAddress = req.params.ipAddress || req.ip;
  // In a real scenario, this would involve checking against cloud ASN lists, known proxy/VPN databases.
  // For demonstration, we'll just log it.
  console.log(`Performing fraud/VPN detection for IP: ${ipAddress}`);
  // You would typically call an external service or a local database lookup here.
  // Example: const isFraudulent = await fraudDetectionService.check(ipAddress);
  // if (isFraudulent) return res.status(403).json({ error: "Access denied: VPN/Proxy detected" });
  next();
};

app.get("/", (req, res) => {
  res.send("IP-to-Location Backend is running!");
});

// Apply rate limiting and authentication to API routes
app.use("/api", apiLimiter, authenticateApiKey);

// API endpoint for IP geolocation
app.get("/api/v1/ip-lookup/:ipAddress?", fraudDetection, async (req, res) => {
  const ipAddress = req.params.ipAddress || req.ip; // Use provided IP or request IP
  try {
    const location = await geolocationService.getGeolocation(ipAddress);
    res.json(location);
  } catch (error) {
    console.error("Error in IP lookup:", error);
    res.status(500).json({ error: "Failed to retrieve geolocation for IP" });
  }
});

// Example API endpoint to test DB connection
app.get("/test-db", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    res.json({ message: "Database connected successfully!", time: result.rows[0].now });
  } catch (err) {
    console.error("Database connection error", err);
    res.status(500).json({ error: "Database connection failed", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});

