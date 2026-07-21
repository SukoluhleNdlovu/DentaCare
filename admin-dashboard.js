(function () {
    if (typeof auth === "undefined" || typeof db === "undefined") {
        console.error("Firebase is not initialized.");
        window.location.href = "admin-login.html";
        return;
    }

    const status = document.getElementById("adminDashboardStatus");
    const signOutButton = document.getElementById("adminDashboardSignOut");
    const clockElement = document.getElementById("dashboardClock");
    const mobileToggle = document.querySelector(".mobile-toggle");
    const sidebar = document.querySelector(".dashboard-sidebar");
    const backdrop = document.querySelector(".sidebar-backdrop");
    const sidebarClose = document.querySelector(".sidebar-close");
    const profileMenu = document.querySelector(".profile-menu");
    const profileTrigger = document.querySelector(".profile-trigger");
    const counters = document.querySelectorAll(".stat-counter");
    const actionButtons = document.querySelectorAll(".quick-action-btn");

    function setStatus(text) {
        if (status) {
            status.textContent = text;
        }
    }

    function redirectToLogin() {
        window.location.href = "admin-login.html";
    }

    function isAdminActive(admin) {
        const adminStatus = admin.status;
        return (
            adminStatus === true ||
            String(adminStatus).toLowerCase() === "true" ||
            String(adminStatus).toLowerCase() === "active"
        );
    }

    function updateClock() {
        if (!clockElement) return;
        const now = new Date();
        clockElement.textContent = now.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    function animateCounters() {
        counters.forEach((counter) => {
            const target = Number(counter.dataset.target || 0);
            let current = 0;
            const step = Math.max(1, Math.ceil(target / 28));
            const timer = window.setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    window.clearInterval(timer);
                }
                counter.textContent = current.toString();
            }, 40);
        });
    }

    function createRipple(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    function toggleSidebar(force) {
        const shouldOpen = typeof force === "boolean" ? force : document.body.classList.contains("sidebar-open") === false;
        document.body.classList.toggle("sidebar-open", shouldOpen);
    }

    auth.onAuthStateChanged(function (user) {
        if (!user) {
            redirectToLogin();
            return;
        }

        db.collection("admins")
            .doc(user.uid)
            .get()
            .then(function (snapshot) {
                if (!snapshot.exists) {
                    console.error("Admin document does not exist.");
                    return auth.signOut().then(redirectToLogin);
                }

                const admin = snapshot.data();
                if (!isAdminActive(admin)) {
                    console.error("Admin account inactive.");
                    return auth.signOut().then(redirectToLogin);
                }

                if (admin.role && admin.role.toLowerCase() !== "admin") {
                    console.error("Invalid admin role.");
                    return auth.signOut().then(redirectToLogin);
                }

                setStatus(`Welcome ${admin.fullName || "Administrator"}. Administrator permissions verified.`);
            })
            .catch(function (error) {
                console.error("Dashboard verification error:", error);
                auth.signOut().then(redirectToLogin);
            });
    });

    if (signOutButton) {
        signOutButton.addEventListener("click", function () {
            auth.signOut().then(redirectToLogin);
        });
    }

    if (clockElement) {
        updateClock();
        window.setInterval(updateClock, 1000);
    }

    if (counters.length) {
        window.setTimeout(animateCounters, 320);
    }

    actionButtons.forEach((button) => {
        button.addEventListener("click", createRipple);
    });

    if (mobileToggle) {
        mobileToggle.addEventListener("click", function () {
            toggleSidebar();
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener("click", function () {
            toggleSidebar(false);
        });
    }

    if (backdrop) {
        backdrop.addEventListener("click", function () {
            toggleSidebar(false);
        });
    }

    if (profileTrigger) {
        profileTrigger.addEventListener("click", function () {
            profileMenu.classList.toggle("open");
        });
    }

    document.addEventListener("click", function (event) {
        if (!profileMenu) return;
        if (!profileMenu.contains(event.target)) {
            profileMenu.classList.remove("open");
        }
    });
})();
