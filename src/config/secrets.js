const fs = require("fs");

function readSecret(path) {
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch (err) {
    throw new Error(`Missing secret file: ${path}`);
  }
}

const DB_USER = readSecret("/mnt/secrets-store/DB_USER");

const DB_PASSWORD = readSecret("/mnt/secrets-store/DB_PASSWORD");

module.exports = {
  DB_USER,
  DB_PASSWORD,
};
