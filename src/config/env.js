// Loads and validates environment variables used by the SMTP transport.
require("dotenv").config();

const requiredVariables = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];

const missingVariables = requiredVariables.filter((key) => !process.env[key]);

if (missingVariables.length) {
  console.warn(`Missing SMTP environment variables: ${missingVariables.join(", ")}`);
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },
};
