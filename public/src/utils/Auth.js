const crypto = require("crypto");

const iterations = 10000;
const keylen = 32;
const digest = "sha256";

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return Buffer.concat([salt, hash]).toString("base64");
}

function verifyPassword(storedBase64, passwordAttempt) {
  const storedBuffer = Buffer.from(storedBase64, "base64");
  const salt = storedBuffer.slice(0, 16);
  const storedHash = storedBuffer.slice(16);

  const hashAttempt = crypto.pbkdf2Sync(
    passwordAttempt,
    salt,
    iterations,
    keylen,
    digest
  );

  return crypto.timingSafeEqual(storedHash, hashAttempt);
}

module.exports = { hashPassword, verifyPassword };
