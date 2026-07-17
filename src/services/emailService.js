// Builds professional appointment emails and sends them through Nodemailer.
const transporter = require("../config/smtp");
const env = require("../config/env");

function formatDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildAppointmentEmail(payload) {
  const patientName = escapeHtml(payload.patientName);
  const appointmentDate = escapeHtml(formatDate(payload.appointmentDate));
  const appointmentTime = escapeHtml(payload.appointmentTime);
  const clinicName = "DentaCare Clinic";
  const contactPhone = "+27 456 7890";
  const contactEmail = "info@dentacareclinic.com";
  const clinicAddress = "123 Dental Street, Smile City";

  const text = [
    `Hello ${payload.patientName},`,
    "",
    `Your appointment at ${clinicName} has been confirmed.`,
    `Date: ${formatDate(payload.appointmentDate)}`,
    `Time: ${payload.appointmentTime}`,
    "",
    "Contact information:",
    `Phone: ${contactPhone}`,
    `Email: ${contactEmail}`,
    `Address: ${clinicAddress}`,
    "",
    "Thank you for choosing DentaCare Clinic.",
  ].join("\n");

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Appointment Confirmation</title>
      </head>
      <body style="margin:0;background:#f6f2ff;font-family:Arial,sans-serif;color:#21156d;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f2ff;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #ded8fb;">
                <tr>
                  <td style="background:#5a46d6;padding:28px 24px;text-align:center;color:#ffffff;">
                    <div style="display:inline-block;width:72px;height:72px;line-height:72px;border-radius:18px;background:#ffffff;color:#5a46d6;font-size:28px;font-weight:800;">DC</div>
                    <h1 style="margin:18px 0 0;font-size:26px;line-height:1.2;">Appointment Confirmed</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 28px;">
                    <p style="margin:0 0 18px;font-size:17px;">Hello <strong>${patientName}</strong>,</p>
                    <p style="margin:0 0 22px;line-height:1.6;">Your appointment at <strong>${clinicName}</strong> has been confirmed. Please keep the details below for your visit.</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 12px;">
                      <tr>
                        <td style="padding:16px;border-radius:12px;background:#f8f6ff;border:1px solid #e4def8;">
                          <span style="display:block;color:#786fd0;font-size:12px;font-weight:700;text-transform:uppercase;">Date</span>
                          <strong style="display:block;margin-top:6px;font-size:18px;color:#21156d;">${appointmentDate}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px;border-radius:12px;background:#f8f6ff;border:1px solid #e4def8;">
                          <span style="display:block;color:#786fd0;font-size:12px;font-weight:700;text-transform:uppercase;">Time</span>
                          <strong style="display:block;margin-top:6px;font-size:18px;color:#21156d;">${appointmentTime}</strong>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top:24px;padding:18px;border-radius:14px;background:#eefaf4;border:1px solid #bce8cd;">
                      <h2 style="margin:0 0 10px;font-size:18px;color:#1f7a28;">Clinic Information</h2>
                      <p style="margin:0;line-height:1.6;">
                        ${clinicName}<br>
                        Phone: <a href="tel:${contactPhone}" style="color:#5a46d6;">${contactPhone}</a><br>
                        Email: <a href="mailto:${contactEmail}" style="color:#5a46d6;">${contactEmail}</a><br>
                        ${clinicAddress}
                      </p>
                    </div>
                    <p style="margin:24px 0 0;color:#5f5a7b;line-height:1.6;">Thank you for choosing DentaCare Clinic. We look forward to seeing you.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { text, html };
}

async function sendAppointmentConfirmation(payload) {
  const email = buildAppointmentEmail(payload);

  return transporter.sendMail({
    from: env.smtp.from,
    to: payload.to,
    subject: payload.subject,
    text: email.text,
    html: email.html,
  });
}

module.exports = {
  sendAppointmentConfirmation,
};
