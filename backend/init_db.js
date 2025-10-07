const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  user: process.env.DB_USER || "user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "ip_to_location",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

async function initializeDatabase() {
  try {
    const client = await pool.connect();
    const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql")).toString();
    await client.query(schemaSql);
    console.log("Database schema initialized successfully.");
    client.release();
  } catch (err) {
    console.error("Error initializing database schema:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();

