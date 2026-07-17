// Defines email-related API routes.
const express = require("express");
const { sendAppointmentEmail } = require("../controllers/emailController");

const router = express.Router();

router.post("/send-email", sendAppointmentEmail);

module.exports = router;
