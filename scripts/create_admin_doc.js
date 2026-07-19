// Usage:
// node scripts/create_admin_doc.js <email> [role] [status]
//
// Example:
// node scripts/create_admin_doc.js admin@dentacare.co.za admin true

const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Make sure GOOGLE_APPLICATION_CREDENTIALS points to your service account JSON
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("ERROR: GOOGLE_APPLICATION_CREDENTIALS is not set.");
    process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

// Initialize Firestore
const db = getFirestore();

async function main() {

    const email = process.argv[2];
    const role = process.argv[3] || "admin";
    const statusArg = process.argv[4] || "true";

    const status =
        statusArg === "true" ||
        statusArg.toLowerCase() === "active";

    if (!email) {

        console.log("Usage:");
        console.log("node scripts/create_admin_doc.js <email> [role] [status]");
        process.exit(1);

    }

    try {

        // Find user in Firebase Authentication
        const user = await admin.auth().getUserByEmail(email);

        console.log("User found:");
        console.log("UID:", user.uid);
        console.log("Email:", user.email);

        const adminRef = db.collection("admins").doc(user.uid);

        const existing = await adminRef.get();

        if (existing.exists) {

            console.log("Admin document already exists.");
            console.log(existing.data());

            process.exit(0);

        }

        await adminRef.set({

            fullName: user.displayName || "System Administrator",

            email: user.email,

            phone: user.phoneNumber || "",

            role: role.toLowerCase(),

            status: status,

            profileImage: "",

            createdAt: FieldValue.serverTimestamp(),

            lastLogin: null

        });

        console.log("--------------------------------");
        console.log("Admin document created!");
        console.log("Firestore Path:");
        console.log(`admins/${user.uid}`);
        console.log("--------------------------------");

    }

    catch (error) {

        console.error("ERROR:");
        console.error(error);

    }

}

main();