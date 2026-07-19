(function() {

    const ADMIN_DASHBOARD_URL =
        window.DENTACARE_ADMIN_DASHBOARD_URL || "admin-dashboard.html";

    const ADMIN_EMAIL_STORAGE_KEY = "dentacareAdminEmail";

    const earlyCard = document.getElementById("adminLoginCard");
    const earlyMessage = document.getElementById("adminLoginMessage");


    if (typeof firebase === "undefined" || typeof auth === "undefined") {

        console.error(
            "Firebase Authentication must be loaded and initialized before admin-auth.js."
        );

        if (earlyCard) {
            earlyCard.classList.add("is-ready");
        }

        if (earlyMessage) {
            earlyMessage.textContent =
                "Firebase is not configured. Admin login is unavailable.";

            earlyMessage.className =
                "admin-message is-error";
        }

        return;
    }

    const form = document.getElementById("adminLoginForm");
    const card = document.getElementById("adminLoginCard");

    const emailInput =
        document.getElementById("adminEmail");

    const passwordInput =
        document.getElementById("adminPassword");

    const rememberInput =
        document.getElementById("adminRemember");

    const signInButton =
        document.getElementById("adminSignInBtn");

    const toggleButton =
        document.getElementById("adminPasswordToggle");

    const forgotButton =
        document.getElementById("adminForgotPassword");

    const message =
        document.getElementById("adminLoginMessage");


    if (!form || !emailInput || !passwordInput || !signInButton) {
        return;
    }

    let isSubmitting = false;

    function isValidAdminEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    }

    function setAdminMessage(text, type) {

        message.textContent = text || "";

        message.className = "admin-message";

        if (text) {

            message.classList.add(
                type === "success"
                    ? "is-success"
                    : "is-error"
            );

        }

    }

    function setFieldError(input, id, text) {

        const errorElement =
            document.getElementById(id);


        input.classList.toggle(
            "is-invalid",
            Boolean(text)
        );


        if (errorElement) {

            errorElement.textContent =
                text || "";

            errorElement.classList.toggle(
                "is-visible",
                Boolean(text)
            );

        }

    }

    function updateButtonState() {

        const valid =
            isValidAdminEmail(emailInput.value.trim())
            &&
            passwordInput.value.length > 0;


        signInButton.disabled =
            isSubmitting || !valid;

    }

    function setSubmitting(state) {

        isSubmitting = state;

        form.classList.toggle(
            "is-loading",
            state
        );

        signInButton.classList.toggle(
            "is-loading",
            state
        );

        signInButton.disabled =
            state;

    }
    /*
       Verify admin using UID
       Firestore:

       admins
          UID
             role: admin
             status: true
    */

    function verifyAdministrator(user) {


        if (!db) {

            return Promise.reject(
                new Error(
                    "Firestore is unavailable."
                )
            );

        }


        return db
            .collection("admins")
            .doc(user.uid)
            .get()


            .then(function(snapshot) {


                if (!snapshot.exists) {


                    return auth.signOut()
                        .then(function() {

                            throw new Error(
                                "Access denied. This account is not an administrator."
                            );

                        });

                }



                const admin =
                    snapshot.data();



                const active =
                    admin.status === true
                    ||
                    String(admin.status)
                    .toLowerCase() === "true"
                    ||
                    String(admin.status)
                    .toLowerCase() === "active";



                if (!active) {


                    return auth.signOut()
                        .then(function() {

                            throw new Error(
                                "Administrator account is disabled."
                            );

                        });


                }

                if (
                   admin.role &&
                   admin.role.toLowerCase() !== "admin" &&
                   admin.role.toLowerCase() !== "super_admin"
                ) {
                    return auth.signOut()
                        .then(function() {

                            throw new Error(
                                "You do not have administrator permissions."
                            );

                        });

                }


                return admin;


            });


    }





    function validateForm() {


        let valid = true;


        const email =
            emailInput.value.trim();



        if (!isValidAdminEmail(email)) {


            setFieldError(
                emailInput,
                "adminEmailError",
                "Enter a valid email address."
            );


            valid = false;


        }
        else {

            setFieldError(
                emailInput,
                "adminEmailError",
                ""
            );

        }



        if (!passwordInput.value) {


            setFieldError(
                passwordInput,
                "adminPasswordError",
                "Password is required."
            );


            valid = false;


        }
        else {


            setFieldError(
                passwordInput,
                "adminPasswordError",
                ""
            );


        }


        return valid;


    }





    function handleAuthError(error) {


        console.error(
            "Firebase error:",
            error
        );


        if (
            error.code === "auth/wrong-password"
            ||
            error.code === "auth/user-not-found"
            ||
            error.code === "auth/invalid-credential"
        ) {


            setAdminMessage(
                "Invalid email or password.",
                "error"
            );


            return;

        }



        setAdminMessage(
            error.message ||
            "Unable to login.",
            "error"
        );


    }





    function signInAdmin(event) {


        event.preventDefault();



        setAdminMessage(
            "",
            "error"
        );



        if (!validateForm()) {

            return;

        }



        setSubmitting(true);



        auth.setPersistence(
            firebase.auth.Auth.Persistence.LOCAL
        )

        .then(function(){
            return auth.signInWithEmailAndPassword(
                emailInput.value.trim(),
                passwordInput.value
            );
        })

        .then(function(result){
            const user =
                result.user;

            if (rememberInput &&
                rememberInput.checked) {
                localStorage.setItem(
                    ADMIN_EMAIL_STORAGE_KEY,
                    emailInput.value.trim()
                );
            }
            else {

                localStorage.removeItem(
                    ADMIN_EMAIL_STORAGE_KEY
                );
            }
            return verifyAdministrator(user);
        })

        .then(function(){

    setTimeout(function(){
        window.location.href =
            ADMIN_DASHBOARD_URL;
        }, 500);

       })

        .catch(handleAuthError)
        .finally(function(){
            setSubmitting(false);
        });
    }

    function sendPasswordReset(){
        const email =
            emailInput.value.trim();
        if(!isValidAdminEmail(email)){
            setFieldError(
                emailInput,
                "adminEmailError",
                "Enter a valid email address."
            );
            return;
        }

        auth.sendPasswordResetEmail(email)
        .then(function(){
            setAdminMessage(
                "Password reset email sent.",
                "success"
            );
        })

        .catch(handleAuthError);
    }


    if(toggleButton){
        toggleButton.addEventListener(
            "click",
            function(){
                const visible =
                    passwordInput.type === "password";
                passwordInput.type =
                    visible
                    ? "text"
                    : "password";

                toggleButton.setAttribute(
                    "aria-label",
                    visible
                    ? "Hide password"
                    : "Show password"
                );
            }
        );
    }

    forgotButton.addEventListener(
        "click",
        sendPasswordReset
    );

    form.addEventListener(
        "submit",
        signInAdmin
    );

    emailInput.addEventListener(
        "input",
        updateButtonState
    );

    passwordInput.addEventListener(
        "input",
        updateButtonState
    );

    const rememberedEmail =
        localStorage.getItem(
            ADMIN_EMAIL_STORAGE_KEY
        );

    if(rememberedEmail){
        emailInput.value =
            rememberedEmail;
        rememberInput.checked =
            true;
    }
    updateButtonState();

// Check existing session only
auth.onAuthStateChanged(function(user){

    if(user){

        console.log(
            "Existing Firebase session:",
            user.email
        );

    }
    else {

        console.log(
            "No existing session"
        );

    }

});
   
})();