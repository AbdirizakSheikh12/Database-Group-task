requireAuth();

const currentUser = getCurrentUser();

let cachedClinics = [];
let cachedAppointments = [];
let cachedStaff = [];
let cachedVaccinations = [];
let cachedVaccines = [];

document.addEventListener('DOMContentLoaded', async () => {
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = `Welcome, ${currentUser.username || currentUser.name || 'Patient'}`;
    }

    await loadReferenceData();
    loadClinics();
    loadMyAppointments();

    document.getElementById('bookAppointmentForm').addEventListener('submit', handleBookingSubmit);
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`tab-btn-${tabId}`).classList.add('active');
}

async function loadReferenceData() {
    try {
        const [clinics, staff, vaccinations, vaccines] = await Promise.all([
            api.getClinics().catch(() => []),
            api.getStaff().catch(() => []),
            api.getVaccinations().catch(() => []),
            api.getVaccines().catch(() => [])
        ]);
        cachedClinics = clinics || [];
        cachedStaff = staff || [];
        cachedVaccinations = vaccinations || [];
        cachedVaccines = vaccines || [];

        populateBookingClinics();
    } catch (error) {
        console.error("Error loading reference data:", error);
    }
}

function getCachedName(cache, idProp, idVal, nameProp1, nameProp2) {
    if (!idVal) return 'N/A';
    const item = cache.find(x => String(x[idProp]) === String(idVal));
    if (!item) return `ID: ${idVal}`;
    let name = item[nameProp1] || item.name || item.firstname || '';
    if (nameProp2) {
        let n2 = item[nameProp2] || item.lastname || '';
        if (n2) name += ' ' + n2;
    }
    return name;
}

// TAB 1: FIND A CLINIC
function loadClinics() {
    renderClinics(cachedClinics);
}

function filterClinics() {
    const searchTerm = document.getElementById('clinicSearch').value.toLowerCase();
    const filtered = cachedClinics.filter(c => {
        const name = (c.ClinicName || c.name || '').toLowerCase();
        const postcode = (c.ClinicPostcode || c.postcode || '').toLowerCase();
        return name.includes(searchTerm) || postcode.includes(searchTerm);
    });
    renderClinics(filtered);
}

function renderClinics(clinics) {
    const container = document.getElementById('clinicsList');
    if (clinics.length === 0) {
        container.innerHTML = '<p>No clinics found.</p>';
        return;
    }

    let html = '';
    clinics.forEach(c => {
        const managerName = getCachedName(cachedStaff, 'id', c.ClinicManagerID || c.manager_id, 'StaffFirstname', 'StaffLastname');
        html += `
            <div class="card">
                <h3>${c.ClinicName || c.name || `Clinic ${c.id}`}</h3>
                <p><strong>Address:</strong> ${c.ClinicAddress || c.address || 'N/A'}<br><strong>Postcode:</strong> ${c.ClinicPostcode || c.postcode || 'N/A'}</p>
                <p><strong>Contact:</strong> ${c.ClinicContactNumber || c.contact || 'N/A'}</p>
                <p><strong>Manager:</strong> ${managerName}</p>
            </div>
        `;
    });
    container.innerHTML = html;
}

// TAB 2: MY APPOINTMENTS
async function loadMyAppointments() {
    try {
        const allApts = await api.getAppointments() || [];
        cachedAppointments = allApts.filter(a => String(a.AppointmentPatientID || a.patient_id) === String(currentUser.id));

        cachedVaccinations = await api.getVaccinations().catch(() => []) || [];

        renderAppointments(cachedAppointments);
    } catch (error) {
        document.getElementById('appointmentsList').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function renderAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    if (!appointments.length) {
        container.innerHTML = '<p>You have no appointments booked.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Date/Time</th><th>Clinic Name</th><th>Clinician Name</th><th>Status</th><th>Vaccination Outcome</th><th>Actions</th></tr></thead><tbody>';

    appointments.forEach(apt => {
        const clinicName = getCachedName(cachedClinics, 'id', apt.AppointmentClinicID || apt.clinic_id, 'ClinicName');
        const clinicianName = getCachedName(cachedStaff, 'id', apt.AppointmentStaffID || apt.staff_id, 'StaffFirstname', 'StaffLastname');

        let statusID = parseInt(apt.AppointmentStatusID || apt.status || 1);
        let statusHtml = '<span class="badge badge-pending">Pending</span>';
        if (statusID === 2 || statusID === 4) statusHtml = '<span class="badge badge-arrived">Arrived/In Progress</span>';
        if (statusID === 3 || statusID === 5) statusHtml = '<span class="badge badge-completed">Completed</span>';

        let outcomeMsg = 'N/A';
        if (statusID === 3 || statusID === 5) {
            const vaxLog = cachedVaccinations.find(v => String(v.VaccinationAppointmentID || v.appointment_id) === String(apt.AppointmentID));
            if (vaxLog) {
                const outcomeID = parseInt(vaxLog.VaccinationOutcomeID || vaxLog.outcome_id || 1);
                const oxName = outcomeID === 1 ? 'Yes (Given)' : (outcomeID === 2 ? 'No (Refused/Unwell)' : `Status ${outcomeID}`);
                const vaxName = getCachedName(cachedVaccines, 'id', vaxLog.VaccinationVaccineID || vaxLog.vaccine_id, 'VaccineName');
                outcomeMsg = `${vaxName} - ${oxName}`;
            } else {
                outcomeMsg = 'No record found';
            }
        }

        html += `<tr>
            <td>${apt.AppointmentDatetime || apt.date || 'N/A'}</td>
            <td>${clinicName}</td>
            <td>${clinicianName}</td>
            <td>${statusHtml}</td>
            <td>${outcomeMsg}</td>
            <td>
                <div style="margin-bottom: 5px;">
                    <input type="datetime-local" id="resched-date-${apt.AppointmentID}" style="font-size: 12px; padding: 2px;">
                    <button class="btn btn-primary btn-action" onclick="rescheduleAppointment(${apt.AppointmentID})">Reschedule</button>
                </div>
                <div>
                    <button class="btn btn-success btn-action" onclick="checkInAppointment(${apt.AppointmentID})">Check In</button>
                    <button class="btn btn-danger btn-action" onclick="cancelAppointment(${apt.AppointmentID})">Cancel</button>
                </div>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function rescheduleAppointment(aptId) {
    const newDateInput = document.getElementById(`resched-date-${aptId}`).value;
    if (!newDateInput) {
        alert("Please select a new date and time to reschedule.");
        return;
    }

    try {
        const apt = cachedAppointments.find(a => String(a.AppointmentID) === String(aptId));
        if (!apt) return;
        const data = { AppointmentDatetime: newDateInput, AppointmentPatientID: apt.AppointmentPatientID, AppointmentClinicID: apt.AppointmentClinicID, AppointmentStaffID: apt.AppointmentStaffID, AppointmentStatusID: apt.AppointmentStatusID, AppointmentNotes: apt.AppointmentNotes };
        await api.updateAppointment(aptId, data);
        alert("Appointment rescheduled successfully!");
        loadMyAppointments();
    } catch (error) {
        alert("Error rescheduling: " + error.message);
    }
}

window.cancelAppointment = async function (aptId) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
        await api.deleteAppointment(aptId);
        alert("Appointment cancelled.");
        loadMyAppointments();
    } catch (error) {
        alert("Error cancelling: " + error.message);
    }
};

window.checkInAppointment = async function (aptId) {
    try {
        const apt = cachedAppointments.find(a => String(a.AppointmentID) === String(aptId));
        if (!apt) return;
        const data = { AppointmentDatetime: apt.AppointmentDatetime, AppointmentPatientID: apt.AppointmentPatientID, AppointmentClinicID: apt.AppointmentClinicID, AppointmentStaffID: apt.AppointmentStaffID, AppointmentStatusID: 2, AppointmentNotes: apt.AppointmentNotes }; // Using 2 for arrived/checked-in
        await api.updateAppointment(aptId, data);
        alert("Checked in successfully!");
        loadMyAppointments();
    } catch (error) {
        alert("Error checking in: " + error.message);
    }
};


// TAB 3: BOOK APPOINTMENT
function populateBookingClinics() {
    const clinicSelect = document.getElementById('bookingClinic');
    clinicSelect.innerHTML = '<option value="">-- Select Clinic --</option>';
    cachedClinics.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.ClinicID || c.id;
        opt.textContent = c.ClinicName || c.name || `Clinic ${c.ClinicID || c.id}`;
        clinicSelect.appendChild(opt);
    });
}

window.loadCliniciansForClinic = function () {
    const clinicId = document.getElementById('bookingClinic').value;
    const clinicianSelect = document.getElementById('bookingClinician');

    if (!clinicId) {
        clinicianSelect.innerHTML = '<option value="">-- Select Clinic First --</option>';
        clinicianSelect.disabled = true;
        return;
    }

    const validStaff = cachedStaff.filter(s => String(s.StaffClinicID || s.clinic_id) === String(clinicId) && (s.StaffRoleID || s.role_id) != 1); // exclude managers if desired, or show all staff

    clinicianSelect.innerHTML = '<option value="">-- Select Clinician --</option>';

    if (validStaff.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "No clinicians available at this clinic";
        clinicianSelect.appendChild(opt);
    } else {
        validStaff.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.StaffID || s.id;
            opt.textContent = `${s.StaffFirstname || s.firstname} ${s.StaffLastname || s.lastname}`;
            clinicianSelect.appendChild(opt);
        });
    }

    clinicianSelect.disabled = false;
    if (window.loadAvailableSlots) loadAvailableSlots();
};

window.loadAvailableSlots = async function () {
    const clinicianId = document.getElementById('bookingClinician').value;
    const dateVal = document.getElementById('bookingDate').value;
    const container = document.getElementById('timeSlotsContainer');
    const hiddenTime = document.getElementById('bookingDateTime');

    hiddenTime.value = '';

    if (!clinicianId || !dateVal) {
        container.innerHTML = '<span style="color: #666; font-size: 0.9rem;">Select clinician and date to view slots</span>';
        return;
    }

    container.innerHTML = '<span><small>Loading slots...</small></span>';

    try {
        // Fetch fresh appointments for real-time availability checking
        const allApts = await api.getAppointments() || [];

        // Define default operating hours (e.g. 9 AM to 4 PM slots)
        const slots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

        // Find existing appointments for this clinician on this date
        const clinicianApts = allApts.filter(a => {
            if (String(a.AppointmentStaffID || a.staff_id) !== String(clinicianId)) return false;
            const aptDt = a.AppointmentDatetime || a.date || '';
            return aptDt.startsWith(dateVal);
        });

        const bookedTimes = clinicianApts.map(a => {
            const aptDt = a.AppointmentDatetime || a.date || '';
            if (aptDt.includes('T')) return aptDt.split('T')[1].substring(0, 5);
            if (aptDt.includes(' ')) return aptDt.split(' ')[1].substring(0, 5);
            return '';
        });

        container.innerHTML = '';
        let hasAvailable = false;

        slots.forEach(time => {
            if (!bookedTimes.includes(time)) {
                hasAvailable = true;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn';
                btn.style.background = '#e9ecef';
                btn.style.color = '#333';
                btn.style.border = '1px solid #ccc';
                btn.style.padding = '8px 12px';
                btn.textContent = time;
                btn.onclick = function () {
                    container.querySelectorAll('button').forEach(b => {
                        b.style.background = '#e9ecef';
                        b.style.color = '#333';
                    });
                    btn.style.background = '#2a9d8f';
                    btn.style.color = 'white';
                    hiddenTime.value = `${dateVal}T${time}`;
                };
                container.appendChild(btn);
            }
        });

        if (!hasAvailable) {
            container.innerHTML = '<span style="color: #d9534f; font-weight: bold;">No available slots on this date.</span>';
        }
    } catch (err) {
        container.innerHTML = `<span style="color: red;">Error fetching slots: ${err.message}</span>`;
    }
};

async function handleBookingSubmit(e) {
    e.preventDefault();

    const clinicId = document.getElementById('bookingClinic').value;
    const staffId = document.getElementById('bookingClinician').value;
    const dateTime = document.getElementById('bookingDateTime').value;

    if (!clinicId || !staffId) {
        alert("Please select both a clinic and a clinician.");
        return;
    }

    if (!dateTime) {
        alert("Please select an available time slot.");
        return;
    }

    const data = {
        AppointmentPatientID: currentUser.id,
        AppointmentClinicID: clinicId,
        AppointmentStaffID: staffId,
        AppointmentDatetime: document.getElementById('bookingDateTime').value,
        AppointmentNotes: document.getElementById('bookingNotes').value,
        AppointmentStatusID: 1 // Pending
    };

    try {
        await api.createAppointment(data);

        const successMsg = document.getElementById('bookingSuccessMessage');
        successMsg.style.display = 'block';
        document.getElementById('bookAppointmentForm').reset();
        document.getElementById('bookingClinician').disabled = true;

        await loadMyAppointments();

        setTimeout(() => { successMsg.style.display = 'none'; switchTab('my-appointments'); }, 2000);
    } catch (err) {
        alert("Error booking appointment: " + err.message);
    }
}

