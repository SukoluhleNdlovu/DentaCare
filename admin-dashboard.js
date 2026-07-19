(function () {
    if (typeof auth === "undefined" || typeof db === "undefined") {

        console.error("Firebase is not initialized.");

        window.location.href = "admin-login.html";
        return;
    }

    const status =
        document.getElementById("adminDashboardStatus");

    const signOutButton =
        document.getElementById("adminDashboardSignOut");

    function setStatus(text) {

        if (status) {
            status.textContent = text;
        }

    }

    function redirectToLogin() {

        window.location.href =
            "admin-login.html";

    }

    function isAdminActive(admin) {
        const status =
            admin.status;
        return (
            status === true ||
            String(status).toLowerCase() === "true" ||
            String(status).toLowerCase() === "active"
        );

    }

    auth.onAuthStateChanged(function (user) {
        if (!user) {

            redirectToLogin();
            return;

        }

        db.collection("admins")
            .doc(user.uid)
            .get()

            .then(function(snapshot) {
                if (!snapshot.exists) {
                    console.error(
                        "Admin document does not exist."
                    );

                    return auth.signOut()
                        .then(redirectToLogin);
                }

                const admin =
                    snapshot.data();
                console.log(
                    "Logged in admin:",
                    admin
                );

                if (!isAdminActive(admin)) {
                    console.error(
                        "Admin account inactive."
                    );
                    return auth.signOut()
                        .then(redirectToLogin);
                }

                if (
                    admin.role &&
                    admin.role.toLowerCase()
                    !== "admin"
                ) {
                    console.error(
                        "Invalid admin role."
                    );

                    return auth.signOut()
                        .then(redirectToLogin);
                }

                setStatus(
                    "Welcome " +
                    (admin.fullName || "Administrator") +
                    ". Administrator permissions verified."
                );
            })

            .catch(function(error) {
                console.error(
                    "Dashboard verification error:",
                    error
                );
                auth.signOut()
                    .then(redirectToLogin);
            });
    });

    if (signOutButton) {

        signOutButton.addEventListener(
            "click",
            function () {
                auth.signOut()
                    .then(redirectToLogin);
            }
        );
    }
})();