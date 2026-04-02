const BASE_URL = 'https://softwarehub.uk/unibase/traveljabs/v1/api';

async function apiRequest(method, endpoint, body = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        if (typeof body === 'object' && body !== null) {
            for (let key in body) {
                if (key.endsWith('ID') || key.endsWith('Age') || key.endsWith('Cost')) {
                    if (body[key] === '' || body[key] === null || body[key] === undefined || isNaN(Number(body[key]))) {
                        continue;
                    }
                    if (typeof body[key] === 'string' || typeof body[key] === 'number') {
                        body[key] = Number(body[key]);
                    }
                }
            }
        }
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            let errMessage = response.statusText;
            try {
                const errorData = await response.json();
                errMessage = errorData.message || errMessage;
            } catch (e) {
                // Ignore json parse error for non-json responses
            }
            throw new Error(`API Error: ${response.status} - ${errMessage}`);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`Error in apiRequest (${method} ${endpoint}):`, error);
        throw error;
    }
}

// Ready-made API functions
const api = {
    getClinics: () => apiRequest('GET', '/clinics'),
    getPatients: () => apiRequest('GET', '/patients'),
    getStaff: () => apiRequest('GET', '/staff'),
    getAppointments: () => apiRequest('GET', '/appointments'),
    getClinicAppointments: (clinicId) => apiRequest('GET', `/appointments/clinics/${clinicId}`),
    getPendingClinicAppointments: (clinicId) => apiRequest('GET', `/appointments/clinics/${clinicId}/pending`),
    getClinicStaff: (clinicId) => apiRequest('GET', `/staff/clinics/${clinicId}`),
    getClinicClinicians: (clinicId) => apiRequest('GET', `/staff/clinics/${clinicId}/clinicians`),
    getVaccines: () => apiRequest('GET', '/vaccines'),

    getVaccinations: () => apiRequest('GET', '/vaccinations'),
    getAppointmentVaccinations: (appointmentId) => apiRequest('GET', `/vaccinations/appointments/${appointmentId}`),
    createVaccination: (data) => apiRequest('POST', '/vaccinations', data),
    updateVaccination: (id, data) => apiRequest('PUT', `/vaccinations/${id}`, data),
    deleteVaccination: (id) => apiRequest('DELETE', `/vaccinations/${id}`),

    getRoles: () => apiRequest('GET', '/roles'),
    createRole: (data) => apiRequest('POST', '/roles', data),
    updateRole: (id, data) => apiRequest('PUT', `/roles/${id}`, data),
    deleteRole: (id) => apiRequest('DELETE', `/roles/${id}`),

    getStatus: () => apiRequest('GET', '/status'),
    createStatus: (data) => apiRequest('POST', '/status', data),
    updateStatus: (id, data) => apiRequest('PUT', `/status/${id}`, data),
    deleteStatus: (id) => apiRequest('DELETE', `/status/${id}`),

    getInvoices: () => apiRequest('GET', '/invoices'),
    createInvoice: (data) => apiRequest('POST', '/invoices', data),
    updateInvoice: (id, data) => apiRequest('PUT', `/invoices/${id}`, data),
    deleteInvoice: (id) => apiRequest('DELETE', `/invoices/${id}`),

    createClinic: (data) => apiRequest('POST', '/clinics', data),
    updateClinic: (id, data) => apiRequest('PUT', `/clinics/${id}`, data),
    deleteClinic: (id) => apiRequest('DELETE', `/clinics/${id}`),

    createAppointment: (data) => apiRequest('POST', '/appointments', data),
    updateAppointment: (id, data) => apiRequest('PUT', `/appointments/${id}`, data),
    deleteAppointment: (id) => apiRequest('DELETE', `/appointments/${id}`),

    createPatient: (data) => apiRequest('POST', '/patients', data),
    updatePatient: (id, data) => apiRequest('PUT', `/patients/${id}`, data),
    deletePatient: (id) => apiRequest('DELETE', `/patients/${id}`),

    createStaff: (data) => apiRequest('POST', '/staff', data),
    updateStaff: (id, data) => apiRequest('PUT', `/staff/${id}`, data),
    deleteStaff: (id) => apiRequest('DELETE', `/staff/${id}`),

    createVaccine: (data) => apiRequest('POST', '/vaccines', data),
    updateVaccine: (id, data) => apiRequest('PUT', `/vaccines/${id}`, data),
    deleteVaccine: (id) => apiRequest('DELETE', `/vaccines/${id}`)
};
