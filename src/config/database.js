const { Pool } = require("pg");
const { getDbSecrets } = require("./secrets");

let pool;

function getPool() {
  if (!pool) {
    const { user, password } = getDbSecrets();

    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_NAME,
      user,
      password,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    pool.on("connect", () => {
      console.log("✓ Database connected successfully");
    });

    pool.on("error", (err) => {
      console.error("Unexpected database error:", err);
      process.exit(1);
    });
  }

  return pool;
}

const query = async (text, params) => {
  const start = Date.now();
  const pool = getPool();

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

const transaction = async (callback) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getPool,
  query,
  transaction,
};
