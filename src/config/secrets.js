const fs = require("fs");

function readSecret(path) {
  return fs.readFileSync(path, "utf8").trim();
}

function getDbSecrets() {
  return {
    user: readSecret("/mnt/secrets-store/DB_USER"),
    password: readSecret("/mnt/secrets-store/DB_PASSWORD"),
  };
}

module.exports = { getDbSecrets };
