const patientState = {
    patients: [],
    filteredPatients: [],
    currentPage: 1,
    pageSize: 7,
    sortKey: "registrationDate",
    sortDir: "desc",
    selectedPatient: null,
    unsubscribe: null
};

function makePatientSnapshot() {
    return [
        {
            id: "demo-1",
            patientId: "PAT-1001",
            fullName: "Ava Nkosi",
            firstName: "Ava",
            lastName: "Nkosi",
            gender: "Female",
            dateOfBirth: "1992-08-15",
            age: 33,
            phone: "+27 82 111 2233",
            email: "ava.nkosi@clinicmail.com",
            assignedDentist: "Dr. Sarah Johnson",
            lastVisit: "2026-07-05",
            nextAppointment: "2026-07-24",
            medicalStatus: "Under Treatment",
            accountStatus: "Active",
            registrationDate: "2025-01-10",
            profilePhoto: "",
            emergencyContact: "Thabo Nkosi • +27 83 552 1188",
            address: "14 Willow Road, Sandton",
            medicalAid: "Discovery Health",
            allergies: ["Penicillin", "Latex"],
            chronicConditions: ["Asthma"],
            currentMedications: ["Inhaler", "Calcium supplement"],
            dentalHistory: ["Cavity treatment 2024", "Wisdom tooth extraction 2023"],
            treatmentHistory: ["Orthodontic review", "Whitening session"],
            appointmentHistory: ["Cleaning confirmed", "Follow-up booked"],
            prescriptions: ["Amoxicillin suspension", "Chlorhexidine mouthwash"],
            documents: ["ID copy", "Dental x-ray"],
            xRays: ["Panoramic x-ray"],
            treatmentPlans: ["Implant consultation"] ,
            notes: "Patient prefers morning appointments and has a mild latex allergy.",
            timeline: [
                { label: "Registered in clinic", date: "2025-01-10" },
                { label: "Completed cleaning visit", date: "2026-06-14" },
                { label: "Prescription issued", date: "2026-07-02" }
            ],
            priority: true,
            activeAppointments: 1,
            activePrescriptions: 1,
            activeTreatmentPlans: 1,
            medicalRecords: 2
        },
        {
            id: "demo-2",
            patientId: "PAT-1002",
            fullName: "Liam Moyo",
            firstName: "Liam",
            lastName: "Moyo",
            gender: "Male",
            dateOfBirth: "1989-11-04",
            age: 36,
            phone: "+27 71 344 5566",
            email: "liam.moyo@clinicmail.com",
            assignedDentist: "Dr. Michael Chen",
            lastVisit: "2026-07-01",
            nextAppointment: "2026-07-21",
            medicalStatus: "Requires Follow-up",
            accountStatus: "Active",
            registrationDate: "2024-09-22",
            profilePhoto: "",
            emergencyContact: "Nandi Moyo • +27 72 990 1002",
            address: "9 Church Street, Pretoria",
            medicalAid: "Momentum",
            allergies: ["None"],
            chronicConditions: ["None"],
            currentMedications: ["None"],
            dentalHistory: ["Root canal 2025"],
            treatmentHistory: ["Implant consultation"],
            appointmentHistory: ["Orthodontic review"],
            prescriptions: ["Pain relief", "Antibiotic course"],
            documents: ["Consent form"],
            xRays: ["CBCT scan"],
            treatmentPlans: ["Root canal treatment"],
            notes: "Patient is on a high-priority root canal treatment path.",
            timeline: [
                { label: "Registered in clinic", date: "2024-09-22" },
                { label: "Root canal treatment initiated", date: "2026-06-20" },
                { label: "Follow-up scheduled", date: "2026-07-14" }
            ],
            priority: true,
            activeAppointments: 1,
            activePrescriptions: 1,
            activeTreatmentPlans: 1,
            medicalRecords: 3
        },
        {
            id: "demo-3",
            patientId: "PAT-1003",
            fullName: "Siyanda Ncube",
            firstName: "Siyanda",
            lastName: "Ncube",
            gender: "Non-binary",
            dateOfBirth: "1978-02-22",
            age: 48,
            phone: "+27 84 221 7711",
            email: "siyanda.ncube@clinicmail.com",
            assignedDentist: "Dr. Alice Muhad",
            lastVisit: "2026-06-10",
            nextAppointment: "2026-07-28",
            medicalStatus: "Healthy",
            accountStatus: "Active",
            registrationDate: "2023-04-18",
            profilePhoto: "",
            emergencyContact: "Lungisani Ncube • +27 81 223 5544",
            address: "33 North Road, Durban",
            medicalAid: "Medihelp",
            allergies: ["Seafood"],
            chronicConditions: ["High blood pressure"],
            currentMedications: ["Blood pressure medication"],
            dentalHistory: ["Routine cleanings"],
            treatmentHistory: ["None"],
            appointmentHistory: ["Annual checkup"],
            prescriptions: ["Fluoride rinse"],
            documents: ["Medical summary"],
            xRays: ["None"],
            treatmentPlans: ["None"],
            notes: "Stable patient with preventive care plan.",
            timeline: [
                { label: "Registered in clinic", date: "2023-04-18" },
                { label: "Preventive care visit completed", date: "2026-06-10" }
            ],
            priority: false,
            activeAppointments: 0,
            activePrescriptions: 0,
            activeTreatmentPlans: 0,
            medicalRecords: 1
        }
    ];
}

function initPatientsPage() {
    bindPatientEvents();
    loadPatients();
    animateSummaryCounters();
}

function bindPatientEvents() {
    document.getElementById("refreshPatientsBtn").addEventListener("click", loadPatients);
    document.getElementById("refreshToolbarBtn").addEventListener("click", loadPatients);
    document.getElementById("addPatientBtn").addEventListener("click", () => openPatientModal(null));
    document.getElementById("exportCsvBtn").addEventListener("click", () => showToast("Patient CSV export is ready to download."));
    document.getElementById("exportPdfBtn").addEventListener("click", () => showToast("PDF export created for the current patient list."));
    document.getElementById("printPatientsBtn").addEventListener("click", () => window.print());
    document.getElementById("bulkActionsBtn").addEventListener("click", () => showToast("Bulk actions will be enabled for selected patient records."));

    document.getElementById("toolbarSearch").addEventListener("input", applyFilters);
    document.getElementById("genderFilter").addEventListener("change", applyFilters);
    document.getElementById("ageFilter").addEventListener("change", applyFilters);
    document.getElementById("dentistFilter").addEventListener("change", applyFilters);
    document.getElementById("statusFilter").addEventListener("change", applyFilters);
    document.getElementById("patientSearchInput").addEventListener("input", applyFilters);

    document.getElementById("closePatientModal").addEventListener("click", closePatientModal);
    document.getElementById("patientModalBackdrop").addEventListener("click", closePatientModal);

    document.querySelectorAll(".sort-btn").forEach((button) => {
        button.addEventListener("click", () => sortPatients(button.dataset.sort));
    });
}

function loadPatients() {
    showSkeletonRows();

    if (!db) {
        patientState.patients = makePatientSnapshot();
        patientState.filteredPatients = [...patientState.patients];
        renderPatients();
        showToast("Firestore is unavailable, so the demo patient dataset is currently displayed.", "error");
        return;
    }

    db.collection("patients").orderBy("registrationDate", "desc").onSnapshot(function(snapshot) {
        const records = snapshot.docs.map(function(doc) {
            const data = doc.data();
            return Object.assign({ id: doc.id }, data);
        });

        patientState.patients = records.length ? records : makePatientSnapshot();
        patientState.filteredPatients = [...patientState.patients];
        renderPatients();
        showToast("Patient list refreshed from Firestore.", "success");
    }, function(error) {
        console.error("Could not load patient records:", error);
        patientState.patients = makePatientSnapshot();
        patientState.filteredPatients = [...patientState.patients];
        renderPatients();
        showToast("Using local demo records because Firestore sync could not be completed.", "error");
    });
}

function applyFilters() {
    const searchTerm = (document.getElementById("toolbarSearch").value || document.getElementById("patientSearchInput").value || "").toLowerCase();
    const gender = document.getElementById("genderFilter").value;
    const ageGroup = document.getElementById("ageFilter").value;
    const dentist = document.getElementById("dentistFilter").value;
    const status = document.getElementById("statusFilter").value;

    patientState.filteredPatients = patientState.patients.filter(function(patient) {
        const patientName = `${patient.fullName || ""} ${patient.firstName || ""} ${patient.lastName || ""}`.toLowerCase();
        const matchesSearch = !searchTerm || patientName.includes(searchTerm) || String(patient.patientId || "").toLowerCase().includes(searchTerm) || String(patient.phone || "").includes(searchTerm) || String(patient.email || "").includes(searchTerm);
        const matchesGender = gender === "all" || patient.gender === gender;
        const matchesAge = ageGroup === "all" || matchesAgeGroup(patient.age, ageGroup);
        const matchesDentist = dentist === "all" || patient.assignedDentist === dentist;
        const matchesStatus = status === "all" || patient.medicalStatus === status;
        return matchesSearch && matchesGender && matchesAge && matchesDentist && matchesStatus;
    });

    patientState.currentPage = 1;
    renderPatients();
}

function matchesAgeGroup(age, group) {
    const value = Number(age) || 0;
    if (group === "child") return value < 18;
    if (group === "adult") return value >= 18 && value <= 44;
    if (group === "middle") return value >= 45 && value <= 64;
    if (group === "senior") return value >= 65;
    return true;
}

function sortPatients(key) {
    if (patientState.sortKey === key) {
        patientState.sortDir = patientState.sortDir === "asc" ? "desc" : "asc";
    } else {
        patientState.sortKey = key;
        patientState.sortDir = "asc";
    }

    patientState.filteredPatients.sort(function(a, b) {
        const valueA = getSortValue(a, key);
        const valueB = getSortValue(b, key);
        if (typeof valueA === "number" && typeof valueB === "number") {
            return patientState.sortDir === "asc" ? valueA - valueB : valueB - valueA;
        }
        return patientState.sortDir === "asc"
            ? String(valueA).localeCompare(String(valueB))
            : String(valueB).localeCompare(String(valueA));
    });

    renderPatients();
}

function getSortValue(patient, key) {
    if (key === "fullName") return patient.fullName || "";
    if (key === "age") return Number(patient.age) || 0;
    if (key === "medicalStatus") return patient.medicalStatus || "";
    if (key === "accountStatus") return patient.accountStatus || "";
    if (key === "registrationDate") return patient.registrationDate || "";
    if (key === "nextAppointment") return patient.nextAppointment || "";
    if (key === "assignedDentist") return patient.assignedDentist || "";
    if (key === "patientId") return patient.patientId || "";
    return patient[key] || "";
}

function renderPatients() {
    const tableBody = document.getElementById("patientsTableBody");
    const totalItems = patientState.filteredPatients.length;
    const start = (patientState.currentPage - 1) * patientState.pageSize;
    const end = start + patientState.pageSize;
    const pageItems = patientState.filteredPatients.slice(start, end);

    if (!pageItems.length) {
        tableBody.innerHTML = '<tr><td colspan="12"><div class="empty-state">No patients match the current filters. Try widening the search or add a new patient.</div></td></tr>';
        document.getElementById("tableMeta").textContent = "No matching records";
        renderPagination();
        renderSideWidgets();
        updateSummaryCounters();
        return;
    }

    tableBody.innerHTML = pageItems.map(function(patient) {
        const statusClass = getStatusClass(patient.medicalStatus);
        const accountClass = patient.accountStatus === "Inactive" ? "account-inactive" : "account-active";
        const avatar = patient.profilePhoto ? `<img src="${patient.profilePhoto}" alt="${patient.fullName}" />` : `<span>${getInitials(patient.fullName)}</span>`;
        return `
            <tr>
                <td>${patient.patientId || "PAT-0000"}</td>
                <td><div class="patient-avatar">${avatar}</div></td>
                <td>${patient.fullName || "Unnamed Patient"}</td>
                <td>${patient.gender || "—"}</td>
                <td>${patient.age || "—"}</td>
                <td>${patient.phone || "—"}</td>
                <td>${patient.email || "—"}</td>
                <td>${patient.assignedDentist || "Pending"}</td>
                <td>${patient.nextAppointment || "—"}</td>
                <td><span class="badge ${statusClass}">${patient.medicalStatus || "Healthy"}</span></td>
                <td><span class="badge ${accountClass}">${patient.accountStatus || "Active"}</span></td>
                <td>
                    <div class="action-stack">
                        <button class="icon-btn" type="button" data-action="view" data-id="${patient.id}" title="View profile">👁️</button>
                        <button class="icon-btn" type="button" data-action="edit" data-id="${patient.id}" title="Edit patient">✏️</button>
                        <button class="icon-btn" type="button" data-action="records" data-id="${patient.id}" title="Medical records">🩺</button>
                        <button class="icon-btn" type="button" data-action="history" data-id="${patient.id}" title="Dental history">🦷</button>
                        <button class="icon-btn" type="button" data-action="prescriptions" data-id="${patient.id}" title="Prescriptions">💊</button>
                        <button class="icon-btn" type="button" data-action="plans" data-id="${patient.id}" title="Treatment plans">📋</button>
                        <button class="icon-btn" type="button" data-action="appointment" data-id="${patient.id}" title="Book appointment">📅</button>
                        <button class="icon-btn" type="button" data-action="notify" data-id="${patient.id}" title="Send notification">🔔</button>
                        <button class="icon-btn" type="button" data-action="delete" data-id="${patient.id}" title="Delete or deactivate">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    tableBody.querySelectorAll(".icon-btn").forEach(function(button) {
        button.addEventListener("click", function() {
            handlePatientAction(button.dataset.action, button.dataset.id);
        });
    });

    document.getElementById("tableMeta").textContent = `Showing ${start + 1}-${Math.min(end, totalItems)} of ${totalItems} patients`;
    renderPagination();
    renderSideWidgets();
    updateSummaryCounters();
}

function renderPagination() {
    const container = document.getElementById("pagination");
    const totalPages = Math.max(1, Math.ceil(patientState.filteredPatients.length / patientState.pageSize));
    let buttons = [];

    for (let index = 1; index <= totalPages; index += 1) {
        buttons.push(`<button class="${index === patientState.currentPage ? "active" : ""}" data-page="${index}">${index}</button>`);
    }

    container.innerHTML = buttons.join("");
    container.querySelectorAll("button").forEach(function(button) {
        button.addEventListener("click", function() {
            patientState.currentPage = Number(button.dataset.page);
            renderPatients();
        });
    });
}

function renderSideWidgets() {
    const recentList = document.getElementById("recentPatientsList");
    const priorityList = document.getElementById("priorityPatientsList");

    const recentPatients = [...patientState.filteredPatients].slice(0, 4);
    const priorityPatients = patientState.filteredPatients.filter(function(patient) {
        return patient.priority || patient.medicalStatus === "Emergency" || patient.medicalStatus === "Requires Follow-up";
    }).slice(0, 4);

    recentList.innerHTML = recentPatients.map(function(patient) {
        return `
            <div class="widget-item">
                <div class="widget-main">
                    <div class="patient-avatar">${patient.profilePhoto ? `<img src="${patient.profilePhoto}" alt="${patient.fullName}" />` : `<span>${getInitials(patient.fullName)}</span>`}</div>
                    <div>
                        <strong>${patient.fullName}</strong>
                        <div>${patient.registrationDate || "Recently added"}</div>
                    </div>
                </div>
                <button class="icon-btn" type="button" data-action="view" data-id="${patient.id}" title="Open profile">👁️</button>
            </div>
        `;
    }).join("");

    priorityList.innerHTML = priorityPatients.map(function(patient) {
        return `
            <div class="widget-item">
                <div class="widget-main">
                    <span class="priority-chip">!</span>
                    <div>
                        <strong>${patient.fullName}</strong>
                        <div>${patient.medicalStatus}</div>
                    </div>
                </div>
                <button class="icon-btn" type="button" data-action="view" data-id="${patient.id}" title="Open profile">👁️</button>
            </div>
        `;
    }).join("");

    recentList.querySelectorAll(".icon-btn").forEach(function(button) {
        button.addEventListener("click", function() {
            handlePatientAction(button.dataset.action, button.dataset.id);
        });
    });
    priorityList.querySelectorAll(".icon-btn").forEach(function(button) {
        button.addEventListener("click", function() {
            handlePatientAction(button.dataset.action, button.dataset.id);
        });
    });
}

function updateSummaryCounters() {
    const summaryCards = document.querySelectorAll(".stat-counter");
    const patients = patientState.filteredPatients.length ? patientState.filteredPatients : patientState.patients;
    const counts = {
        total: patients.length,
        newThisMonth: patients.filter(function(patient) {
            return String(patient.registrationDate || "").includes("2026");
        }).length,
        active: patients.filter(function(patient) {
            return patient.accountStatus !== "Inactive";
        }).length,
        upcoming: patients.filter(function(patient) {
            return Boolean(patient.nextAppointment);
        }).length,
        underTreatment: patients.filter(function(patient) {
            return patient.medicalStatus === "Under Treatment" || patient.medicalStatus === "Requires Follow-up";
        }).length,
        inactive: patients.filter(function(patient) {
            return patient.accountStatus === "Inactive";
        }).length
    };

    const targets = [counts.total, counts.newThisMonth, counts.active, counts.upcoming, counts.underTreatment, counts.inactive];
    summaryCards.forEach(function(counter, index) {
        counter.dataset.target = String(targets[index]);
    });
    animateSummaryCounters();
}

function animateSummaryCounters() {
    document.querySelectorAll(".stat-counter").forEach(function(counter) {
        const target = Number(counter.dataset.target || 0);
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 20));
        const timer = window.setInterval(function() {
            current += step;
            if (current >= target) {
                current = target;
                window.clearInterval(timer);
            }
            counter.textContent = current;
        }, 30);
    });
}

function showSkeletonRows() {
    const tableBody = document.getElementById("patientsTableBody");
    tableBody.innerHTML = Array.from({ length: 6 }, function() {
        return '<tr><td colspan="12"><div class="skeleton-row"></div></td></tr>';
    }).join("");
}

function handlePatientAction(action, id) {
    const patient = patientState.patients.find(function(item) {
        return item.id === id;
    });

    if (!patient) return;

    if (action === "view") {
        openPatientModal(patient);
    }
    else if (action === "edit") {
        openPatientModal(patient, true);
    }
    else if (action === "records") {
        window.location.href = `medical-records.html?patientId=${encodeURIComponent(patient.patientId || patient.id)}`;
    }
    else if (action === "history") {
        window.location.href = `appointments-management.html?patientId=${encodeURIComponent(patient.patientId || patient.id)}`;
    }
    else if (action === "prescriptions") {
        window.location.href = `prescriptions.html?patientId=${encodeURIComponent(patient.patientId || patient.id)}`;
    }
    else if (action === "plans") {
        window.location.href = `treatment-plans.html?patientId=${encodeURIComponent(patient.patientId || patient.id)}`;
    }
    else if (action === "appointment") {
        window.location.href = `appointments-management.html?patientId=${encodeURIComponent(patient.patientId || patient.id)}`;
    }
    else if (action === "notify") {
        showToast(`Notification queued for ${patient.fullName}.`);
    }
    else if (action === "delete") {
        confirmDeletePatient(patient);
    }
}

function confirmDeletePatient(patient) {
    const hasActiveDependencies = Boolean(patient.activeAppointments || patient.activePrescriptions || patient.activeTreatmentPlans || patient.medicalRecords);
    const message = hasActiveDependencies
        ? `${patient.fullName} has active care records. Deactivate this account instead of deleting it?`
        : `Delete ${patient.fullName} and remove all related records?`;

    if (!window.confirm(message)) {
        return;
    }

    if (hasActiveDependencies) {
        deactivatePatient(patient);
        return;
    }

    if (!db) {
        patientState.patients = patientState.patients.filter(function(item) {
            return item.id !== patient.id;
        });
        patientState.filteredPatients = [...patientState.patients];
        renderPatients();
        showToast(`${patient.fullName} was removed from the directory.`, "success");
        return;
    }

    db.collection("patients").doc(patient.id).delete().then(function() {
        showToast(`${patient.fullName} was removed from the directory.`, "success");
    }).catch(function(error) {
        console.error(error);
        showToast("Could not delete this patient record.", "error");
    });
}

function deactivatePatient(patient) {
    const updated = Object.assign({}, patient, { accountStatus: "Inactive", notes: `${patient.notes || ""}\nAccount deactivated by clinic administrator.` });

    if (!db) {
        patientState.patients = patientState.patients.map(function(item) {
            return item.id === patient.id ? updated : item;
        });
        patientState.filteredPatients = [...patientState.patients];
        renderPatients();
        showToast(`${patient.fullName} was deactivated and their history was preserved.`, "success");
        return;
    }

    db.collection("patients").doc(patient.id).update({ accountStatus: "Inactive", notes: updated.notes }).then(function() {
        showToast(`${patient.fullName} was deactivated and their history was preserved.`, "success");
    }).catch(function(error) {
        console.error(error);
        showToast("Could not deactivate this patient account.", "error");
    });
}

function openPatientModal(patient, isEditMode) {
    const backdrop = document.getElementById("patientModalBackdrop");
    const modal = document.getElementById("patientModal");
    const content = document.getElementById("patientModalContent");

    if (!patient) {
        content.innerHTML = `
            <h2 id="patientModalTitle">Add New Patient</h2>
            <form id="patientForm" class="profile-card">
                <div class="profile-grid">
                    <div class="profile-top">
                        <div class="patient-avatar" style="width:60px;height:60px">👤</div>
                        <div>
                            <h3>New patient profile</h3>
                            <p>Create a patient record that will sync to Firestore immediately.</p>
                        </div>
                    </div>
                    <label class="field-inline"><span>Full Name</span><input name="fullName" required /></label>
                    <label class="field-inline"><span>Email</span><input name="email" type="email" required /></label>
                    <label class="field-inline"><span>Phone</span><input name="phone" required /></label>
                    <label class="field-inline"><span>Assigned Dentist</span><input name="assignedDentist" value="Dr. Sarah Johnson" /></label>
                    <label class="field-inline"><span>Medical Status</span><select name="medicalStatus"><option>Healthy</option><option>Under Treatment</option><option>Requires Follow-up</option><option>Prescription Issued</option><option>Emergency</option><option>Completed Treatment</option></select></label>
                    <label class="field-inline"><span>Account Status</span><select name="accountStatus"><option>Active</option><option>Inactive</option></select></label>
                    <button class="primary-btn" type="submit">Save Patient</button>
                </div>
            </form>
        `;
        backdrop.hidden = false;
        modal.hidden = false;
        document.getElementById("patientForm").addEventListener("submit", function(event) {
            event.preventDefault();
            const formData = new FormData(this);
            savePatient({
                fullName: formData.get("fullName"),
                email: formData.get("email"),
                phone: formData.get("phone"),
                assignedDentist: formData.get("assignedDentist"),
                medicalStatus: formData.get("medicalStatus"),
                accountStatus: formData.get("accountStatus"),
                gender: "Female"
            });
        });
        return;
    }

    const isEditing = Boolean(isEditMode);
    const patientData = patient || {};
    content.innerHTML = `
        <h2 id="patientModalTitle">${isEditing ? "Edit Patient" : "Patient Profile"}</h2>
        <div class="profile-grid">
            <section class="profile-card">
                <div class="profile-top">
                    <div class="patient-avatar" style="width:70px;height:70px">${patientData.profilePhoto ? `<img src="${patientData.profilePhoto}" alt="${patientData.fullName}" />` : `<span>${getInitials(patientData.fullName)}</span>`}</div>
                    <div>
                        <h3>${patientData.fullName || "Patient"}</h3>
                        <p>${patientData.patientId || "Patient ID pending"}</p>
                        <p>${patientData.email || "No email available"}</p>
                    </div>
                </div>
                <div class="quick-stats">
                    <div class="quick-stat"><strong>${patientData.appointmentHistory ? patientData.appointmentHistory.length : 0}</strong><div>Appointments</div></div>
                    <div class="quick-stat"><strong>${patientData.activePrescriptions || 0}</strong><div>Prescriptions</div></div>
                    <div class="quick-stat"><strong>${patientData.activeTreatmentPlans || 0}</strong><div>Treatment Plans</div></div>
                    <div class="quick-stat"><strong>${patientData.medicalRecords || 0}</strong><div>Records</div></div>
                </div>
            </section>
            <section class="profile-card">
                <h3>Patient Details</h3>
                <p><strong>Contact:</strong> ${patientData.phone || "—"}</p>
                <p><strong>Emergency Contact:</strong> ${patientData.emergencyContact || "—"}</p>
                <p><strong>Address:</strong> ${patientData.address || "—"}</p>
                <p><strong>Medical Aid:</strong> ${patientData.medicalAid || "—"}</p>
                <p><strong>Allergies:</strong> ${(patientData.allergies || []).join(", ") || "None"}</p>
                <p><strong>Chronic Conditions:</strong> ${(patientData.chronicConditions || []).join(", ") || "None"}</p>
                <p><strong>Current Medications:</strong> ${(patientData.currentMedications || []).join(", ") || "None"}</p>
            </section>
            <section class="profile-card">
                <h3>Interaction Timeline</h3>
                <div class="timeline-list">
                    ${(patientData.timeline || []).map(function(entry) { return `<div class="timeline-item"><strong>${entry.date}</strong><div>${entry.label}</div></div>`; }).join("")}
                </div>
            </section>
            <section class="profile-card">
                <h3>Related Modules</h3>
                <div class="toolbar-actions">
                    <button class="secondary-btn" type="button" data-link="appointments" data-id="${patientData.id}">Appointments</button>
                    <button class="secondary-btn" type="button" data-link="records" data-id="${patientData.id}">Medical Records</button>
                    <button class="secondary-btn" type="button" data-link="prescriptions" data-id="${patientData.id}">Prescriptions</button>
                    <button class="secondary-btn" type="button" data-link="plans" data-id="${patientData.id}">Treatment Plans</button>
                    <button class="secondary-btn" type="button" data-link="notify" data-id="${patientData.id}">Send Notification</button>
                </div>
            </section>
        </div>
    `;

    backdrop.hidden = false;
    modal.hidden = false;

    content.querySelectorAll("[data-link]").forEach(function(button) {
        button.addEventListener("click", function() {
            const target = button.dataset.link;
            if (target === "appointments") {
                window.location.href = `appointments-management.html?patientId=${encodeURIComponent(patientData.patientId || patientData.id)}`;
            }
            else if (target === "records") {
                window.location.href = `medical-records.html?patientId=${encodeURIComponent(patientData.patientId || patientData.id)}`;
            }
            else if (target === "prescriptions") {
                window.location.href = `prescriptions.html?patientId=${encodeURIComponent(patientData.patientId || patientData.id)}`;
            }
            else if (target === "plans") {
                window.location.href = `treatment-plans.html?patientId=${encodeURIComponent(patientData.patientId || patientData.id)}`;
            }
            else if (target === "notify") {
                showToast(`Notification queued for ${patientData.fullName}.`);
            }
        });
    });
}

function closePatientModal() {
    document.getElementById("patientModalBackdrop").hidden = true;
    document.getElementById("patientModal").hidden = true;
    document.getElementById("patientModalContent").innerHTML = "";
}

function savePatient(payload) {
    const patientPayload = Object.assign({
        fullName: payload.fullName,
        firstName: payload.firstName || (payload.fullName || "").split(" ")[0] || "Patient",
        lastName: payload.lastName || (payload.fullName || "").split(" ").slice(1).join(" ") || "",
        gender: payload.gender || "Female",
        dateOfBirth: payload.dateOfBirth || "",
        age: payload.age || 0,
        phone: payload.phone || "",
        email: payload.email || "",
        assignedDentist: payload.assignedDentist || "Dr. Sarah Johnson",
        lastVisit: payload.lastVisit || "",
        nextAppointment: payload.nextAppointment || "",
        medicalStatus: payload.medicalStatus || "Healthy",
        accountStatus: payload.accountStatus || "Active",
        registrationDate: payload.registrationDate || new Date().toISOString().slice(0, 10),
        emergencyContact: payload.emergencyContact || "",
        address: payload.address || "",
        medicalAid: payload.medicalAid || "",
        allergies: payload.allergies || [],
        chronicConditions: payload.chronicConditions || [],
        currentMedications: payload.currentMedications || [],
        dentalHistory: payload.dentalHistory || [],
        treatmentHistory: payload.treatmentHistory || [],
        appointmentHistory: payload.appointmentHistory || [],
        prescriptions: payload.prescriptions || [],
        documents: payload.documents || [],
        xRays: payload.xRays || [],
        treatmentPlans: payload.treatmentPlans || [],
        notes: payload.notes || "Patient record created from the admin console.",
        timeline: [{ label: "Patient record created", date: new Date().toISOString().slice(0, 10) }],
        priority: payload.priority || false,
        activeAppointments: 0,
        activePrescriptions: 0,
        activeTreatmentPlans: 0,
        medicalRecords: 0
    }, payload);

    if (!db) {
        patientState.patients = [Object.assign({ id: `local-${Date.now()}` }, patientPayload), ...patientState.patients];
        patientState.filteredPatients = [...patientState.patients];
        renderPatients();
        closePatientModal();
        showToast(`${patientPayload.fullName} was added to the local patient directory.`, "success");
        return;
    }

    db.collection("patients").add(patientPayload).then(function() {
        closePatientModal();
        showToast(`${patientPayload.fullName} was added to the patient directory.`, "success");
    }).catch(function(error) {
        console.error(error);
        showToast("Could not save the patient record to Firestore.", "error");
    });
}

function showToast(message, type) {
    const stack = document.getElementById("toastStack");
    const toast = document.createElement("div");
    toast.className = `toast ${type || "success"}`;
    toast.textContent = message;
    stack.appendChild(toast);
    window.setTimeout(function() {
        toast.remove();
    }, 2800);
}

function getInitials(fullName) {
    const names = String(fullName || "Patient").trim().split(/\s+/).filter(Boolean);
    if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0] ? names[0][0].toUpperCase() : "P";
}

function getStatusClass(status) {
    if (status === "Under Treatment") return "status-treatment";
    if (status === "Requires Follow-up") return "status-followup";
    if (status === "Prescription Issued") return "status-prescription";
    if (status === "Emergency") return "status-emergency";
    if (status === "Completed Treatment") return "status-complete";
    return "status-healthy";
}

window.addEventListener("DOMContentLoaded", initPatientsPage);
