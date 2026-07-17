// Starts the Express app and centralizes process-level error logging.
const app = require("./app");
const env = require("./config/env");

const server = app.listen(env.port, () => {
  console.log(`DentaCare email API running on http://localhost:${env.port}`);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing HTTP server.");
  server.close(() => process.exit(0));
});
