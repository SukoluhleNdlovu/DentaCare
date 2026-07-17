# DentaCare Email API Setup

This project includes a local/deployable Express + Nodemailer API for appointment confirmation emails. It does not require Firebase Cloud Functions or Firebase paid extensions.

## Install Packages

Run this in the project root:

```bash
npm install
```

This installs:

```bash
npm install express cors dotenv nodemailer
npm install --save-dev nodemon
```

## Configure Environment Variables

Create a `.env` file in the project root using `.env.example`:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="DentaCare Clinic <no-reply@yourdomain.com>"
PORT=3000
```

Never commit `.env`. It is already ignored by `.gitignore`.

## Run Locally

Development mode:

```bash
npm run dev
```

Production-style local run:

```bash
npm start
```

Health check:

```bash
http://localhost:3000/health
```

Email endpoint:

```http
POST http://localhost:3000/api/send-email
Content-Type: application/json
```

Request body:

```json
{
  "to": "patient@example.com",
  "subject": "Appointment Confirmation",
  "patientName": "John Doe",
  "appointmentDate": "2026-07-15",
  "appointmentTime": "14:30"
}
```

## Firebase Frontend Fetch Example

After a booking is saved in Firestore, call the API:

```js
async function sendAppointmentEmail(user, booking) {
  const response = await fetch("http://localhost:3000/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: user.email,
      subject: "Appointment Confirmation",
      patientName: user.displayName || "Patient",
      appointmentDate: booking.appointmentDate,
      appointmentTime: booking.appointmentTime
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Email request failed.");
  }

  return response.json();
}
```

The current `auth.js` already calls this API after `bookings` is successfully written to Firestore.

For deployment later, replace the frontend API base URL:

```html
<script>
  window.DENTACARE_EMAIL_API_URL = "https://your-deployed-api.example.com";
</script>
<script src="auth.js"></script>
```

Keep the local default as `http://localhost:3000` during development.
