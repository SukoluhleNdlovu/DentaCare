// Handles request validation and HTTP responses for appointment emails.
const emailService = require("../services/emailService");
const validateAppointmentEmail = require("../middleware/validateAppointmentEmail");

async function sendAppointmentEmail(req, res, next) {
  try {
    const validation = validateAppointmentEmail(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body.",
        errors: validation.errors,
      });
    }

    const result = await emailService.sendAppointmentConfirmation(req.body);

    console.log(`Appointment email sent to ${req.body.to}. Message ID: ${result.messageId}`);

    return res.status(200).json({
      success: true,
      message: "Appointment confirmation email sent.",
      messageId: result.messageId,
    });
  }
  catch (error) {
    console.error("SMTP email send failed:", error);
    error.statusCode = 500;
    return next(error);
  }
}

module.exports = {
  sendAppointmentEmail,
};
