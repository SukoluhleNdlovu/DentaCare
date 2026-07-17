// Configures middleware, routes, health checks, and shared error handling.
const express = require("express");
const cors = require("cors");
const emailRoutes = require("./routes/emailRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "dentacare-email-api" });
});

app.use("/api", emailRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
