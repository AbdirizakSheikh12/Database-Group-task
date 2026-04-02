requireAuth();

const currentUser = getCurrentUser();

let cachedAppointments = [];
let cachedPatients = [];
let cachedClinics = [];
let cachedVaccines = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();

    loadMyAppointments();
    loadMyVaccinations();

    document.getElementById('outcomeForm').addEventListener('submit', handleOutcomeSubmit);
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`tab-btn-${tabId}`).classList.add('active');
}

async function loadInitialData() {
    try {
        const [patients, clinics, vaccines] = await Promise.all([
            api.getPatients().catch(() => []),
            api.getClinics().catch(() => []),
            api.getVaccines().catch(() => [])
        ]);

        cachedPatients = patients || [];
        cachedClinics = clinics || [];
        cachedVaccines = vaccines || [];

        // Load vaccine dropdown in form
        const vacSelect = document.getElementById('VaccinationVaccineID');
        vacSelect.innerHTML = '<option value="">-- Select Vaccine --</option>';
        cachedVaccines.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.VaccineID || v.id;
            opt.textContent = v.VaccineName || v.name || `Vaccine ${v.VaccineID || v.id}`;
            vacSelect.appendChild(opt);
        });

    } catch (e) {
        console.error("Error loading reference data", e);
    }
}

function getCachedName(cache, idProp, idVal, nameProp1, nameProp2) {
    if (!idVal) return 'N/A';
    const item = cache.find(x => String(x[idProp]) === String(idVal));
    if (!item) return `ID: ${idVal}`;
    let name = item[nameProp1] || item[nameProp1.replace('Patient', '').toLowerCase()] || item.name || item.firstname || '';
    if (nameProp2) {
        let n2 = item[nameProp2] || item[nameProp2.replace('Patient', '').toLowerCase()] || item.lastname || '';
        if (n2) name += ' ' + n2;
    }
    return name;
}

// ================= MY APPOINTMENTS =================
async function loadMyAppointments() {
    try {
        const allApts = await api.getAppointments() || [];
        // Show all appointments as requested
        cachedAppointments = allApts;

        renderAppointments(cachedAppointments);

        // Populate Appointment Dropdown for Outcome Form
        const aptSelect = document.getElementById('VaccinationAppointmentID');
        aptSelect.innerHTML = '<option value="">-- Select Appointment --</option>';
        cachedAppointments.forEach(apt => {
            const aptId = apt.AppointmentID || apt.id;
            const patientName = getCachedName(cachedPatients, 'id', apt.AppointmentPatientID, 'PatientFirstname', 'PatientLastname');
            const ptDate = apt.AppointmentDatetime || apt.date || 'N/A';
            const opt = document.createElement('option');
            opt.value = aptId;
            opt.textContent = `Apt #${aptId} - ${patientName} (${ptDate})`;
            aptSelect.appendChild(opt);
        });

    } catch (error) {
        document.getElementById('appointmentsList').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function renderAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    if (!appointments.length) {
        container.innerHTML = '<p>No appointments assigned to you.</p>';
        return;
    }

    let html = '<table><thead><tr><th>ID</th><th>Patient Name</th><th>Date/Time</th><th>Clinic</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead><tbody>';
    appointments.forEach(apt => {
        const aptId = apt.AppointmentID || apt.id;
        const patientName = getCachedName(cachedPatients, 'id', apt.AppointmentPatientID, 'PatientFirstname', 'PatientLastname');
        const clinicName = getCachedName(cachedClinics, 'id', apt.AppointmentClinicID, 'name');

        let statusID = parseInt(apt.AppointmentStatusID || apt.status || 1);
        let badgeClass = 'badge-grey';
        let statusText = 'Pending';
        if (statusID === 2 || statusID === 4) { badgeClass = 'badge-orange'; statusText = 'In Progress'; } // Let's use 4 for In Progress just in case, but map anything to badge
        else if (statusID === 3 || statusID === 5) { badgeClass = 'badge-green'; statusText = 'Completed'; } // Assume 3 or 5 means completed

        // Exact matching logic for In Progress (assuming 4) and Completed (assuming 5)
        if (statusID === 1) { statusText = 'Pending'; badgeClass = 'badge-grey'; }
        if (statusID === 4) { statusText = 'In Progress'; badgeClass = 'badge-orange'; }
        if (statusID === 5) { statusText = 'Completed'; badgeClass = 'badge-green'; }

        const notes = apt.AppointmentNotes || apt.notes || '';

        html += `<tr>
            <td>${aptId}</td>
            <td>${patientName}</td>
            <td>${apt.AppointmentDatetime || apt.date || 'N/A'}</td>
            <td>${clinicName}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td>${notes}</td>
            <td>
                <button class="btn btn-action btn-progress" onclick="updateAptStatus(${aptId}, 4)">Mark In Progress</button>
                <button class="btn btn-action btn-complete" onclick="updateAptStatus(${aptId}, 5)">Mark Completed</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function updateAptStatus(id, newStatusId) {
    try {
        const apt = cachedAppointments.find(a => String(a.AppointmentID || a.id) === String(id));
        if (!apt) return;
        const data = {
            AppointmentDatetime: apt.AppointmentDatetime,
            AppointmentPatientID: apt.AppointmentPatientID,
            AppointmentClinicID: apt.AppointmentClinicID,
            AppointmentStaffID: apt.AppointmentStaffID,
            AppointmentStatusID: newStatusId
        };
        await api.updateAppointment(id, data);
        loadMyAppointments(); // Refresh current list
    } catch (err) {
        alert("Error updating status: " + err.message);
    }
}

// ================= RECORD OUTCOME =================
async function handleOutcomeSubmit(e) {
    e.preventDefault();

    // Hide previous success message
    const successMsg = document.getElementById('outcomeSuccess');
    successMsg.style.display = 'none';

    const appointmentId = Number(document.getElementById('VaccinationAppointmentID').value);
    const vaccineId = Number(document.getElementById('VaccinationVaccineID').value);
    const selectedOutcome = document.querySelector('input[name="VaccinationOutcomeID"]:checked');
    const outcomeId = selectedOutcome ? Number(selectedOutcome.value) : NaN;

    if (!Number.isFinite(appointmentId) || !Number.isFinite(vaccineId) || !Number.isFinite(outcomeId)) {
        alert('Please select appointment, vaccine, and outcome before saving.');
        return;
    }

    const vaccine = cachedVaccines.find(v => String(v.VaccineID || v.id) === String(vaccineId));

    const data = {
        VaccinationAppointmentID: appointmentId,
        VaccinationVaccineID: vaccineId,
        VaccinationOutcomeID: outcomeId,
        VaccinationVaccineName: vaccine ? (vaccine.VaccineName || vaccine.name || '') : "",
        VaccinationVaccineCost: vaccine ? (vaccine.VaccineCost || vaccine.cost || 0) : 0
    };

    try {
        await api.createVaccination(data);

        // Also auto-complete the appointment
        const aptId = data.VaccinationAppointmentID;
        const apt = cachedAppointments.find(a => String(a.AppointmentID || a.id) === String(aptId));
        if (apt) {
            const aptData = {
                AppointmentDatetime: apt.AppointmentDatetime,
                AppointmentPatientID: apt.AppointmentPatientID,
                AppointmentClinicID: apt.AppointmentClinicID,
                AppointmentStaffID: apt.AppointmentStaffID,
                AppointmentStatusID: 5
            }; // Marked completed
            await api.updateAppointment(aptId, aptData);
        }

        successMsg.style.display = 'block';
        document.getElementById('outcomeForm').reset();

        loadMyAppointments(); // Refresh apps
        loadMyVaccinations(); // Refresh recorded vaccines list

        setTimeout(() => { successMsg.style.display = 'none'; }, 3000);
    } catch (err) {
        // Fallback catch block
        if (typeof alert === "function") alert("Error saving record: " + err.message);
        console.error(err);
    }
}

async function loadMyVaccinations() {
    try {
        const vaccinations = await api.getVaccinations() || [];
        const container = document.getElementById('vaccinationsList');

        // Filter the vacs array where the Appointment ID is inside my apts
        const myAptIds = cachedAppointments.map(a => a.id);
        const myVacs = vaccinations.filter(v => {
            const vAptId = v.VaccinationAppointmentID || v.appointment_id || v.AppointmentID;
            return myAptIds.includes(parseInt(vAptId));
        });

        if (!myVacs || myVacs.length === 0) {
            container.innerHTML = '<p>No vaccination logs found for your appointments.</p>';
            return;
        }

        let html = '<table><thead><tr><th>ID</th><th>Appt ID</th><th>Vaccine</th><th>Outcome</th><th>Notes</th></tr></thead><tbody>';
        myVacs.forEach(v => {
            const vacName = getCachedName(cachedVaccines, 'id', v.VaccinationVaccineID || v.vaccine_id, 'VaccineName');
            const outcomeID = parseInt(v.VaccinationOutcomeID || v.outcome_id || 1);
            const outcomeText = outcomeID === 1 ? 'Yes' : (outcomeID === 2 ? 'No' : `Status ${outcomeID}`);
            const notes = v.VaccinationNotes || v.notes || '';
            const aptId = v.VaccinationAppointmentID || v.appointment_id || v.AppointmentID || 'N/A';

            html += `<tr>
                <td>${v.id}</td>
                <td>${aptId}</td>
                <td>${vacName}</td>
                <td>${outcomeText}</td>
                <td>${notes}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        document.getElementById('vaccinationsList').innerHTML = `<p style="color: red;">Error loading vaccinations: ${error.message}</p>`;
    }
}

// ================= MY SCHEDULE & SLOTS =================
async function loadMySchedule() {
    const dateVal = document.getElementById('clinicianScheduleDate').value;
    const container = document.getElementById('clinicianScheduleGrid');

    if (!dateVal) {
        container.innerHTML = '<p>Select a date to view your schedule.</p>';
        return;
    }

    container.innerHTML = '<p>Loading schedule...</p>';
    container.style.display = 'block';

    const slots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

    const myAptsToday = cachedAppointments.filter(a => {
        const dt = a.AppointmentDatetime || a.date || '';
        return dt.startsWith(dateVal);
    });

    container.innerHTML = '';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(4, 1fr)';
    container.style.gap = '10px';

    slots.forEach(time => {
        const aptAtTime = myAptsToday.find(a => {
            const dt = a.AppointmentDatetime || a.date || '';
            const t = dt.includes('T') ? dt.split('T')[1].substring(0, 5) : dt.split(' ')[1].substring(0, 5);
            return t === time;
        });

        const slotDiv = document.createElement('div');
        slotDiv.style.border = '1px solid #ccc';
        slotDiv.style.padding = '15px';
        slotDiv.style.borderRadius = '5px';
        slotDiv.style.textAlign = 'center';

        if (aptAtTime) {
            const pName = getCachedName(cachedPatients, 'id', aptAtTime.AppointmentPatientID, 'PatientFirstname', 'PatientLastname');
            slotDiv.style.backgroundColor = '#f8d7da'; // Booked/Red
            slotDiv.style.borderColor = '#f5c6cb';
            slotDiv.innerHTML = `<strong>${time}</strong><br><span style="font-size: 0.85rem; color: #721c24;">Booked: ${pName}</span>`;
        } else {
            slotDiv.style.backgroundColor = '#d4edda'; // Available/Green
            slotDiv.style.borderColor = '#c3e6cb';
            slotDiv.innerHTML = `<strong>${time}</strong><br><span style="font-size: 0.85rem; color: #155724;">Available</span>`;
        }

        container.appendChild(slotDiv);
    });
}