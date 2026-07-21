(function () {
    if (typeof auth === "undefined" || typeof db === "undefined") {
        console.error("Firebase is not initialized.");
        return;
    }

    const tableBody = document.getElementById("appointmentsTableBody");
    const paginationControls = document.getElementById("paginationControls");
    const searchInput = document.getElementById("appointmentsSearch");
    const toolbarSearch = document.getElementById("toolbarSearch");
    const statusFilter = document.getElementById("statusFilter");
    const dentistFilter = document.getElementById("dentistFilter");
    const serviceFilter = document.getElementById("serviceFilter");
    const dateFilter = document.getElementById("dateFilter");
    const refreshBtn = document.getElementById("refreshAppointmentsBtn");
    const refreshToolbarBtn = document.getElementById("refreshToolbarBtn");
    const addBtn = document.getElementById("addAppointmentBtn");
    const addToolbarBtn = document.getElementById("toolbarAddAppointmentBtn");
    const notificationBadge = document.getElementById("notificationBadge");
    const detailsModal = document.getElementById("detailsModal");
    const appointmentModal = document.getElementById("appointmentModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const closeAppointmentModalBtn = document.getElementById("cancelAppointmentModalBtn");
    const detailsModalContent = document.getElementById("detailsModalContent");
    const appointmentForm = document.getElementById("appointmentForm");
    const toast = document.getElementById("toast");
    const calendarView = document.getElementById("calendarView");
    const upcomingAppointmentsList = document.getElementById("upcomingAppointmentsList");
    const recentActivityList = document.getElementById("recentActivityList");
    const mobileToggle = document.querySelector(".mobile-toggle");
    const sidebar = document.querySelector(".dashboard-sidebar");
    const backdrop = document.querySelector(".sidebar-backdrop");
    const sidebarClose = document.querySelector(".sidebar-close");
    const profileMenu = document.querySelector(".profile-menu");
    const profileTrigger = document.querySelector(".profile-trigger");
    const appointmentsSignOut = document.getElementById("appointmentsSignOut");
    const availabilityMessage = document.getElementById("availabilityMessage");

    let appointments = [];
    let filteredAppointments = [];
    let currentPage = 1;
    const rowsPerPage = 8;
    let activeSort = "appointmentDate";
    let activeSortDir = "asc";
    let selectedAppointment = null;
    let unsubscribe = null;

    const appointmentStatuses = ["Pending", "Confirmed", "Completed", "Cancelled", "Rescheduled", "No Show"];

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast.timeout);
        showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2400);
    }

    function showModal(modal) {
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeModal(modal) {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    }

    function getStatusBadge(status) {
        const normalized = (status || "Pending").toLowerCase();
        if (normalized.includes("confirm")) return '<span class="badge confirmed">Confirmed</span>';
        if (normalized.includes("complete")) return '<span class="badge completed">Completed</span>';
        if (normalized.includes("cancel")) return '<span class="badge cancelled">Cancelled</span>';
        if (normalized.includes("resched")) return '<span class="badge rescheduled">Rescheduled</span>';
        if (normalized.includes("show")) return '<span class="badge no-show">No Show</span>';
        return '<span class="badge pending">Pending</span>';
    }

    function applyFilters() {
        const searchText = (toolbarSearch.value || searchInput.value || "").toLowerCase();
        const statusValue = statusFilter.value;
        const dentistValue = dentistFilter.value;
        const serviceValue = serviceFilter.value;
        const dateValue = dateFilter.value;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        filteredAppointments = appointments.filter((appointment) => {
            const byStatus = statusValue === "all" || appointment.status === statusValue;
            const byDentist = dentistValue === "all" || appointment.dentist === dentistValue;
            const byService = serviceValue === "all" || appointment.service === serviceValue;
            const bySearch = !searchText || [appointment.id, appointment.patientName, appointment.patientEmail, appointment.service, appointment.dentist].join(" ").toLowerCase().includes(searchText);
            let byDate = true;
            if (dateValue === "today") {
                const appointmentDate = new Date(appointment.appointmentDate);
                byDate = appointmentDate >= startOfToday && appointmentDate < new Date(startOfToday.getTime() + 86400000);
            } else if (dateValue === "week") {
                const appointmentDate = new Date(appointment.appointmentDate);
                byDate = appointmentDate >= startOfWeek && appointmentDate <= new Date(startOfToday.getTime() + 7 * 86400000);
            } else if (dateValue === "month") {
                const appointmentDate = new Date(appointment.appointmentDate);
                byDate = appointmentDate >= startOfMonth && appointmentDate <= new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
            return byStatus && byDentist && byService && bySearch && byDate;
        });

        sortAppointments();
        renderTable();
        renderCalendar();
        renderUpcoming();
    }

    function sortAppointments() {
        filteredAppointments.sort((a, b) => {
            const aValue = a[activeSort] || "";
            const bValue = b[activeSort] || "";
            const comparison = String(aValue).localeCompare(String(bValue), undefined, { sensitivity: "base" });
            return activeSortDir === "asc" ? comparison : -comparison;
        });
    }

    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = "";
        if (!filteredAppointments.length) {
            tableBody.innerHTML = '<tr><td colspan="12"><div class="empty-state">No appointments match the current filters. Try adjusting your search or add a new booking.</div></td></tr>';
            paginationControls.innerHTML = "";
            return;
        }

        const start = (currentPage - 1) * rowsPerPage;
        const pageData = filteredAppointments.slice(start, start + rowsPerPage);
        pageData.forEach((appointment) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td data-label="Appointment ID">${appointment.id}</td>
                <td data-label="Patient"><div class="patient-cell"><img class="patient-photo" src="${appointment.patientPhoto || 'images/dentist1.png'}" alt="${appointment.patientName}" /><span>${appointment.patientName}</span></div></td>
                <td data-label="Dentist">${appointment.dentist}</td>
                <td data-label="Service">${appointment.service}</td>
                <td data-label="Date">${appointment.appointmentDate}</td>
                <td data-label="Time">${appointment.appointmentTime}</td>
                <td data-label="Duration">${appointment.duration}</td>
                <td data-label="Booking Date">${appointment.bookingDate}</td>
                <td data-label="Status">${getStatusBadge(appointment.status)}</td>
                <td data-label="Payment">${appointment.paymentStatus === 'Paid' ? '<span class="payment-paid">Paid</span>' : '<span class="payment-pending">Pending</span>'}</td>
                <td data-label="Notes">${appointment.notes || '—'}</td>
                <td data-label="Actions"><div class="actions-group">
                    <button class="icon-btn" data-action="view" data-id="${appointment.id}">👁️</button>
                    <button class="icon-btn" data-action="edit" data-id="${appointment.id}">✏️</button>
                    <button class="icon-btn success" data-action="approve" data-id="${appointment.id}">✓</button>
                    <button class="icon-btn" data-action="reschedule" data-id="${appointment.id}">🔄</button>
                    <button class="icon-btn success" data-action="complete" data-id="${appointment.id}">✅</button>
                    <button class="icon-btn danger" data-action="cancel" data-id="${appointment.id}">✖</button>
                    <button class="icon-btn" data-action="remind" data-id="${appointment.id}">🔔</button>
                    <button class="icon-btn danger" data-action="delete" data-id="${appointment.id}">🗑️</button>
                </div></td>
            `;
            tableBody.appendChild(row);
        });

        const pageCount = Math.ceil(filteredAppointments.length / rowsPerPage);
        paginationControls.innerHTML = "";
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.classList.toggle("active", i === currentPage);
            btn.addEventListener("click", () => {
                currentPage = i;
                renderTable();
            });
            paginationControls.appendChild(btn);
        }
    }

    function renderCalendar() {
        if (!calendarView) return;
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        let startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        const cells = [];
        for (let i = 0; i < startDay; i++) cells.push(null);
        for (let day = 1; day <= lastDay.getDate(); day++) cells.push(day);
        while (cells.length % 7 !== 0) cells.push(null);

        const grid = document.createElement("div");
        grid.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:8px;">
                ${days.map((day) => `<div class="day-label">${day}</div>`).join("")}
                ${cells.map((day) => day ? `<div class="calendar-day" data-day="${day}"><div class="day-label">${day}</div>${renderDayEvents(day)}</div>` : '<div class="calendar-day"></div>').join("")}
            </div>
        `;
        calendarView.innerHTML = "";
        calendarView.appendChild(grid);
    }

    function renderDayEvents(day) {
        const matching = appointments.filter((appointment) => {
            const appointmentDay = new Date(appointment.appointmentDate).getDate();
            return appointmentDay === day;
        });
        return matching.slice(0, 2).map((appointment) => `<button class="calendar-event ${appointment.status.toLowerCase().replace(/\s+/g, "-")}" data-id="${appointment.id}">${appointment.appointmentTime} • ${appointment.patientName.split(" ")[0]}</button>`).join("");
    }

    function renderUpcoming() {
        if (!upcomingAppointmentsList) return;
        if (!appointments.length) {
            upcomingAppointmentsList.innerHTML = '<div class="empty-state">No upcoming appointments scheduled.</div>';
            return;
        }
        const sorted = [...appointments].sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate)).slice(0, 4);
        upcomingAppointmentsList.innerHTML = sorted.map((appointment) => `
            <div class="upcoming-item">
                <div class="avatar">${appointment.patientName.split(" ").map((p) => p[0]).join("").slice(0, 2)}</div>
                <div class="item-body">
                    <strong>${appointment.patientName}</strong>
                    <p>${appointment.appointmentTime} • ${appointment.dentist}</p>
                    <p>${appointment.service}</p>
                    <div class="countdown">Starts in 18 min</div>
                </div>
            </div>
        `).join("");
    }

    function renderRecentActivity() {
        if (!recentActivityList) return;
        recentActivityList.innerHTML = [
            { title: "New booking approved", detail: "Ava Nkosi • 08:32 AM", time: "2 mins ago" },
            { title: "Appointment rescheduled", detail: "Liam Moyo • 10:15 AM", time: "18 mins ago" },
            { title: "Treatment completed", detail: "Siyanda Ncube • 02:40 PM", time: "42 mins ago" }
        ].map((item) => `
            <div class="activity-item">
                <div class="avatar">${item.title[0]}</div>
                <div>
                    <strong>${item.title}</strong>
                    <small>${item.detail}</small>
                    <small>${item.time}</small>
                </div>
            </div>
        `).join("");
    }

    function setLoadingState() {
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="12"><div class="empty-state"><div class="skeleton" style="width:60%;margin:0 auto 10px"></div><div class="skeleton" style="width:80%;margin:0 auto 10px"></div><div class="skeleton" style="width:45%;margin:0 auto"></div></div></td></tr>';
    }

    function loadAppointments() {
        setLoadingState();
        const appointmentsRef = db.collection("appointments");
        if (unsubscribe) unsubscribe();
        unsubscribe = appointmentsRef.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
            appointments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            applyFilters();
            renderRecentActivity();
            updateSummaryCards();
        }, (error) => {
            console.error("Could not load appointments", error);
            showToast("Unable to load appointments right now.");
        });
    }

    function updateSummaryCards() {
        const totals = {
            total: appointments.length,
            today: appointments.filter((item) => item.appointmentDate === new Date().toISOString().split("T")[0]).length,
            pending: appointments.filter((item) => item.status === "Pending").length,
            confirmed: appointments.filter((item) => item.status === "Confirmed").length,
            completed: appointments.filter((item) => item.status === "Completed").length,
            cancelled: appointments.filter((item) => item.status === "Cancelled").length,
            rescheduled: appointments.filter((item) => item.status === "Rescheduled").length
        };
        document.querySelectorAll(".stat-counter").forEach((counter, index) => {
            const values = [totals.total, totals.today, totals.pending, totals.confirmed, totals.completed, totals.cancelled, totals.rescheduled];
            const target = values[index] || 0;
            let current = 0;
            const step = Math.max(1, Math.ceil(target / 20));
            const timer = window.setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                counter.textContent = current;
            }, 35);
        });
    }

    function openAppointmentDetails(appointment) {
        selectedAppointment = appointment;
        detailsModalContent.innerHTML = `
            <h3>${appointment.patientName}</h3>
            <div class="modal-grid">
                <div>
                    <h4>Patient Details</h4>
                    <p><strong>Email:</strong> ${appointment.patientEmail || '—'}</p>
                    <p><strong>Phone:</strong> ${appointment.phone || '—'}</p>
                    <p><strong>Dentist:</strong> ${appointment.dentist}</p>
                </div>
                <div>
                    <h4>Appointment Details</h4>
                    <p><strong>Service:</strong> ${appointment.service}</p>
                    <p><strong>Date:</strong> ${appointment.appointmentDate}</p>
                    <p><strong>Time:</strong> ${appointment.appointmentTime}</p>
                    <p><strong>Duration:</strong> ${appointment.duration}</p>
                </div>
                <div class="full">
                    <h4>Notes</h4>
                    <p>${appointment.notes || 'No symptoms or notes were provided.'}</p>
                </div>
                <div class="full">
                    <h4>Booking History</h4>
                    <p>Booked on ${appointment.bookingDate}. Status updated to ${appointment.status}.</p>
                </div>
                <div class="full">
                    <h4>Status Timeline</h4>
                    <p>Pending → Confirmed → Completed/Cancelled based on clinic workflow.</p>
                </div>
            </div>
            <div class="modal-actions">
                <button class="secondary-btn" data-action="approve" data-id="${appointment.id}">Approve</button>
                <button class="secondary-btn" data-action="reschedule" data-id="${appointment.id}">Reschedule</button>
                <button class="primary-btn" data-action="complete" data-id="${appointment.id}">Mark Completed</button>
            </div>
        `;
        showModal(detailsModal);
    }

    function updateAppointmentStatus(appointmentId, status, message) {
        const appointmentRef = db.collection("appointments").doc(appointmentId);
        appointmentRef.update({ status, updatedAt: new Date() }).then(() => {
            showToast(message);
            if (status !== "Pending") {
                const notificationRef = db.collection("notifications").doc();
                notificationRef.set({
                    userId: appointmentId,
                    title: `Appointment ${status}`,
                    message: `Your appointment update has been received. Current status: ${status}.`,
                    createdAt: new Date(),
                    read: false
                });
            }
        }).catch((error) => {
            console.error("Could not update appointment", error);
            showToast("Unable to update the appointment right now.");
        });
    }

    function requestDelete(appointmentId) {
        if (!window.confirm("Delete this appointment? This action cannot be undone.")) return;
        db.collection("appointments").doc(appointmentId).delete().then(() => {
            showToast("Appointment deleted.");
        }).catch((error) => {
            console.error("Could not delete appointment", error);
            showToast("Unable to delete this appointment.");
        });
    }

    function handleAction(action, appointmentId) {
        const appointment = appointments.find((item) => item.id === appointmentId);
        if (!appointment) return;
        if (action === "view") {
            openAppointmentDetails(appointment);
        } else if (action === "edit") {
            selectedAppointment = appointment;
            document.getElementById("patientNameInput").value = appointment.patientName || "";
            document.getElementById("patientEmailInput").value = appointment.patientEmail || "";
            document.getElementById("dentistInput").value = appointment.dentist || "Dr Sarah Johnson";
            document.getElementById("serviceInput").value = appointment.service || "Routine Cleaning";
            document.getElementById("dateInput").value = appointment.appointmentDate || "";
            document.getElementById("timeInput").value = appointment.appointmentTime || "";
            document.getElementById("durationInput").value = appointment.duration || "45 min";
            document.getElementById("notesInput").value = appointment.notes || "";
            showModal(appointmentModal);
        } else if (action === "approve") {
            updateAppointmentStatus(appointmentId, "Confirmed", "Appointment approved and confirmed.");
        } else if (action === "reschedule") {
            updateAppointmentStatus(appointmentId, "Rescheduled", "Appointment rescheduled.");
        } else if (action === "complete") {
            updateAppointmentStatus(appointmentId, "Completed", "Appointment marked completed.");
        } else if (action === "cancel") {
            if (!window.confirm("Cancel this appointment?")) return;
            updateAppointmentStatus(appointmentId, "Cancelled", "Appointment cancelled.");
        } else if (action === "remind") {
            showToast("Reminder sent to the patient.");
        } else if (action === "delete") {
            requestDelete(appointmentId);
        }
    }

    function bindEvents() {
        [searchInput, toolbarSearch].forEach((input) => {
            input?.addEventListener("input", applyFilters);
        });
        [statusFilter, dentistFilter, serviceFilter, dateFilter].forEach((element) => {
            element?.addEventListener("change", applyFilters);
        });
        [refreshBtn, refreshToolbarBtn].forEach((button) => button?.addEventListener("click", loadAppointments));
        [addBtn, addToolbarBtn].forEach((button) => button?.addEventListener("click", () => {
            appointmentForm.reset();
            document.getElementById("dateInput").value = new Date().toISOString().split("T")[0];
            showModal(appointmentModal);
        }));
        document.querySelectorAll(".sort-btn").forEach((button) => button.addEventListener("click", () => {
            const sortName = button.dataset.sort;
            if (activeSort === sortName) {
                activeSortDir = activeSortDir === "asc" ? "desc" : "asc";
            } else {
                activeSort = sortName;
                activeSortDir = "asc";
            }
            sortAppointments();
            renderTable();
        }));
        tableBody?.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action]");
            if (!button) return;
            handleAction(button.dataset.action, button.dataset.id);
        });
        detailsModal?.addEventListener("click", (event) => {
            if (event.target === detailsModal) closeModal(detailsModal);
        });
        appointmentModal?.addEventListener("click", (event) => {
            if (event.target === appointmentModal) closeModal(appointmentModal);
        });
        closeModalBtn?.addEventListener("click", () => closeModal(detailsModal));
        closeAppointmentModalBtn?.addEventListener("click", () => closeModal(appointmentModal));
        document.getElementById("closeAppointmentModalBtn")?.addEventListener("click", () => closeModal(appointmentModal));
        document.querySelectorAll(".toggle-btn").forEach((button) => button.addEventListener("click", () => {
            document.querySelectorAll(".toggle-btn").forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
        }));
        appointmentForm?.addEventListener("submit", (event) => {
            event.preventDefault();
            const appointmentRef = db.collection("appointments").doc();
            const appointment = {
                id: appointmentRef.id.slice(0, 8).toUpperCase(),
                patientName: document.getElementById("patientNameInput").value.trim(),
                patientEmail: document.getElementById("patientEmailInput").value.trim(),
                dentist: document.getElementById("dentistInput").value,
                service: document.getElementById("serviceInput").value,
                appointmentDate: document.getElementById("dateInput").value,
                appointmentTime: document.getElementById("timeInput").value,
                duration: document.getElementById("durationInput").value,
                notes: document.getElementById("notesInput").value.trim(),
                status: "Pending",
                paymentStatus: "Pending",
                bookingDate: new Date().toISOString().split("T")[0],
                createdAt: new Date()
            };
            appointmentRef.set(appointment).then(() => {
                showToast("Appointment created successfully.");
                closeModal(appointmentModal);
                appointmentForm.reset();
            }).catch((error) => {
                console.error("Could not create appointment", error);
                showToast("Unable to create this appointment.");
            });
        });
        if (mobileToggle) {
            mobileToggle.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
        }
        if (sidebarClose) {
            sidebarClose.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
        }
        if (backdrop) {
            backdrop.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
        }
        if (profileTrigger) {
            profileTrigger.addEventListener("click", () => profileMenu.classList.toggle("open"));
        }
        document.addEventListener("click", (event) => {
            if (!profileMenu) return;
            if (!profileMenu.contains(event.target)) profileMenu.classList.remove("open");
        });
        if (appointmentsSignOut) {
            appointmentsSignOut.addEventListener("click", () => auth.signOut().then(() => window.location.href = "admin-login.html"));
        }
    }

    function initAccessibility() {
        const appointmentDateInput = document.getElementById("dateInput");
        appointmentDateInput && (appointmentDateInput.min = new Date().toISOString().split("T")[0]);
    }

    function initialize() {
        bindEvents();
        initAccessibility();
        loadAppointments();
        renderRecentActivity();
        updateSummaryCards();
        renderUpcoming();
        renderCalendar();
    }

    initialize();
})();
