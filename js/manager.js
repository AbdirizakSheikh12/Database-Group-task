requireAuth();

let cachedPatients = [];
let cachedClinics = [];
let cachedStaff = [];
let cachedRoles = [];
let cachedAppointments = [];
let cachedVaccines = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();

    loadAppointmentsList();
    loadStaffList();
    loadPatientsList();
    loadVaccinesList();

    document.getElementById('appointmentForm').addEventListener('submit', handleAppointmentSubmit);
    document.getElementById('staffForm').addEventListener('submit', handleStaffSubmit);
    document.getElementById('patientForm').addEventListener('submit', handlePatientSubmit);
    document.getElementById('vaccineForm').addEventListener('submit', handleVaccineSubmit);
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`tab-btn-${tabId}`).classList.add('active');
}

async function loadInitialData() {
    try {
        const [patients, clinics, staff, roles, vaccines] = await Promise.all([
            api.getPatients().catch(() => []),
            api.getClinics().catch(() => []),
            api.getStaff().catch(() => []),
            api.getRoles().catch(() => []),
            api.getVaccines().catch(() => [])
        ]);

        cachedPatients = patients || [];
        cachedClinics = clinics || [];
        cachedStaff = staff || [];
        cachedRoles = roles || [];
        cachedVaccines = vaccines || [];

        populateDropdown('AppointmentPatientID', cachedPatients, 'id', 'PatientFirstname', 'PatientLastname');
        populateDropdown('AppointmentClinicID', cachedClinics, 'id', 'name');
        populateDropdown('AppointmentStaffID', cachedStaff, 'id', 'StaffFirstname', 'StaffLastname');
        populateDropdown('scheduleClinicianSelect', cachedStaff.filter(s => s.role_id !== 1 && s.StaffRoleID !== 1), 'id', 'StaffFirstname', 'StaffLastname');
        populateDropdown('AptStaffFilter', cachedStaff.filter(s => s.role_id !== 1 && s.StaffRoleID !== 1), 'id', 'StaffFirstname', 'StaffLastname');
        document.getElementById('AptStaffFilter').options[0].text = "All Clinicians/Staff";
        populateDropdown('StaffRoleID', cachedRoles, 'id', 'name');
        populateDropdown('StaffClinicID', cachedClinics, 'id', 'name');
    } catch (e) {
        console.error("Error loading reference data", e);
    }
}

function populateDropdown(selectId, items, valProp, labelProp1, labelProp2) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">-- Select --</option>';
    items.forEach(item => {
        const opt = document.createElement('option');

        let val = item[valProp];
        if (val === undefined) val = item.id;
        if (val === undefined) val = item.RoleID || item.role_id || item.ClinicID || item.clinic_id || item.StaffID || item.staff_id || item.PatientID || item.patient_id || '';
        opt.value = val !== undefined ? val : '';

        let text = item[labelProp1] || item[labelProp1.replace('Patient', '').toLowerCase()] || item.firstname || item.name || item.ClinicName || item.RoleName || item.RoleTitle || '';
        let text2 = labelProp2 ? (item[labelProp2] || item[labelProp2.replace('Patient', '').toLowerCase()] || item.lastname || '') : '';
        if (text2) text += ' ' + text2;
        opt.textContent = text;
        select.appendChild(opt);
    });
}

function getCachedName(cache, idProp, idVal, nameProp1, nameProp2) {
    if (!idVal) return 'N/A';
    const item = cache.find(x => String(x[idProp] || x.PatientID || x.ClinicID || x.StaffID || x.RoleID || x.VaccineID || x.id) === String(idVal));
    if (!item) return `ID: ${idVal}`;
    let name = item[nameProp1] || item[nameProp1.replace('Staff', '').replace('Patient', '').toLowerCase()] || item.name || item.firstname || item.ClinicName || item.RoleName || item.RoleTitle || '';
    if (nameProp2) {
        let n2 = item[nameProp2] || item[nameProp2.replace('Staff', '').replace('Patient', '').toLowerCase()] || item.lastname || '';
        if (n2) name += ' ' + n2;
    }
    return name;
}

// ================= APPOINTMENTS =================
async function loadAppointmentsList() {
    try {
        const appointments = await api.getAppointments();
        cachedAppointments = appointments || [];
        filterAppointmentsList();
    } catch (error) {
        document.getElementById('appointmentsList').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function filterAppointmentsList() {
    const staffId = document.getElementById('AptStaffFilter').value;
    if (!staffId) {
        renderAppointments(cachedAppointments);
    } else {
        const filtered = cachedAppointments.filter(apt => String(apt.AppointmentStaffID || apt.staff_id) === String(staffId));
        renderAppointments(filtered);
    }
}

function renderAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    if (!appointments.length) { container.innerHTML = '<p>No appointments found.</p>'; return; }

    let html = '<table><thead><tr><th>ID</th><th>Patient Name</th><th>Clinic</th><th>Date/Time</th><th>Staff Name</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead><tbody>';
    appointments.forEach(apt => {
        const patientName = getCachedName(cachedPatients, 'id', apt.AppointmentPatientID || apt.patient_id, 'PatientFirstname', 'PatientLastname');
        const clinicName = getCachedName(cachedClinics, 'id', apt.AppointmentClinicID || apt.clinic_id, 'name');
        const staffName = getCachedName(cachedStaff, 'id', apt.AppointmentStaffID || apt.staff_id, 'StaffFirstname', 'StaffLastname');
        let status = 'Scheduled';
        if (apt.AppointmentStatusID === 2) status = 'Arrived';
        else if (apt.AppointmentStatusID === 3) status = 'No-Show';
        else if (apt.AppointmentStatusID === 4) status = 'In Progress';
        else if (apt.AppointmentStatusID === 5) status = 'Completed';
        const notes = apt.AppointmentNotes || apt.notes || '';

        html += `<tr>
            <td>${apt.AppointmentID || (apt.AppointmentID || apt.id)}</td><td>${patientName}</td><td>${clinicName}</td>
            <td>${apt.AppointmentDatetime || apt.date || 'N/A'}</td><td>${staffName}</td><td>${status}</td><td>${notes}</td>
            <td class="action-btns">
                <button class="btn btn-edit" onclick="editAppointment(${apt.AppointmentID || (apt.AppointmentID || apt.id)})">Edit</button>
                <button class="btn btn-delete" onclick="deleteAppointmentAction(${apt.AppointmentID || (apt.AppointmentID || apt.id)})">Delete</button>
                <br><button class="btn" style="background:#28a745; color:white; font-size:0.8rem; padding:2px 5px; margin-top:5px;" onclick="updateAptStatus(${apt.AppointmentID || (apt.AppointmentID || apt.id)}, 2)">Mark Arrived</button>
                <button class="btn" style="background:#6c757d; color:white; font-size:0.8rem; padding:2px 5px; margin-top:5px;" onclick="updateAptStatus(${apt.AppointmentID || (apt.AppointmentID || apt.id)}, 3)">Mark No-Show</button>
                <button class="btn" style="background:#2a9d8f; color:white; font-size:0.8rem; padding:2px 5px; margin-top:5px;" onclick="viewOutcomes(${apt.AppointmentID || (apt.AppointmentID || apt.id)})">View Outcomes</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function showAppointmentForm() {
    document.getElementById('appointmentForm').reset();
    document.getElementById('apt-id').value = '';
    document.getElementById('apt-form-title').innerText = 'New Appointment';
    document.getElementById('appointment-form-section').style.display = 'block';
}

function hideAppointmentForm() { document.getElementById('appointment-form-section').style.display = 'none'; }

function editAppointment(id) {
    const apt = cachedAppointments.find(a => String(a.AppointmentID || a.id) === String(id));
    if (!apt) return;
    document.getElementById('apt-id').value = (apt.AppointmentID || apt.id);
    let dt = apt.AppointmentDatetime || apt.date || '';
    if (dt && dt.includes('Z')) dt = dt.substring(0, 16);
    document.getElementById('AppointmentDatetime').value = dt;
    document.getElementById('AppointmentPatientID').value = apt.AppointmentPatientID || apt.patient_id || '';
    document.getElementById('AppointmentClinicID').value = apt.AppointmentClinicID || apt.clinic_id || '';
    document.getElementById('AppointmentStaffID').value = apt.AppointmentStaffID || apt.staff_id || '';
    document.getElementById('AppointmentNotes').value = apt.AppointmentNotes || apt.notes || '';
    document.getElementById('apt-form-title').innerText = 'Edit Appointment';
    document.getElementById('appointment-form-section').style.display = 'block';
}

async function handleAppointmentSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('apt-id').value;
    const data = {
        AppointmentDatetime: document.getElementById('AppointmentDatetime').value,
        AppointmentPatientID: document.getElementById('AppointmentPatientID').value,
        AppointmentClinicID: document.getElementById('AppointmentClinicID').value,
        AppointmentStaffID: document.getElementById('AppointmentStaffID').value,
        AppointmentNotes: document.getElementById('AppointmentNotes').value,
        AppointmentStatusID: 1
    };
    try {
        if (id) await api.updateAppointment(id, data); else await api.createAppointment(data);
        hideAppointmentForm(); loadAppointmentsList();
    } catch (err) { alert("Error: " + err.message); }
}

async function deleteAppointmentAction(id) {
    if (!confirm('Delete appointment?')) return;
    try { await api.deleteAppointment(id); loadAppointmentsList(); } catch (err) { alert("Error: " + err.message); }
}

async function updateAptStatus(id, statusId) {
    try {
        const apt = cachedAppointments.find(a => String(a.AppointmentID || a.id) === String(id));
        if (!apt) return;
        const data = { AppointmentDatetime: apt.AppointmentDatetime, AppointmentPatientID: apt.AppointmentPatientID, AppointmentClinicID: apt.AppointmentClinicID, AppointmentStaffID: apt.AppointmentStaffID, AppointmentStatusID: statusId, AppointmentNotes: apt.AppointmentNotes };
        await api.updateAppointment(id, data);
        loadAppointmentsList();
    } catch (err) { alert("Error: " + err.message); }
}

async function viewOutcomes(aptId) {
    try {
        const vaccinations = await api.getAppointmentVaccinations(aptId);
        if (!vaccinations || vaccinations.length === 0) {
            alert("No vaccinations or outcome notes found for this appointment.");
            return;
        }
        let message = `Outcomes for Appointment #${aptId}:\n\n`;
        vaccinations.forEach(v => {
            const vacName = v.VaccinationVaccineName || getCachedName(cachedVaccines, 'id', v.VaccinationVaccineID, 'VaccineName');
            const outcomeName = v.VaccinationOutcomeID === 1 ? 'Given' : (v.VaccinationOutcomeID === 2 ? 'Refused' : 'Pending');
            message += `- Vaccine: ${vacName}\n  Outcome: ${outcomeName}\n\n`;
        });
        alert(message);
    } catch (err) {
        alert("Error fetching outcomes: " + err.message);
    }
}

// ================= STAFF =================
async function loadStaffList() {
    try {
        const staff = await api.getStaff();
        cachedStaff = staff || [];
        renderStaff();
    } catch (error) { document.getElementById('staffList').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`; }
}

function renderStaff() {
    const container = document.getElementById('staffList');
    if (!cachedStaff.length) { container.innerHTML = '<p>No staff found.</p>'; return; }

    let html = '<table><thead><tr><th>ID</th><th>First Name</th><th>Last Name</th><th>Role</th><th>Clinic</th><th>Actions</th></tr></thead><tbody>';
    cachedStaff.forEach(s => {
        const clinicName = getCachedName(cachedClinics, 'id', s.StaffClinicID || s.clinic_id, 'name');
        const roleName = getCachedName(cachedRoles, 'id', s.StaffRoleID || s.role_id, 'name');
        html += `<tr>
            <td>${s.id}</td><td>${s.StaffFirstname || s.firstname || s.name || ''}</td><td>${s.StaffLastname || s.lastname || ''}</td>
            <td>${roleName}</td><td>${clinicName}</td>
            <td class="action-btns"><button class="btn btn-edit" onclick="editStaff(${s.StaffID || s.id})">Edit</button><button class="btn btn-delete" onclick="deleteStaffAction(${s.StaffID || s.id})">Delete</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function showStaffForm() {
    document.getElementById('staffForm').reset();
    document.getElementById('staff-id').value = '';
    document.getElementById('staff-form-title').innerText = 'New Staff';
    document.getElementById('staff-form-section').style.display = 'block';
}

function hideStaffForm() { document.getElementById('staff-form-section').style.display = 'none'; }

function editStaff(id) {
    const s = cachedStaff.find(x => String(x.StaffID || x.id) === String(id));
    if (!s) return;
    document.getElementById('staff-id').value = s.StaffID || s.id;
    document.getElementById('StaffFirstname').value = s.StaffFirstname || s.firstname || s.name || '';
    document.getElementById('StaffLastname').value = s.StaffLastname || s.lastname || '';
    document.getElementById('StaffRoleID').value = s.StaffRoleID || s.role_id || '';
    document.getElementById('StaffClinicID').value = s.StaffClinicID || s.clinic_id || '';
    document.getElementById('staff-form-title').innerText = 'Edit Staff';
    document.getElementById('staff-form-section').style.display = 'block';
}

async function handleStaffSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('staff-id').value;
    const data = {
        StaffFirstname: document.getElementById('StaffFirstname').value,
        StaffLastname: document.getElementById('StaffLastname').value,
        StaffRoleID: document.getElementById('StaffRoleID').value,
        StaffClinicID: document.getElementById('StaffClinicID').value
    };
    try {
        if (id) await api.updateStaff(id, data); else await api.createStaff(data);
        hideStaffForm(); loadStaffList(); loadInitialData();
    } catch (err) { alert("Error: " + err.message); }
}

async function deleteStaffAction(id) {
    if (!confirm('Delete staff?')) return;
    try { await api.deleteStaff(id); loadStaffList(); loadInitialData(); } catch (err) { alert("Error: " + err.message); }
}

// ================= PATIENTS =================
async function loadPatientsList() {
    try {
        const patients = await api.getPatients();
        cachedPatients = patients || [];
        renderPatients(cachedPatients);
    } catch (error) { document.getElementById('patientsList').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`; }
}

function renderPatients(patients) {
    const container = document.getElementById('patientsList');
    if (!patients.length) { container.innerHTML = '<p>No patients found.</p>'; return; }

    let html = '<table><thead><tr><th>ID</th><th>First Name</th><th>Last Name</th><th>Address</th><th>Postcode</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
    patients.forEach(p => {
        html += `<tr>
              <td>${p.PatientID || p.id}</td><td>${p.PatientFirstname || p.firstname || ''}</td><td>${p.PatientLastname || p.lastname || ''}</td>
              <td>${p.PatientAddress || p.address || ''}</td><td>${p.PatientPostcode || p.postcode || ''}</td><td>${p.PatientAge || p.age || ''}</td>
              <td class="action-btns"><button class="btn btn-edit" onclick="editPatient(${p.PatientID || p.id})">Edit</button><button class="btn btn-delete" onclick="deletePatientAction(${p.PatientID || p.id})">Delete</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function filterPatients() {
    const term = document.getElementById('patientSearch').value.toLowerCase();
    const filtered = cachedPatients.filter(p => {
        const fName = (p.PatientFirstname || p.firstname || '').toLowerCase();
        const lName = (p.PatientLastname || p.lastname || '').toLowerCase();
        return fName.includes(term) || lName.includes(term);
    });
    renderPatients(filtered);
}

function showPatientForm() {
    document.getElementById('patientForm').reset();
    document.getElementById('patient-id').value = '';
    document.getElementById('patient-form-title').innerText = 'New Patient';
    document.getElementById('patient-form-section').style.display = 'block';
}

function hidePatientForm() { document.getElementById('patient-form-section').style.display = 'none'; }

function editPatient(id) {
    const p = cachedPatients.find(x => String(x.PatientID || x.id) === String(id));
    if (!p) return;
    document.getElementById('patient-id').value = p.PatientID || p.id;
    document.getElementById('PatientFirstname').value = p.PatientFirstname || p.firstname || '';
    document.getElementById('PatientLastname').value = p.PatientLastname || p.lastname || '';
    document.getElementById('PatientAddress').value = p.PatientAddress || p.address || '';
    document.getElementById('PatientPostcode').value = p.PatientPostcode || p.postcode || '';
    document.getElementById('PatientAge').value = p.PatientAge || p.age || '';
    document.getElementById('patient-form-title').innerText = 'Edit Patient';
    document.getElementById('patient-form-section').style.display = 'block';
}

async function handlePatientSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('patient-id').value;
    const data = {
        PatientFirstname: document.getElementById('PatientFirstname').value,
        PatientLastname: document.getElementById('PatientLastname').value,
        PatientAddress: document.getElementById('PatientAddress').value,
        PatientPostcode: document.getElementById('PatientPostcode').value,
        PatientAge: document.getElementById('PatientAge').value
    };
    try {
        if (id) await api.updatePatient(id, data); else await api.createPatient(data);
        hidePatientForm(); loadPatientsList(); loadInitialData();
    } catch (err) { alert("Error: " + err.message); }
}

async function deletePatientAction(id) {
    if (!confirm('Delete patient?')) return;
    try { await api.deletePatient(id); loadPatientsList(); loadInitialData(); } catch (err) { alert("Error: " + err.message); }
}

// ================= SCHEDULE / AVAILABILITY =================
window.loadManagerSchedule = function () {
    const clinicianId = document.getElementById('scheduleClinicianSelect').value;
    const dateVal = document.getElementById('scheduleDateSelect').value;
    const container = document.getElementById('managerScheduleGrid');

    if (!clinicianId || !dateVal) {
        container.innerHTML = '<p>Please select both a clinician and a date.</p>';
        return;
    }

    container.innerHTML = '<p>Loading capacity...</p>';
    container.style.display = 'block';

    const slots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

    // Find appointments for selected clinician and date
    const clinicianApts = cachedAppointments.filter(a => {
        if (String(a.AppointmentStaffID || a.staff_id) !== String(clinicianId)) return false;
        const dt = a.AppointmentDatetime || a.date || '';
        return dt.startsWith(dateVal);
    });

    container.innerHTML = '';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(4, 1fr)';
    container.style.gap = '10px';

    slots.forEach(time => {
        const aptAtTime = clinicianApts.find(a => {
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
            const ptName = getCachedName(cachedPatients, 'id', aptAtTime.AppointmentPatientID || aptAtTime.patient_id, 'PatientFirstname', 'PatientLastname');
            slotDiv.style.backgroundColor = '#f8d7da';
            slotDiv.style.borderColor = '#f5c6cb';
            slotDiv.innerHTML = `<strong>${time}</strong><br><span style="font-size: 0.85rem; color: #721c24;">Booked: ${ptName}</span>`;
        } else {
            slotDiv.style.backgroundColor = '#d4edda';
            slotDiv.style.borderColor = '#c3e6cb';
            slotDiv.innerHTML = `<strong>${time}</strong><br><span style="font-size: 0.85rem; color: #155724;">Open Slot</span>`;
        }

        container.appendChild(slotDiv);
    });
};

// ================= VACCINES =================
async function loadVaccinesList() {
    try {
        const vacs = await api.getVaccines();
        cachedVaccines = vacs || [];
        renderVaccines();
    } catch (error) { document.getElementById('vaccinesList').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`; }
}

function renderVaccines() {
    const container = document.getElementById('vaccinesList');
    if (!cachedVaccines.length) { container.innerHTML = '<p>No vaccines found.</p>'; return; }

    let html = '<table><thead><tr><th>ID</th><th>Vaccine Name</th><th>Cost</th><th>Actions</th></tr></thead><tbody>';
    cachedVaccines.forEach(v => {
        html += `<tr>
              <td>${v.VaccineID || v.id}</td><td>${v.VaccineName || v.name || ''}</td><td>£${v.VaccineCost || v.cost || '0.00'}</td>
              <td class="action-btns"><button class="btn btn-edit" onclick="editVaccine(${v.VaccineID || v.id})">Edit</button><button class="btn btn-delete" onclick="deleteVaccineAction(${v.VaccineID || v.id})">Delete</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function showVaccineForm() {
    document.getElementById('vaccineForm').reset();
    document.getElementById('vaccine-id').value = '';
    document.getElementById('vaccine-form-title').innerText = 'New Vaccine';
    document.getElementById('vaccine-form-section').style.display = 'block';
}

function hideVaccineForm() { document.getElementById('vaccine-form-section').style.display = 'none'; }

function editVaccine(id) {
    const v = cachedVaccines.find(x => String(x.VaccineID || x.id) === String(id));
    if (!v) return;
    document.getElementById('vaccine-id').value = v.VaccineID || v.id;
    document.getElementById('VaccineName').value = v.VaccineName || v.name || '';
    document.getElementById('VaccineCost').value = v.VaccineCost || v.cost || '';
    document.getElementById('vaccine-form-title').innerText = 'Edit Vaccine';
    document.getElementById('vaccine-form-section').style.display = 'block';
}

async function handleVaccineSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('vaccine-id').value;
    const data = {
        VaccineName: document.getElementById('VaccineName').value,
        VaccineCost: document.getElementById('VaccineCost').value
    };
    try {
        if (id) await api.updateVaccine(id, data); else await api.createVaccine(data);
        hideVaccineForm(); loadVaccinesList();
    } catch (err) { alert("Error: " + err.message); }
}

async function deleteVaccineAction(id) {
    if (!confirm('Delete vaccine?')) return;
    try { await api.deleteVaccine(id); loadVaccinesList(); } catch (err) { alert("Error: " + err.message); }
}
