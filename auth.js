// =========================
// FIREBASE CONFIGURATION
// =========================

const defaultFirebaseConfig = {
    apiKey: "AIzaSyCkm0gUQtHKcZluqp6voNw3R4cjQU1gJmQ",
    authDomain: "dentacare-d6b8d.firebaseapp.com",
    projectId: "dentacare-d6b8d",
    storageBucket: "dentacare-d6b8d.firebasestorage.app",
    messagingSenderId: "540344009622",
    appId: "1:540344009622:web:7d84e96f542952cafa53b7",
    measurementId: "G-KBGRW2Q812"
};

const firebaseConfig = window.DENTACARE_FIREBASE_CONFIG || defaultFirebaseConfig;
const DENTACARE_EMAIL_API_URL = window.DENTACARE_EMAIL_API_URL || "http://localhost:3000";
const hasFirebaseConfig = Boolean(
    firebaseConfig &&
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !String(firebaseConfig.apiKey).includes("YOUR_") &&
    !String(firebaseConfig.apiKey).includes("example")
);

var auth = null;
var db = null;
var currentDashboardUser = null;
var currentProfileData = {};
var currentBookings = [];
var isProfileLoaded = false;

if (typeof firebase === "undefined") {
    console.warn("Firebase SDK scripts must be loaded before auth.js. Auth features will remain disabled until a valid config is provided.");
}
else if (!hasFirebaseConfig) {
    console.warn("Firebase is not configured with a valid API key. Auth features are disabled in local mode.");
}
else {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        auth = firebase.auth();
        db = firebase.firestore ? firebase.firestore() : null;
    }
    catch (error) {
        console.warn("Firebase could not be initialized. Continuing in local mode.", error);
    }
}

initPasswordToggles();
initPasswordStrength();

if (auth) {
    initRegisterPage();
    initLoginPage();
    initForgotPasswordPage();
    initDashboardPage();
}


// =========================
// SHARED HELPERS
// =========================

function getValue(id) {
    const input = document.getElementById(id);
    return input ? input.value.trim() : "";
}

function setText(id, text) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = text;
    }
}

function setError(id, message) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = message || "";
    }
}

function setMessage(id, message, isError) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent = message || "";
    element.classList.toggle("auth-message-error", Boolean(isError));
    element.classList.toggle("auth-message-success", !isError && Boolean(message));
}

function setLoading(form, isLoading) {
    const button = form.querySelector(".auth-submit");

    if (button) {
        button.disabled = isLoading;
        button.classList.toggle("is-loading", isLoading);
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getFirstName(fullName) {
    const name = (fullName || "").trim();
    return name ? name.split(/\s+/)[0] : "Patient";
}

function getInitials(fullName) {
    const names = (fullName || "Patient")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
    }

    return names[0] ? names[0][0].toUpperCase() : "P";
}

function initPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach(function(button) {
        button.addEventListener("click", function() {
            const input = button.parentElement.querySelector("input");

            if (!input) {
                return;
            }

            const shouldShow = input.type === "password";
            input.type = shouldShow ? "text" : "password";
            button.textContent = shouldShow ? "Hide" : "Show";
            button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
        });
    });
}

function getPasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) {
        score += 1;
    }

    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
        score += 1;
    }

    if (/\d/.test(password)) {
        score += 1;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
        score += 1;
    }

    return score;
}

function initPasswordStrength() {
    const input = document.getElementById("registerPassword");
    const meter = document.querySelector(".password-strength span");
    const text = document.getElementById("passwordStrengthText");

    if (!input || !meter || !text) {
        return;
    }

    function updateStrength() {
        const password = input.value;
        const score = getPasswordStrength(password);
        const labels = [
            "Use at least 8 characters with a number.",
            "Weak password",
            "Fair password",
            "Good password",
            "Strong password"
        ];

        meter.parentElement.dataset.strength = String(score);
        meter.style.width = password ? `${Math.max(score, 1) * 25}%` : "0";
        text.textContent = password ? labels[score] : labels[0];
        text.classList.toggle("is-strong", score === 4);
    }

    input.addEventListener("input", updateStrength);
    updateStrength();
}

function showRegisterSuccessModal() {
    const modal = document.getElementById("registerSuccessModal");

    if (!modal) {
        return;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}

function getFirebaseErrorMessage(error) {
    const messages = {
        "auth/email-already-in-use": "An account already exists with this email.",
        "auth/invalid-email": "Enter a valid email address.",
        "auth/user-not-found": "No account was found for this email.",
        "auth/wrong-password": "The password is incorrect.",
        "auth/invalid-login-credentials": "The email or password is incorrect.",
        "auth/weak-password": "Use a stronger password with at least 6 characters.",
        "auth/network-request-failed": "Network error. Check your connection and try again."
    };

    return messages[error.code] || error.message || "Something went wrong. Please try again.";
}

function isFirestorePermissionError(error) {
    return error && (
        error.code === "permission-denied" ||
        /Missing or insufficient permissions/i.test(error.message || "")
    );
}


// =========================
// REGISTER
// =========================

function initRegisterPage() {
    const form = document.getElementById("registerForm");
    let isCreatingAccount = false;

    if (!form) {
        return;
    }

    auth.onAuthStateChanged(function(user) {
        if (user && !isCreatingAccount) {
            window.location.href = "dashboard.html";
        }
    });

    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const firstName = getValue("firstName");
        const lastName = getValue("lastName");
        const email = getValue("registerEmail");
        const phone = getValue("registerPhone");
        const dateOfBirth = getValue("dateOfBirth");
        const password = getValue("registerPassword");
        const confirmPassword = getValue("confirmPassword");
        const fullName = `${firstName} ${lastName}`.trim();

        let hasError = false;

        setError("firstNameError", "");
        setError("lastNameError", "");
        setError("registerEmailError", "");
        setError("registerPhoneError", "");
        setError("dateOfBirthError", "");
        setError("registerPasswordError", "");
        setError("confirmPasswordError", "");
        setMessage("registerMessage", "", false);

        if (!firstName) {
            setError("firstNameError", "First name is required.");
            hasError = true;
        }

        if (!lastName) {
            setError("lastNameError", "Last name is required.");
            hasError = true;
        }

        if (!isValidEmail(email)) {
            setError("registerEmailError", "Enter a valid email address.");
            hasError = true;
        }

        if (!phone) {
            setError("registerPhoneError", "Phone number is required.");
            hasError = true;
        }

        if (!dateOfBirth) {
            setError("dateOfBirthError", "Date of birth is required.");
            hasError = true;
        }

        if (password.length < 8) {
            setError("registerPasswordError", "Password must be at least 8 characters.");
            hasError = true;
        }

        if (password !== confirmPassword) {
            setError("confirmPasswordError", "Passwords do not match.");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        if (!db) {
            setMessage("registerMessage", "Firestore is not loaded. Please check the page scripts.", true);
            return;
        }

        isCreatingAccount = true;
        setLoading(form, true);

        auth.createUserWithEmailAndPassword(email, password)
            .then(function(credential) {
                const user = credential.user;

                return user.updateProfile({
                    displayName: fullName
                }).then(function() {
                    return db.collection("users").doc(user.uid).set({
                        uid: user.uid,
                        firstName: firstName,
                        lastName: lastName,
                        fullName: fullName,
                        email: email,
                        phone: phone,
                        dateOfBirth: dateOfBirth,
                        role: "Patient",
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            })
            .then(function() {
                showRegisterSuccessModal();
                setMessage("registerMessage", "Account created successfully. Redirecting to login.", false);

                return auth.signOut().catch(function() {
                    return null;
                });
            })
            .then(function() {
                setTimeout(function() {
                    window.location.href = "login.html";
                }, 1800);
            })
            .catch(function(error) {
                isCreatingAccount = false;
                setMessage("registerMessage", getFirebaseErrorMessage(error), true);
            })
            .finally(function() {
                setLoading(form, false);
            });
    });
}


// =========================
// LOGIN
// =========================

function initLoginPage() {
    const form = document.getElementById("loginForm");

    if (!form) {
        return;
    }

    auth.onAuthStateChanged(function(user) {
        if (user) {
            window.location.href = "dashboard.html";
        }
    });

    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const email = getValue("loginEmail");
        const password = getValue("loginPassword");
        const remember = Boolean(form.querySelector("input[name='remember']:checked"));

        let hasError = false;

        setError("loginEmailError", "");
        setError("loginPasswordError", "");
        setMessage("loginMessage", "", false);

        if (!isValidEmail(email)) {
            setError("loginEmailError", "Enter a valid email address.");
            hasError = true;
        }

        if (!password) {
            setError("loginPasswordError", "Password is required.");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        setLoading(form, true);

        auth.setPersistence(
            remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
        )
            .then(function() {
                return auth.signInWithEmailAndPassword(email, password);
            })
            .then(function() {
                window.location.href = "dashboard.html";
            })
            .catch(function(error) {
                setMessage("loginMessage", getFirebaseErrorMessage(error), true);
            })
            .finally(function() {
                setLoading(form, false);
            });
    });
}


// =========================
// FORGOT PASSWORD
// =========================

function initForgotPasswordPage() {
    const form = document.getElementById("forgotForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const email = getValue("forgotEmail");

        setError("forgotEmailError", "");
        setMessage("forgotMessage", "", false);

        if (!isValidEmail(email)) {
            setError("forgotEmailError", "Enter a valid email address.");
            return;
        }

        setLoading(form, true);

        auth.sendPasswordResetEmail(email)
            .then(function() {
                setMessage("forgotMessage", "Password reset email sent. Check your inbox.", false);
            })
            .catch(function(error) {
                setMessage("forgotMessage", getFirebaseErrorMessage(error), true);
            })
            .finally(function() {
                setLoading(form, false);
            });
    });
}


// =========================
// DASHBOARD
// =========================

function initDashboardPage() {
    const dashboard = document.querySelector(".dashboard-container");

    if (!dashboard) {
        return;
    }

    auth.onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        currentDashboardUser = user;
        loadDashboardUser(user);
        loadUserBookings(user);
    });

    initLogout();
    initQuickActions();
    initAppointmentButtons();
    initDashboardButtons();
    initBookingFlow();
    initProfileView();
    initSettingsView();
    initHistoryView();
    initAccessibilityView();
    initThemeMode();
}

function loadDashboardUser(user) {
    setProfileLoaded(false, "Loading profile information...");

    if (!db) {
        const fallbackName = user.displayName || user.email || "Patient";
        currentProfileData = {
            fullName: fallbackName,
            email: user.email || ""
        };
        updateDashboardName(fallbackName);
        populateProfileView(currentProfileData, user);
        populateSettingsView(currentProfileData.settings || {}, currentProfileData);
        populateAccessibilityView(currentProfileData.accessibility || {});
        setProfileLoaded(true, "Profile loaded from your account.");
        return;
    }

    db.collection("users").doc(user.uid).get()
        .then(function(doc) {
            if (!doc.exists) {
                const fallbackName = user.displayName || user.email || "Patient";
                currentProfileData = {
                    fullName: fallbackName,
                    email: user.email || ""
                };
                updateDashboardName(fallbackName);
                populateProfileView(currentProfileData, user);
                populateSettingsView(currentProfileData.settings || {}, currentProfileData);
                populateAccessibilityView(currentProfileData.accessibility || {});
                setProfileLoaded(true, "Profile document was not found, but account information is ready.");
                return;
            }

            const profile = doc.data();
            const fullName = profile.fullName ||
                `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
                user.displayName ||
                user.email ||
                "Patient";

            currentProfileData = Object.assign({}, profile, {
                email: profile.email || user.email || "",
                fullName: fullName
            });
            updateDashboardName(fullName);
            populateProfileView(currentProfileData, user);
            populateSettingsView(currentProfileData.settings || {}, currentProfileData);
            populateAccessibilityView(currentProfileData.accessibility || {});
            setProfileLoaded(true, "");
        })
        .catch(function(error) {
            console.error("Could not load user profile:", error);
            if (isFirestorePermissionError(error)) {
                console.warn("Firestore rules are blocking the user profile read. Publish the rules in firestore.rules.");
            }
            const fallbackName = user.displayName || user.email || "Patient";
            currentProfileData = {
                fullName: fallbackName,
                email: user.email || ""
            };
            updateDashboardName(fallbackName);
            populateProfileView(currentProfileData, user);
            populateSettingsView(currentProfileData.settings || {}, currentProfileData);
            populateAccessibilityView(currentProfileData.accessibility || {});
            setProfileLoaded(false, "Profile information could not load from Firestore. Publish the Firestore rules before editing.");
        });
}

function updateDashboardName(fullName) {
    const displayName = (fullName || "Patient").trim();
    const firstName = getFirstName(displayName);
    const circle = document.querySelector(".profile-circle");

    setText("userName", displayName);
    setText("welcomeName", firstName);

    if (circle) {
        circle.textContent = getInitials(displayName);
    }
}

function setProfileField(id, value) {
    const field = document.getElementById(id);

    if (field) {
        field.value = value || "";
    }
}

function setProfileText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value || "";
    }
}

function setProfileLoaded(isLoaded, message) {
    const editButton = document.getElementById("editProfileBtn");

    isProfileLoaded = Boolean(isLoaded);

    if (editButton) {
        editButton.disabled = !isProfileLoaded;
        editButton.classList.toggle("is-disabled", !isProfileLoaded);
    }

    if (typeof message === "string") {
        setText("profileMessage", message);
    }
}

function readProfileValue(profile, flatKey, groupKey) {
    if (profile[flatKey]) {
        return profile[flatKey];
    }

    if (groupKey && profile[groupKey] && profile[groupKey][flatKey]) {
        return profile[groupKey][flatKey];
    }

    return "";
}

function populateProfileView(profile, user) {
    profile = profile || {};
    user = user || {};

    const fullName = profile.fullName ||
        `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
        user.displayName ||
        "Patient";
    const city = readProfileValue(profile, "city", "personalInfo");
    const state = readProfileValue(profile, "state", "personalInfo");
    const location = [city, state].filter(Boolean).join(", ") || "Location not set";
    const memberYear = profile.createdAt && profile.createdAt.toDate
        ? profile.createdAt.toDate().getFullYear()
        : new Date().getFullYear();

    setProfileText("profileHeaderName", fullName);
    setProfileText("profileHeaderEmail", profile.email || user.email || "Email not set");
    setProfileText("profileHeaderPhone", readProfileValue(profile, "phone", "personalInfo") || "Phone not set");
    setProfileText("profileHeaderLocation", location);
    setProfileText("profileAvatar", getInitials(fullName));
    const avatar = document.getElementById("profileAvatar");

    if (avatar) {
        if (profile.photoDataUrl) {
            avatar.style.backgroundImage = `url("${profile.photoDataUrl}")`;
            avatar.textContent = "";
        }
        else {
            avatar.style.backgroundImage = "";
            avatar.textContent = getInitials(fullName);
        }
    }

    setProfileText("profileMemberSince", String(memberYear));
    setProfileText("profilePatientId", `#BDC${(user.uid || "000000").slice(0, 6).toUpperCase()}`);

    setProfileField("profileFirstName", readProfileValue(profile, "firstName", "personalInfo") || getFirstName(fullName));
    setProfileField("profileLastName", readProfileValue(profile, "lastName", "personalInfo") || "");
    setProfileField("profileEmail", profile.email || user.email || "");
    setProfileField("profilePhone", readProfileValue(profile, "phone", "personalInfo"));
    setProfileField("profileDateOfBirth", readProfileValue(profile, "dateOfBirth", "personalInfo"));
    setProfileField("profileGender", readProfileValue(profile, "gender", "personalInfo"));
    setProfileField("profileStreet", readProfileValue(profile, "street", "personalInfo"));
    setProfileField("profileCity", city);
    setProfileField("profileState", state);
    setProfileField("profileZip", readProfileValue(profile, "zipCode", "personalInfo"));
    setProfileField("profileContactMethod", readProfileValue(profile, "preferredContactMethod", "personalInfo") || "Email");
    setProfileField("profileAllergies", readProfileValue(profile, "allergies", "medicalHistory"));
    setProfileField("profileMedication", readProfileValue(profile, "medication", "medicalHistory"));
    setProfileField("profileConditions", readProfileValue(profile, "conditions", "medicalHistory"));
    setProfileField("profileDentalConcerns", readProfileValue(profile, "dentalConcerns", "medicalHistory"));
    setProfileField("profileInsuranceProvider", readProfileValue(profile, "insuranceProvider", "insurance"));
    setProfileField("profilePolicyNumber", readProfileValue(profile, "policyNumber", "insurance"));
    setProfileField("profileGroupNumber", readProfileValue(profile, "groupNumber", "insurance"));
    setProfileField("profilePrimaryHolder", readProfileValue(profile, "primaryHolder", "insurance"));
}

function formatBookingDate(dateValue) {
    if (!dateValue) {
        return "Date pending";
    }

    const date = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function getBookingDataFromDoc(doc) {
    const data = doc.data ? doc.data() : doc;

    return Object.assign({
        id: doc.id || "",
        service: "Teeth Cleaning",
        dentist: "Dr. Sarah Johnson",
        appointmentDate: "",
        appointmentTime: "",
        duration: "45 min",
        status: "Pending"
    }, data);
}

function getCreatedAtMillis(booking) {
    if (booking.createdAt && typeof booking.createdAt.toMillis === "function") {
        return booking.createdAt.toMillis();
    }

    return 0;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderBookingList(listId, bookings) {
    const list = document.getElementById(listId);

    if (!list) {
        return;
    }

    if (!bookings.length) {
        list.innerHTML = '<p class="empty-bookings">No bookings yet.</p>';
        return;
    }

    list.innerHTML = bookings.map(function(booking) {
        const status = escapeHtml(booking.status || "Pending");
        const service = escapeHtml(booking.service);
        const date = escapeHtml(formatBookingDate(booking.appointmentDate));
        const time = escapeHtml(booking.appointmentTime);
        const dentist = escapeHtml(booking.dentist);
        const duration = escapeHtml(booking.duration);

        return `
            <article class="booking-list-card">
                <div>
                    <span>${status}</span>
                    <h3>${service}</h3>
                    <p>${date} at ${time}</p>
                </div>
                <div>
                    <small>Dentist</small>
                    <strong>${dentist}</strong>
                    <small>${duration}</small>
                </div>
            </article>
        `;
    }).join("");
}

function updateUpcomingAppointment(bookings) {
    const latest = bookings[0];
    const status = document.querySelector(".appointment-card .status");
    const detailValues = document.querySelectorAll(".appointment-details .detail h4");

    if (!latest) {
        if (status) {
            status.textContent = "No Booking";
        }

        if (detailValues.length >= 4) {
            detailValues[0].textContent = "Not scheduled";
            detailValues[1].textContent = "--";
            detailValues[2].textContent = "--";
            detailValues[3].textContent = "--";
        }

        return;
    }

    if (status) {
        status.textContent = latest.status || "Pending";
    }

    if (detailValues.length >= 4) {
        detailValues[0].textContent = formatBookingDate(latest.appointmentDate);
        detailValues[1].textContent = latest.appointmentTime;
        detailValues[2].textContent = latest.dentist;
        detailValues[3].textContent = latest.service;
    }
}

function renderBookings(bookings) {
    currentBookings = bookings || [];
    window.DentaCareBookings = currentBookings;
    renderBookingList("dashboardBookingsList", bookings);
    renderBookingList("appointmentsBookingsList", bookings);
    renderHistoryBookings();
    updateUpcomingAppointment(bookings);
    setProfileText("profileTotalVisits", String(bookings.length));
    setProfileText(
        "profileNextAppointment",
        bookings[0] ? formatBookingDate(bookings[0].appointmentDate).replace(/, 202\d/, "") : "None"
    );
}

function getBookingDateTime(booking) {
    const dateValue = booking.appointmentDate || "";
    const timeValue = booking.appointmentTime || "00:00";
    const normalizedTime = timeValue.replace(" AM", "").replace(" PM", "");
    const date = new Date(`${dateValue}T${normalizedTime}`);

    if (Number.isNaN(date.getTime())) {
        return new Date(`${dateValue}T00:00:00`);
    }

    if (/PM/.test(timeValue) && date.getHours() < 12) {
        date.setHours(date.getHours() + 12);
    }

    return date;
}

function renderHistoryCard(booking) {
    const status = escapeHtml(booking.status || "Pending");
    const service = escapeHtml(booking.service);
    const dentist = escapeHtml(booking.dentist);
    const date = escapeHtml(formatBookingDate(booking.appointmentDate));
    const time = escapeHtml(booking.appointmentTime || "");
    const duration = escapeHtml(booking.duration || "");

    return `
        <article class="history-card">
            <div>
                <span>${status}</span>
                <h3>${service}</h3>
                <strong>${dentist}</strong>
                <p><i class="fa-regular fa-calendar-days"></i> Date: ${date}${time ? ` at ${time}` : ""}</p>
                ${duration ? `<small>Estimated duration: ${duration}</small>` : ""}
            </div>
            <div class="history-card-actions">
                <button type="button" data-history-action="view">View</button>
                <button type="button" data-history-action="reschedule">Reschedule</button>
                <button type="button" data-history-action="cancel">Cancel</button>
            </div>
        </article>
    `;
}

function renderHistoryBookings() {
    const searchInput = document.getElementById("historySearch");
    const upcomingList = document.getElementById("historyUpcomingList");
    const previousList = document.getElementById("historyPreviousList");
    const upcomingCount = document.getElementById("historyUpcomingCount");
    const previousCount = document.getElementById("historyPreviousCount");

    if (!upcomingList || !previousList) {
        return;
    }

    const query = (searchInput ? searchInput.value : "").toLowerCase();
    const now = new Date();
    const filtered = currentBookings.filter(function(booking) {
        const haystack = `${booking.service} ${booking.dentist} ${booking.appointmentDate} ${booking.appointmentTime}`.toLowerCase();
        return !query || haystack.includes(query);
    });
    const upcoming = filtered.filter(function(booking) {
        return getBookingDateTime(booking) >= now;
    });
    const previous = filtered.filter(function(booking) {
        return getBookingDateTime(booking) < now;
    });

    upcomingList.innerHTML = upcoming.length
        ? upcoming.map(renderHistoryCard).join("")
        : '<p class="empty-bookings">No upcoming appointments.</p>';
    previousList.innerHTML = previous.length
        ? previous.map(renderHistoryCard).join("")
        : '<p class="empty-bookings">No previous bookings.</p>';

    if (upcomingCount) {
        upcomingCount.textContent = `(${upcoming.length})`;
    }
    if (previousCount) {
        previousCount.textContent = `(${previous.length})`;
    }
}

function loadUserBookings(user) {
    if (!db || !user) {
        renderBookings([]);
        return;
    }

    return db.collection("bookings")
        .where("userId", "==", user.uid)
        .get()
        .then(function(snapshot) {
            const bookings = snapshot.docs
                .map(getBookingDataFromDoc)
                .sort(function(a, b) {
                    return getCreatedAtMillis(b) - getCreatedAtMillis(a);
                });
            renderBookings(bookings);
            return bookings;
        })
        .catch(function(error) {
            console.error("Could not load bookings:", error);
            if (isFirestorePermissionError(error)) {
                renderBookingList("dashboardBookingsList", [{
                    status: "Setup Required",
                    service: "Firestore rules are blocking bookings",
                    appointmentDate: "",
                    appointmentTime: "Publish firestore.rules",
                    dentist: "Firebase Console",
                    duration: ""
                }]);
                renderBookingList("appointmentsBookingsList", [{
                    status: "Setup Required",
                    service: "Firestore rules are blocking bookings",
                    appointmentDate: "",
                    appointmentTime: "Publish firestore.rules",
                    dentist: "Firebase Console",
                    duration: ""
                }]);
                updateUpcomingAppointment([]);
                return [];
            }
            renderBookings([]);
            return [];
        });
}


// =========================
// LOGOUT
// =========================

function initLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener("click", function(event) {
        event.preventDefault();

        auth.signOut()
            .then(function() {
                window.location.href = "login.html";
            })
            .catch(function(error) {
                alert(getFirebaseErrorMessage(error));
            });
    });
}


// =========================
// DASHBOARD ACTIONS
// =========================

function initQuickActions() {
    const actionCards = document.querySelectorAll(".action-card");

    if (actionCards.length < 4) {
        return;
    }

    actionCards[0].addEventListener("click", function() {
        showBookingFlow();
    });

    actionCards[1].addEventListener("click", function() {
        showBookingFlow();
    });

    actionCards[2].addEventListener("click", function() {
        showProfileView();
    });

    actionCards[3].addEventListener("click", function() {
        window.location.href = "contact.html";
    });
}

function initAppointmentButtons() {
    const viewBtn = document.querySelector(".view-btn");
    const rescheduleBtn = document.querySelector(".reschedule-btn");
    const cancelBtn = document.querySelector(".cancel-btn");

    if (viewBtn) {
        viewBtn.addEventListener("click", function() {
            showBookingFlow();
        });
    }

    if (rescheduleBtn) {
        rescheduleBtn.addEventListener("click", function() {
            alert("Reschedule feature coming soon.");
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", function() {
            const confirmCancel = confirm("Are you sure you want to cancel this appointment?");

            if (confirmCancel) {
                alert("Appointment cancelled.");
            }
        });
    }
}

function initDashboardButtons() {
    const notificationButton = document.querySelector(".fa-bell");

    if (notificationButton) {
        notificationButton.addEventListener("click", function() {
            alert("No new notifications.");
        });
    }
}

function showBookingFlow() {
    const bookingFlow = document.getElementById("bookingFlow");
    const profileView = document.getElementById("profileView");
    const settingsView = document.getElementById("settingsView");
    const historyView = document.getElementById("historyView");
    const accessibilityView = document.getElementById("accessibilityView");
    const dashboardSections = document.querySelectorAll(".welcome, .appointment-card, .bookings-section, .quick-actions");
    const sidebarItems = document.querySelectorAll(".sidebar-menu li");
    const appointmentsLink = document.getElementById("sidebarAppointments");

    if (!bookingFlow) {
        return;
    }

    dashboardSections.forEach(function(section) {
        section.hidden = true;
    });

    bookingFlow.hidden = false;
    if (profileView) {
        profileView.hidden = true;
    }
    if (settingsView) {
        settingsView.hidden = true;
    }
    if (historyView) {
        historyView.hidden = true;
    }
    if (accessibilityView) {
        accessibilityView.hidden = true;
    }
    sidebarItems.forEach(function(item) {
        item.classList.remove("active");
    });

    if (appointmentsLink && appointmentsLink.parentElement) {
        appointmentsLink.parentElement.classList.add("active");
    }

    bookingFlow.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showDashboardHome() {
    const bookingFlow = document.getElementById("bookingFlow");
    const profileView = document.getElementById("profileView");
    const settingsView = document.getElementById("settingsView");
    const historyView = document.getElementById("historyView");
    const accessibilityView = document.getElementById("accessibilityView");
    const dashboardSections = document.querySelectorAll(".welcome, .appointment-card, .bookings-section, .quick-actions");
    const sidebarItems = document.querySelectorAll(".sidebar-menu li");
    const dashboardLink = document.querySelector("[data-dashboard-link]");

    dashboardSections.forEach(function(section) {
        section.hidden = false;
    });

    if (bookingFlow) {
        bookingFlow.hidden = true;
    }

    if (profileView) {
        profileView.hidden = true;
    }
    if (settingsView) {
        settingsView.hidden = true;
    }
    if (historyView) {
        historyView.hidden = true;
    }
    if (accessibilityView) {
        accessibilityView.hidden = true;
    }

    sidebarItems.forEach(function(item) {
        item.classList.remove("active");
    });

    if (dashboardLink && dashboardLink.parentElement) {
        dashboardLink.parentElement.classList.add("active");
    }
}

function showProfileView() {
    const profileView = document.getElementById("profileView");
    const bookingFlow = document.getElementById("bookingFlow");
    const settingsView = document.getElementById("settingsView");
    const historyView = document.getElementById("historyView");
    const accessibilityView = document.getElementById("accessibilityView");
    const dashboardSections = document.querySelectorAll(".welcome, .appointment-card, .bookings-section, .quick-actions");
    const sidebarItems = document.querySelectorAll(".sidebar-menu li");
    const profileLink = document.getElementById("sidebarProfile");

    if (!profileView) {
        return;
    }

    dashboardSections.forEach(function(section) {
        section.hidden = true;
    });

    if (bookingFlow) {
        bookingFlow.hidden = true;
    }
    if (settingsView) {
        settingsView.hidden = true;
    }
    if (historyView) {
        historyView.hidden = true;
    }
    if (accessibilityView) {
        accessibilityView.hidden = true;
    }

    profileView.hidden = false;
    sidebarItems.forEach(function(item) {
        item.classList.remove("active");
    });

    if (profileLink && profileLink.parentElement) {
        profileLink.parentElement.classList.add("active");
    }

    profileView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showSettingsView() {
    const settingsView = document.getElementById("settingsView");
    const bookingFlow = document.getElementById("bookingFlow");
    const profileView = document.getElementById("profileView");
    const historyView = document.getElementById("historyView");
    const accessibilityView = document.getElementById("accessibilityView");
    const dashboardSections = document.querySelectorAll(".welcome, .appointment-card, .bookings-section, .quick-actions");
    const sidebarItems = document.querySelectorAll(".sidebar-menu li");
    const settingsLink = document.getElementById("sidebarSettings");

    if (!settingsView) {
        return;
    }

    dashboardSections.forEach(function(section) {
        section.hidden = true;
    });

    if (bookingFlow) {
        bookingFlow.hidden = true;
    }
    if (profileView) {
        profileView.hidden = true;
    }
    if (historyView) {
        historyView.hidden = true;
    }
    if (accessibilityView) {
        accessibilityView.hidden = true;
    }

    settingsView.hidden = false;
    sidebarItems.forEach(function(item) {
        item.classList.remove("active");
    });

    if (settingsLink && settingsLink.parentElement) {
        settingsLink.parentElement.classList.add("active");
    }

    settingsView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showHistoryView() {
    const historyView = document.getElementById("historyView");
    const bookingFlow = document.getElementById("bookingFlow");
    const profileView = document.getElementById("profileView");
    const settingsView = document.getElementById("settingsView");
    const accessibilityView = document.getElementById("accessibilityView");
    const dashboardSections = document.querySelectorAll(".welcome, .appointment-card, .bookings-section, .quick-actions");
    const sidebarItems = document.querySelectorAll(".sidebar-menu li");
    const historyLink = document.getElementById("sidebarHistory");

    if (!historyView) {
        return;
    }

    dashboardSections.forEach(function(section) {
        section.hidden = true;
    });

    if (bookingFlow) {
        bookingFlow.hidden = true;
    }
    if (profileView) {
        profileView.hidden = true;
    }
    if (settingsView) {
        settingsView.hidden = true;
    }
    if (accessibilityView) {
        accessibilityView.hidden = true;
    }

    historyView.hidden = false;
    sidebarItems.forEach(function(item) {
        item.classList.remove("active");
    });

    if (historyLink && historyLink.parentElement) {
        historyLink.parentElement.classList.add("active");
    }

    renderHistoryBookings();
    historyView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showAccessibilityView() {
    const accessibilityView = document.getElementById("accessibilityView");
    const bookingFlow = document.getElementById("bookingFlow");
    const profileView = document.getElementById("profileView");
    const settingsView = document.getElementById("settingsView");
    const historyView = document.getElementById("historyView");
    const dashboardSections = document.querySelectorAll(".welcome, .appointment-card, .bookings-section, .quick-actions");
    const sidebarItems = document.querySelectorAll(".sidebar-menu li");
    const accessibilityLink = document.getElementById("sidebarAccessibility");

    if (!accessibilityView) {
        return;
    }

    dashboardSections.forEach(function(section) {
        section.hidden = true;
    });

    if (bookingFlow) {
        bookingFlow.hidden = true;
    }
    if (profileView) {
        profileView.hidden = true;
    }
    if (settingsView) {
        settingsView.hidden = true;
    }
    if (historyView) {
        historyView.hidden = true;
    }

    accessibilityView.hidden = false;
    sidebarItems.forEach(function(item) {
        item.classList.remove("active");
    });

    if (accessibilityLink && accessibilityLink.parentElement) {
        accessibilityLink.parentElement.classList.add("active");
    }

    accessibilityView.scrollIntoView({ behavior: "smooth", block: "start" });
}

window.showBookingFlow = showBookingFlow;
window.showDashboardHome = showDashboardHome;
window.showProfileView = showProfileView;
window.showSettingsView = showSettingsView;
window.showHistoryView = showHistoryView;
window.showAccessibilityView = showAccessibilityView;

function setProfileEditing(isEditing) {
    document.querySelectorAll(".profile-panel input, .profile-panel select, .profile-panel textarea").forEach(function(field) {
        if (field.id !== "profileEmail") {
            field.disabled = !isEditing;
        }
    });

    const actions = document.getElementById("profileActions");
    const editButton = document.getElementById("editProfileBtn");

    if (actions) {
        actions.hidden = !isEditing;
    }

    if (editButton) {
        editButton.hidden = isEditing;
    }

    setText("profileMessage", "");
}

function collectProfileFormData(user) {
    const firstName = getValue("profileFirstName");
    const lastName = getValue("profileLastName");
    const fullName = `${firstName} ${lastName}`.trim() || user.displayName || "Patient";
    const personalInfo = {
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        email: getValue("profileEmail") || user.email || "",
        phone: getValue("profilePhone"),
        dateOfBirth: getValue("profileDateOfBirth"),
        gender: getValue("profileGender"),
        street: getValue("profileStreet"),
        city: getValue("profileCity"),
        state: getValue("profileState"),
        zipCode: getValue("profileZip"),
        preferredContactMethod: getValue("profileContactMethod")
    };
    const medicalHistory = {
        allergies: getValue("profileAllergies"),
        medication: getValue("profileMedication"),
        conditions: getValue("profileConditions"),
        dentalConcerns: getValue("profileDentalConcerns")
    };
    const insurance = {
        insuranceProvider: getValue("profileInsuranceProvider"),
        policyNumber: getValue("profilePolicyNumber"),
        groupNumber: getValue("profileGroupNumber"),
        primaryHolder: getValue("profilePrimaryHolder")
    };

    return Object.assign({}, personalInfo, medicalHistory, insurance, {
        personalInfo: personalInfo,
        medicalHistory: medicalHistory,
        insurance: insurance,
        photoDataUrl: currentProfileData.photoDataUrl || "",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function initProfileView() {
    const profileLink = document.getElementById("sidebarProfile");
    const editButton = document.getElementById("editProfileBtn");
    const cancelButton = document.getElementById("cancelProfileBtn");
    const saveButton = document.getElementById("saveProfileBtn");
    const resetButton = document.getElementById("sendPasswordResetBtn");
    const cameraButton = document.querySelector(".profile-camera");

    profileLink && profileLink.addEventListener("click", function(event) {
        event.preventDefault();
        showProfileView();
    });

    document.querySelectorAll("[data-profile-tab]").forEach(function(tab) {
        tab.addEventListener("click", function() {
            const target = tab.dataset.profileTab;

            document.querySelectorAll("[data-profile-tab]").forEach(function(item) {
                item.classList.toggle("is-active", item === tab);
            });

            document.querySelectorAll("[data-profile-panel]").forEach(function(panel) {
                panel.classList.toggle("is-active", panel.dataset.profilePanel === target);
            });
        });
    });

    editButton && editButton.addEventListener("click", function() {
        if (!isProfileLoaded) {
            setText("profileMessage", "Please wait for your Firestore profile information to load before editing.");
            return;
        }

        setProfileEditing(true);
    });

    cancelButton && cancelButton.addEventListener("click", function() {
        populateProfileView(currentProfileData, currentDashboardUser || auth.currentUser);
        setProfileEditing(false);
    });

    saveButton && saveButton.addEventListener("click", function() {
        const user = currentDashboardUser || auth.currentUser;

        if (!db || !user) {
            setText("profileMessage", "Profile cannot be saved until you are signed in.");
            return;
        }

        if (!isProfileLoaded) {
            setText("profileMessage", "Profile information is still loading. Please wait before saving.");
            return;
        }

        const profileData = collectProfileFormData(user);
        saveButton.disabled = true;
        setText("profileMessage", "Saving profile...");

        user.updateProfile({ displayName: profileData.fullName })
            .then(function() {
                return db.collection("users").doc(user.uid).set(profileData, { merge: true });
            })
            .then(function() {
                currentProfileData = Object.assign({}, currentProfileData, profileData);
                updateDashboardName(profileData.fullName);
                populateProfileView(currentProfileData, user);
                setProfileEditing(false);
                setText("profileMessage", "Profile saved successfully.");
            })
            .catch(function(error) {
                console.error("Could not save profile:", error);
                setText(
                    "profileMessage",
                    isFirestorePermissionError(error)
                        ? "Profile could not be saved because Firestore rules are blocking updates."
                        : "Profile could not be saved. Please try again."
                );
            })
            .finally(function() {
                saveButton.disabled = false;
            });
    });

    resetButton && resetButton.addEventListener("click", function() {
        const user = currentDashboardUser || auth.currentUser;

        if (!user || !user.email) {
            setText("profileMessage", "No email address is available for this account.");
            return;
        }

        auth.sendPasswordResetEmail(user.email)
            .then(function() {
                setText("profileMessage", "Password reset email sent.");
            })
            .catch(function(error) {
                setText("profileMessage", getFirebaseErrorMessage(error));
            });
    });

    cameraButton && cameraButton.addEventListener("click", function() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        input.addEventListener("change", function() {
            const file = input.files && input.files[0];

            if (!file) {
                return;
            }

            if (file.size > 750000) {
                setText("profileMessage", "Choose an image smaller than 750KB.");
                return;
            }

            const reader = new FileReader();
            reader.addEventListener("load", function() {
                currentProfileData.photoDataUrl = reader.result;
                populateProfileView(currentProfileData, currentDashboardUser || auth.currentUser);
                setProfileEditing(true);
                setText("profileMessage", "Profile photo ready. Click Save Changes to keep it.");
            });
            reader.readAsDataURL(file);
        });

        input.click();
    });

    setProfileEditing(false);
}

function syncThemeSettingField() {
    const themeField = document.getElementById("settingTheme");

    if (themeField) {
        themeField.value = document.body.classList.contains("dark-mode") ? "dark" : "light";
    }
}

function updateThemeToggleIcon() {
    const themeButton = document.getElementById("themeToggle");
    const icon = themeButton ? themeButton.querySelector("i") : null;

    if (icon) {
        icon.className = document.body.classList.contains("dark-mode")
            ? "fa-solid fa-moon"
            : "fa-solid fa-sun";
    }
}

function initThemeMode() {
    const themeButton = document.getElementById("themeToggle");
    const savedTheme = localStorage.getItem("dentacareTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    }

    themeButton && themeButton.addEventListener("click", function() {
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("dentacareTheme", document.body.classList.contains("dark-mode") ? "dark" : "light");
        syncThemeSettingField();
        updateThemeToggleIcon();
    });

    updateThemeToggleIcon();
}

function setSettingValue(id, value) {
    const field = document.getElementById(id);

    if (!field) {
        return;
    }

    if (field.type === "checkbox") {
        field.checked = Boolean(value);
        return;
    }

    if (value) {
        field.value = value;
    }
}

function getSettingValue(id) {
    const field = document.getElementById(id);

    if (!field) {
        return "";
    }

    return field.type === "checkbox" ? field.checked : field.value;
}

function getDefaultSettings(profile) {
    return {
        language: "English (US)",
        timezone: "Pacific Time (PT)",
        dateFormat: "MM/DD/YYYY",
        autoSaveForms: true,
        anonymousDataSharing: false,
        emailNotifications: true,
        smsReminders: false,
        appointmentReminders: true,
        theme: localStorage.getItem("dentacareTheme") || "light",
        density: "Comfortable",
        animations: true,
        privateProfile: false,
        paymentMethod: "",
        billingEmail: profile.email || "",
        autoPay: false,
        deletionRequested: false
    };
}

function populateSettingsView(settings, profile) {
    const merged = Object.assign(getDefaultSettings(profile || {}), settings || {});

    setSettingValue("settingLanguage", merged.language);
    setSettingValue("settingTimezone", merged.timezone);
    setSettingValue("settingDateFormat", merged.dateFormat);
    setSettingValue("settingAutoSave", merged.autoSaveForms);
    setSettingValue("settingDataSharing", merged.anonymousDataSharing);
    setSettingValue("settingEmailNotifications", merged.emailNotifications);
    setSettingValue("settingSmsReminders", merged.smsReminders);
    setSettingValue("settingAppointmentReminders", merged.appointmentReminders);
    setSettingValue("settingTheme", merged.theme);
    setSettingValue("settingDensity", merged.density);
    setSettingValue("settingAnimations", merged.animations);
    setSettingValue("settingPrivateProfile", merged.privateProfile);
    setSettingValue("settingPaymentMethod", merged.paymentMethod);
    setSettingValue("settingBillingEmail", merged.billingEmail || profile.email || "");
    setSettingValue("settingAutoPay", merged.autoPay);
    applySettingsPreferences(merged);
}

function collectSettingsData() {
    return {
        language: getSettingValue("settingLanguage"),
        timezone: getSettingValue("settingTimezone"),
        dateFormat: getSettingValue("settingDateFormat"),
        autoSaveForms: getSettingValue("settingAutoSave"),
        anonymousDataSharing: getSettingValue("settingDataSharing"),
        emailNotifications: getSettingValue("settingEmailNotifications"),
        smsReminders: getSettingValue("settingSmsReminders"),
        appointmentReminders: getSettingValue("settingAppointmentReminders"),
        theme: getSettingValue("settingTheme"),
        density: getSettingValue("settingDensity"),
        animations: getSettingValue("settingAnimations"),
        privateProfile: getSettingValue("settingPrivateProfile"),
        paymentMethod: getSettingValue("settingPaymentMethod"),
        billingEmail: getSettingValue("settingBillingEmail"),
        autoPay: getSettingValue("settingAutoPay")
    };
}

function applySettingsPreferences(settings) {
    if (!settings) {
        return;
    }

    if (settings.theme === "dark") {
        document.body.classList.add("dark-mode");
        localStorage.setItem("dentacareTheme", "dark");
    }
    else if (settings.theme === "light") {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("dentacareTheme", "light");
    }

    document.body.classList.toggle("compact-mode", settings.density === "Compact");
    document.body.classList.toggle("reduce-motion", settings.animations === false);
    updateThemeToggleIcon();
}

function downloadUserData() {
    const data = {
        profile: currentProfileData,
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "dentacare-user-data.json";
    link.click();
    URL.revokeObjectURL(link.href);
}

function initSettingsView() {
    const settingsLink = document.getElementById("sidebarSettings");
    const saveButton = document.getElementById("saveSettingsBtn");
    const resetButton = document.getElementById("settingsPasswordResetBtn");
    const signOutButton = document.getElementById("settingsSignOutBtn");
    const downloadButton = document.getElementById("downloadDataBtn");
    const deletionButton = document.getElementById("requestDeletionBtn");

    settingsLink && settingsLink.addEventListener("click", function(event) {
        event.preventDefault();
        showSettingsView();
    });

    document.querySelectorAll("[data-settings-tab]").forEach(function(tab) {
        tab.addEventListener("click", function() {
            const target = tab.dataset.settingsTab;

            document.querySelectorAll("[data-settings-tab]").forEach(function(item) {
                item.classList.toggle("is-active", item === tab);
            });

            document.querySelectorAll("[data-settings-panel]").forEach(function(panel) {
                panel.classList.toggle("is-active", panel.dataset.settingsPanel === target);
            });
        });
    });

    document.querySelectorAll("#settingTheme, #settingDensity, #settingAnimations").forEach(function(field) {
        field.addEventListener("change", function() {
            applySettingsPreferences(collectSettingsData());
        });
    });

    saveButton && saveButton.addEventListener("click", function() {
        const user = currentDashboardUser || auth.currentUser;

        if (!db || !user) {
            setText("settingsMessage", "Settings cannot be saved until you are signed in.");
            return;
        }

        const settings = collectSettingsData();
        saveButton.disabled = true;
        setText("settingsMessage", "Saving settings...");

        db.collection("users").doc(user.uid).set({
            settings: settings,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
            .then(function() {
                currentProfileData.settings = settings;
                applySettingsPreferences(settings);
                setText("settingsMessage", "Settings saved successfully.");
            })
            .catch(function(error) {
                console.error("Could not save settings:", error);
                setText(
                    "settingsMessage",
                    isFirestorePermissionError(error)
                        ? "Settings could not be saved because Firestore rules are blocking updates."
                        : "Settings could not be saved. Please try again."
                );
            })
            .finally(function() {
                saveButton.disabled = false;
            });
    });

    resetButton && resetButton.addEventListener("click", function() {
        const user = currentDashboardUser || auth.currentUser;

        if (!user || !user.email) {
            setText("settingsMessage", "No email address is available for this account.");
            return;
        }

        auth.sendPasswordResetEmail(user.email)
            .then(function() {
                setText("settingsMessage", "Password reset link sent.");
            })
            .catch(function(error) {
                setText("settingsMessage", getFirebaseErrorMessage(error));
            });
    });

    signOutButton && signOutButton.addEventListener("click", function() {
        auth.signOut().then(function() {
            window.location.href = "login.html";
        });
    });

    downloadButton && downloadButton.addEventListener("click", function() {
        downloadUserData();
        setText("settingsMessage", "Your data download has started.");
    });

    deletionButton && deletionButton.addEventListener("click", function() {
        const user = currentDashboardUser || auth.currentUser;

        if (!db || !user) {
            setText("settingsMessage", "Deletion request cannot be saved until you are signed in.");
            return;
        }

        db.collection("users").doc(user.uid).set({
            deletionRequest: {
                requested: true,
                requestedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true })
            .then(function() {
                setText("settingsMessage", "Deletion request saved. The clinic team will review it.");
            })
            .catch(function(error) {
                console.error("Could not request deletion:", error);
                setText("settingsMessage", "Deletion request could not be saved.");
            });
    });
}

function getDefaultAccessibility() {
    return {
        textSize: "medium",
        highContrast: false,
        lineHeight: "normal",
        letterSpacing: "normal",
        colorBlindMode: "none",
        underlineLinks: false,
        screenReaderSupport: false,
        autoplayVideos: false,
        showCaptions: true,
        keyboardNavigation: true,
        focusIndicators: true,
        cursorSize: "medium",
        reduceMotion: false,
        smoothScroll: true
    };
}

function setAccessibilityValue(id, value) {
    const field = document.getElementById(id);

    if (!field) {
        return;
    }

    if (field.type === "checkbox") {
        field.checked = Boolean(value);
        return;
    }

    field.value = value;
}

function getAccessibilityValue(id) {
    const field = document.getElementById(id);

    if (!field) {
        return "";
    }

    return field.type === "checkbox" ? field.checked : field.value;
}

function setAccessibilityTextSize(textSize) {
    document.querySelectorAll("[data-accessibility-text]").forEach(function(button) {
        button.classList.toggle("is-active", button.dataset.accessibilityText === textSize);
    });
}

function populateAccessibilityView(accessibility) {
    const merged = Object.assign(getDefaultAccessibility(), accessibility || {});

    setAccessibilityTextSize(merged.textSize);
    setAccessibilityValue("accessHighContrast", merged.highContrast);
    setAccessibilityValue("accessLineHeight", merged.lineHeight);
    setAccessibilityValue("accessLetterSpacing", merged.letterSpacing);
    setAccessibilityValue("accessColorBlind", merged.colorBlindMode);
    setAccessibilityValue("accessUnderlineLinks", merged.underlineLinks);
    setAccessibilityValue("accessScreenReader", merged.screenReaderSupport);
    setAccessibilityValue("accessAutoplayVideos", merged.autoplayVideos);
    setAccessibilityValue("accessCaptions", merged.showCaptions);
    setAccessibilityValue("accessKeyboardNav", merged.keyboardNavigation);
    setAccessibilityValue("accessFocusIndicators", merged.focusIndicators);
    setAccessibilityValue("accessCursorSize", merged.cursorSize);
    setAccessibilityValue("accessReduceMotion", merged.reduceMotion);
    setAccessibilityValue("accessSmoothScroll", merged.smoothScroll);
    applyAccessibilityPreferences(merged);
}

function collectAccessibilityData() {
    const activeTextButton = document.querySelector("[data-accessibility-text].is-active");

    return {
        textSize: activeTextButton ? activeTextButton.dataset.accessibilityText : "medium",
        highContrast: getAccessibilityValue("accessHighContrast"),
        lineHeight: getAccessibilityValue("accessLineHeight"),
        letterSpacing: getAccessibilityValue("accessLetterSpacing"),
        colorBlindMode: getAccessibilityValue("accessColorBlind"),
        underlineLinks: getAccessibilityValue("accessUnderlineLinks"),
        screenReaderSupport: getAccessibilityValue("accessScreenReader"),
        autoplayVideos: getAccessibilityValue("accessAutoplayVideos"),
        showCaptions: getAccessibilityValue("accessCaptions"),
        keyboardNavigation: getAccessibilityValue("accessKeyboardNav"),
        focusIndicators: getAccessibilityValue("accessFocusIndicators"),
        cursorSize: getAccessibilityValue("accessCursorSize"),
        reduceMotion: getAccessibilityValue("accessReduceMotion"),
        smoothScroll: getAccessibilityValue("accessSmoothScroll")
    };
}

function applyAccessibilityPreferences(accessibility) {
    const settings = Object.assign(getDefaultAccessibility(), accessibility || {});
    const body = document.body;
    const root = document.documentElement;

    body.classList.remove(
        "access-text-small",
        "access-text-medium",
        "access-text-large",
        "access-line-normal",
        "access-line-relaxed",
        "access-line-wide",
        "access-letter-normal",
        "access-letter-wide",
        "access-letter-wider",
        "access-color-protanopia",
        "access-color-deuteranopia",
        "access-color-tritanopia",
        "access-color-grayscale",
        "access-cursor-medium",
        "access-cursor-large",
        "access-cursor-extra-large"
    );

    body.classList.add("access-text-" + settings.textSize);
    body.classList.add("access-line-" + settings.lineHeight);
    body.classList.add("access-letter-" + settings.letterSpacing);
    body.classList.add("access-cursor-" + settings.cursorSize);

    if (settings.colorBlindMode && settings.colorBlindMode !== "none") {
        body.classList.add("access-color-" + settings.colorBlindMode);
    }

    body.classList.toggle("high-contrast-mode", settings.highContrast);
    body.classList.toggle("underline-links-mode", settings.underlineLinks);
    body.classList.toggle("screen-reader-support-mode", settings.screenReaderSupport);
    body.classList.toggle("keyboard-navigation-mode", settings.keyboardNavigation);
    body.classList.toggle("focus-indicators-mode", settings.focusIndicators);
    body.classList.toggle("reduce-motion", settings.reduceMotion);

    root.style.scrollBehavior = settings.smoothScroll ? "smooth" : "auto";
    document.querySelectorAll("video").forEach(function(video) {
        video.autoplay = settings.autoplayVideos;
        video.muted = settings.autoplayVideos;
        video.toggleAttribute("controls", !settings.autoplayVideos || settings.showCaptions);
    });
    localStorage.setItem("dentacareAccessibility", JSON.stringify(settings));
}

function initAccessibilityView() {
    const accessibilityLink = document.getElementById("sidebarAccessibility");
    const saveButton = document.getElementById("saveAccessibilityBtn");
    const savedAccessibility = localStorage.getItem("dentacareAccessibility");

    accessibilityLink && accessibilityLink.addEventListener("click", function(event) {
        event.preventDefault();
        showAccessibilityView();
    });

    if (savedAccessibility) {
        try {
            populateAccessibilityView(JSON.parse(savedAccessibility));
        }
        catch (error) {
            console.warn("Could not read saved accessibility settings:", error);
        }
    }

    document.querySelectorAll("[data-accessibility-text]").forEach(function(button) {
        button.addEventListener("click", function() {
            setAccessibilityTextSize(button.dataset.accessibilityText);
            applyAccessibilityPreferences(collectAccessibilityData());
            setText("accessibilityMessage", "Accessibility preview updated.");
        });
    });

    document.querySelectorAll("#accessibilityView input, #accessibilityView select").forEach(function(field) {
        field.addEventListener("change", function() {
            applyAccessibilityPreferences(collectAccessibilityData());
            setText("accessibilityMessage", "Accessibility preview updated.");
        });
    });

    saveButton && saveButton.addEventListener("click", function() {
        const user = auth.currentUser;

        if (!db || !user) {
            setText("accessibilityMessage", "Accessibility settings cannot be saved until you are signed in.");
            return;
        }

        const accessibility = collectAccessibilityData();
        saveButton.disabled = true;
        setText("accessibilityMessage", "Saving accessibility settings...");

        db.collection("users").doc(user.uid).set({
            accessibility: accessibility,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
            .then(function() {
                currentProfileData.accessibility = accessibility;
                applyAccessibilityPreferences(accessibility);
                setText("accessibilityMessage", "Accessibility settings saved successfully.");
            })
            .catch(function(error) {
                console.error("Could not save accessibility settings:", error);
                setText(
                    "accessibilityMessage",
                    isFirestorePermissionError(error)
                        ? "Accessibility settings could not be saved because Firestore rules are blocking updates."
                        : "Accessibility settings could not be saved. Please try again."
                );
            })
            .finally(function() {
                saveButton.disabled = false;
            });
    });
}

function initHistoryView() {
    const historyLink = document.getElementById("sidebarHistory");
    const searchInput = document.getElementById("historySearch");
    const filterButton = document.getElementById("historyFilterBtn");

    historyLink && historyLink.addEventListener("click", function(event) {
        event.preventDefault();
        showHistoryView();
    });

    document.querySelectorAll("[data-history-tab]").forEach(function(tab) {
        tab.addEventListener("click", function() {
            const target = tab.dataset.historyTab;

            document.querySelectorAll("[data-history-tab]").forEach(function(item) {
                item.classList.toggle("is-active", item === tab);
            });

            document.querySelectorAll("[data-history-panel]").forEach(function(panel) {
                panel.classList.toggle("is-active", panel.dataset.historyPanel === target);
            });
        });
    });

    searchInput && searchInput.addEventListener("input", renderHistoryBookings);

    filterButton && filterButton.addEventListener("click", function() {
        const activeTab = document.querySelector("[data-history-tab].is-active");
        if (activeTab && activeTab.dataset.historyTab === "previous") {
            document.querySelector('[data-history-tab="upcoming"]').click();
        }
        else {
            document.querySelector('[data-history-tab="previous"]').click();
        }
    });

    document.querySelectorAll(".history-list").forEach(function(list) {
        list.addEventListener("click", function(event) {
            const button = event.target.closest("[data-history-action]");

            if (!button) {
                return;
            }

            if (button.dataset.historyAction === "reschedule") {
                showBookingFlow();
            }
            else if (button.dataset.historyAction === "cancel") {
                alert("Cancellation requests are reviewed by the clinic team. Please contact the clinic for urgent changes.");
            }
            else {
                alert("Appointment details are shown on this card.");
            }
        });
    });
}

function initBookingFlow() {
    const bookingFlow = document.getElementById("bookingFlow");
    const appointmentsLink = document.getElementById("sidebarAppointments");
    const dashboardLink = document.querySelector("[data-dashboard-link]");
    const prevButton = document.querySelector(".booking-prev");
    const nextButton = document.querySelector(".booking-next");
    const dateInput = document.getElementById("appointmentDate");
    const bookButtons = document.querySelectorAll(".book-appointment-btn");
    let currentStep = 1;

    if (!bookingFlow) {
        return;
    }

    function updateConfirmDetails() {
        const service = document.querySelector(".service-options .is-selected");
        const dentist = document.querySelector(".dentist-options .is-selected");
        const time = document.querySelector(".time-slot.is-selected");

        setText("confirmService", service ? service.dataset.service : "Teeth Cleaning");
        setText("confirmDentist", dentist ? dentist.dataset.dentist : "Dr. Sarah Johnson");
        setText("confirmDate", dateInput && dateInput.value ? dateInput.value : "2026-07-13");
        setText("confirmTime", time ? time.dataset.time : "09:00 AM");
        setText("confirmDuration", service ? service.dataset.duration : "45 min");
    }

    function getSelectedBookingDetails() {
        const service = document.querySelector(".service-options .is-selected");
        const dentist = document.querySelector(".dentist-options .is-selected");
        const time = document.querySelector(".time-slot.is-selected");

        return {
            service: service ? service.dataset.service : "Teeth Cleaning",
            dentist: dentist ? dentist.dataset.dentist : "Dr. Sarah Johnson",
            appointmentDate: dateInput && dateInput.value ? dateInput.value : "2026-07-13",
            appointmentTime: time ? time.dataset.time : "09:00 AM",
            duration: service ? service.dataset.duration : "45 min",
            status: "Pending"
        };
    }

    async function sendBookingEmail(user, booking) {
        if (!user || !user.email) {
            return Promise.resolve();
        }

        const response = await fetch(`${DENTACARE_EMAIL_API_URL}/api/send-email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                to: user.email,
                subject: "Appointment Confirmation",
                patientName: user.displayName || document.getElementById("userName").textContent || "Patient",
                appointmentDate: booking.appointmentDate,
                appointmentTime: booking.appointmentTime
            })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(function() {
                return {};
            });
            throw new Error(errorBody.message || "Email API request failed.");
        }

        return response.json();
    }

    function saveBooking() {
        const user = currentDashboardUser || auth.currentUser;
        const booking = getSelectedBookingDetails();

        if (!db || !user) {
            setText("bookingConfirmation", "Unable to save booking. Please sign in and try again.");
            return;
        }

        nextButton.disabled = true;
        nextButton.classList.add("is-saving");
        setText("bookingConfirmation", "Saving your booking...");

        db.collection("bookings").add(Object.assign({}, booking, {
            userId: user.uid,
            userEmail: user.email || "",
            userName: user.displayName || document.getElementById("userName").textContent || "Patient",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }))
            .then(function() {
                return sendBookingEmail(user, booking)
                    .then(function() {
                        return true;
                    })
                    .catch(function(error) {
                        console.error("Could not send booking email:", error);
                        return false;
                    });
            })
            .then(function(emailQueued) {
                setText(
                    "bookingConfirmation",
                    emailQueued
                        ? "Booking confirmed. A confirmation email has been sent."
                        : "Booking confirmed. Email could not be sent, but your booking was saved."
                );
                return loadUserBookings(user);
            })
            .catch(function(error) {
                console.error("Could not save booking:", error);
                setText(
                    "bookingConfirmation",
                    isFirestorePermissionError(error)
                        ? "Booking could not be saved because Firestore rules are blocking bookings. Publish firestore.rules in Firebase Console."
                        : "Booking could not be saved. Please try again."
                );
            })
            .finally(function() {
                nextButton.disabled = false;
                nextButton.classList.remove("is-saving");
            });
    }

    function renderStep() {
        document.querySelectorAll("[data-booking-page]").forEach(function(page) {
            page.classList.toggle("is-active", page.dataset.bookingPage === String(currentStep));
        });

        document.querySelectorAll("[data-step-indicator]").forEach(function(step) {
            const stepNumber = Number(step.dataset.stepIndicator);
            step.classList.toggle("is-active", stepNumber === currentStep);
            step.classList.toggle("is-complete", stepNumber < currentStep);
        });

        setText("bookingStepText", `Step ${currentStep} of 4`);

        if (prevButton) {
            prevButton.disabled = currentStep === 1;
        }

        if (nextButton) {
            nextButton.innerHTML = currentStep === 4
                ? 'Confirm <i class="fa-solid fa-check"></i>'
                : 'Next <i class="fa-solid fa-arrow-right"></i>';
        }

        updateConfirmDetails();
    }

    function selectOption(button, selector) {
        document.querySelectorAll(selector).forEach(function(option) {
            option.classList.remove("is-selected");
        });

        button.classList.add("is-selected");
        updateConfirmDetails();
    }

    appointmentsLink && appointmentsLink.addEventListener("click", function(event) {
        event.preventDefault();
        showBookingFlow();
    });

    dashboardLink && dashboardLink.addEventListener("click", function(event) {
        event.preventDefault();
        showDashboardHome();
    });

    bookButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            currentStep = 1;
            setText("bookingConfirmation", "");
            renderStep();
            showBookingFlow();
        });
    });

    document.querySelectorAll(".service-options .booking-option").forEach(function(button) {
        button.addEventListener("click", function() {
            selectOption(button, ".service-options .booking-option");
        });
    });

    document.querySelectorAll(".dentist-options .booking-option").forEach(function(button) {
        button.addEventListener("click", function() {
            selectOption(button, ".dentist-options .booking-option");
        });
    });

    document.querySelectorAll(".time-slot").forEach(function(button) {
        button.addEventListener("click", function() {
            selectOption(button, ".time-slot");
        });
    });

    dateInput && dateInput.addEventListener("change", updateConfirmDetails);

    prevButton && prevButton.addEventListener("click", function() {
        currentStep = Math.max(1, currentStep - 1);
        renderStep();
    });

    nextButton && nextButton.addEventListener("click", function() {
        if (currentStep === 4) {
            saveBooking();
            return;
        }

        currentStep = Math.min(4, currentStep + 1);
        setText("bookingConfirmation", "");
        renderStep();
    });

    renderStep();
}
