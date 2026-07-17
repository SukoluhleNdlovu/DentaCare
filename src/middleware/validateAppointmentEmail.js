// Validates the POST /api/send-email request body before SMTP is attempted.
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateAppointmentEmail(body) {
  const errors = [];
  const requiredFields = ["to", "subject", "patientName", "appointmentDate", "appointmentTime"];

  requiredFields.forEach((field) => {
    if (!isNonEmptyString(body[field])) {
      errors.push(`${field} is required.`);
    }
  });

  if (body.to && !isValidEmail(body.to)) {
    errors.push("to must be a valid email address.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = validateAppointmentEmail;
