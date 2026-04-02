const testAccounts = {
    Manager: { email: 'manager@traveljabs.com', password: 'manager123', id: 1, firstname: 'System', lastname: 'Manager', role: 'Manager' },
    Clinician: { email: 'clinician@traveljabs.com', password: 'clinician123', id: 2, firstname: 'Clinic', lastname: 'Nurse', role: 'Clinician' },
    Patient: { email: 'patient@traveljabs.com', password: 'patient123', id: 3, firstname: 'Regular', lastname: 'Patient', role: 'Patient' }
};

function getAccounts() {
    const local = localStorage.getItem('registeredAccounts');
    const registered = local ? JSON.parse(local) : {};
    return { ...testAccounts, ...registered };
}

function registerAccount(email, password, role, extraData) {
    const local = localStorage.getItem('registeredAccounts');
    let registered = local ? JSON.parse(local) : {};

    // Store using email as dictionary key to allow many patients
    registered[email] = {
        email: email,
        password: password,
        role: role,
        ...extraData
    };

    localStorage.setItem('registeredAccounts', JSON.stringify(registered));
}

function login(email, password, role) {
    const accounts = getAccounts();

    // Check if account matches either key or email prop
    let account = null;
    for (let key in accounts) {
        if (accounts[key].email === email && accounts[key].role === role) {
            account = accounts[key];
            break;
        }
    }

    if (account && account.password === password) {
        localStorage.setItem('userRole', role);
        localStorage.setItem('currentUser', JSON.stringify(account));

        if (role === 'Manager') {
            window.location.href = 'pages/manager.html';
        } else if (role === 'Clinician') {
            window.location.href = 'pages/clinician.html';
        } else if (role === 'Patient') {
            window.location.href = 'pages/patient.html';
        }
    } else {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = 'Invalid email, password, or role combination.';
            errorDiv.style.display = 'block';
        } else {
            alert('Invalid email, password, or role combination.');
        }
    }
}

function logout() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentUser');

    if (window.location.pathname.includes('/pages/')) {
        window.location.href = '../index.html';
    } else {
        window.location.href = 'index.html';
    }
}

function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

function getRole() {
    return localStorage.getItem('userRole');
}

function requireAuth() {
    const userRole = getRole();
    if (!userRole) {
        if (window.location.pathname.includes('pages/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
        return;
    }

    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath.includes('pages/')) {
        if (currentPath.includes('manager.html') && userRole !== 'Manager') {
            window.location.href = '../index.html';
        } else if (currentPath.includes('clinician.html') && userRole !== 'Clinician') {
            window.location.href = '../index.html';
        } else if (currentPath.includes('patient.html') && userRole !== 'Patient') {
            window.location.href = '../index.html';
        }
    }
}

// Call requireAuth by default except on login page
if (window.location.pathname.includes('pages/')) {
    requireAuth();
}