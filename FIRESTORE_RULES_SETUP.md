# Firestore Rules Setup

The browser error `FirebaseError: Missing or insufficient permissions` means Firestore security rules are blocking the signed-in user from reading/writing `users` or `bookings`.

Use the rules in `firestore.rules`.

## Firebase Console Steps

1. Open Firebase Console.
2. Go to your project.
3. Open Firestore Database.
4. Open the Rules tab.
5. Replace the current rules with the contents of `firestore.rules`.
6. Click Publish.

These rules allow:

- A signed-in user to create/read/update only their own `users/{uid}` document.
- A signed-in user to create bookings only when `userId` equals their Firebase Auth UID.
- A signed-in user to read/update/delete only their own bookings.

They do not allow public reads or writes.

## Important Local Development Note

Open the site through an HTTP server, not directly as a `file:///` URL. The console warning in your screenshot says the browser is loading `dashboard.html` from `file:///...`, which can cause browser security issues.

Run the email API:

```bash
npm run dev
```

Then open your frontend through a local web server such as Live Server in VS Code, or another local static server, for example:

```bash
npx http-server . -p 5500
```

Then visit:

```text
http://localhost:5500/dashboard.html
```
