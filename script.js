// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA_XswSFWplRKqETekIAWVNS_Pv7KZeB2A",
    authDomain: "rocas-971d4.firebaseapp.com",
    projectId: "rocas-971d4",
    storageBucket: "rocas-971d4.firebasestorage.app",
    messagingSenderId: "166813619378",
    appId: "1:166813619378:web:a6f673f04a5ea36440e5ab",
    measurementId: "G-B4V47ZNWCH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Check if user is on login page
const isLoginPage = window.location.pathname.includes('login.html');

// Admin email (you should change this to your admin email)
const ADMIN_EMAIL = 'admin@gmail.com';

// Authentication state management
let currentUser = null;
let isAuthenticated = false;

// Function to check authentication status and redirect if needed
async function checkAuthenticationStatus() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe(); // Unsubscribe after first check
            
            if (!user) {
                // No user is signed in
                if (!isLoginPage) {
                    console.log('No user authenticated, redirecting to login');
                    window.location.href = 'login.html';
                    return;
                }
                resolve(false);
                return;
            }

            // User is signed in, check if it's the admin
            if (user.email !== ADMIN_EMAIL) {
                console.log('Unauthorized user, signing out and redirecting to login');
                await auth.signOut();
                if (!isLoginPage) {
                    window.location.href = 'login.html';
                    return;
                }
                resolve(false);
                return;
            }

            // Valid admin user
            currentUser = user;
            isAuthenticated = true;
            
            // If on login page and authenticated, redirect to dashboard
            if (isLoginPage) {
                console.log('User already authenticated, redirecting to dashboard');
                window.location.href = 'index.html';
                return;
            }

            // Update user document in Firestore
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    // Create user document if it doesn't exist
                    await db.collection('users').doc(user.uid).set({
                        name: 'Admin',
                        email: user.email,
                        role: 'admin',
                        permissions: ['read', 'write', 'delete', 'manage_users'],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Update last login time
                    await db.collection('users').doc(user.uid).update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            } catch (error) {
                console.error('Error updating user document:', error);
            }

            resolve(true);
        });
    });
}

// Initialize authentication check on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthenticationStatus();
});

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loginButtonText = document.getElementById('loginButtonText');
const loginSpinner = document.getElementById('loginSpinner');

// Navigation
const menuItems = document.querySelectorAll('.menu-item');
const pages = document.querySelectorAll('.page');
const logoutBtn = document.getElementById('logoutBtn');

// Room Management
const roomsTableBody = document.getElementById('roomsTableBody');
const addRoomBtn = document.getElementById('addRoomBtn');
const roomModal = document.getElementById('roomModal');
const roomForm = document.getElementById('roomForm');
const modalTitle = document.getElementById('modalTitle');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');

// History Logs
const historyTableBody = document.getElementById('historyTableBody');

// Key Requests
const requestsTableBody = document.getElementById('requestsTableBody');

// Authentication Functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Role and Permission Management
async function checkUserPermissions(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error checking permissions:', error);
        return null;
    }
}

function hasPermission(userData, permission) {
    return userData && userData.permissions && userData.permissions.includes(permission);
}

// Function to create users with specific roles
async function createUserWithRole(email, password, role, permissions) {
    try {
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            name: email.split('@')[0], // Use email prefix as name
            email: email,
            role: role,
            permissions: permissions,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return user;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

// Example usage:
// createUserWithRole('manager@example.com', 'password123', 'manager', ['read', 'write'])
// createUserWithRole('viewer@example.com', 'password123', 'viewer', ['read'])

function hideError() {
    errorMessage.classList.add('hidden');
}

function showLoading() {
    loginButtonText.style.display = 'none';
    loginSpinner.classList.remove('hidden');
}

function hideLoading() {
    loginButtonText.style.display = 'block';
    loginSpinner.classList.add('hidden');
}

// Login Page
if (isLoginPage) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        showLoading();

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            if (email !== ADMIN_EMAIL) {
                throw new Error('Unauthorized access');
            }

            // Sign in with Firebase Auth
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Check if user document exists in Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                // Create user document if it doesn't exist
                await db.collection('users').doc(user.uid).set({
                    name: 'Admin',
                    email: email,
                    role: 'admin',
                    permissions: ['read', 'write', 'delete', 'manage_users'],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Update existing user with admin role if needed
                await db.collection('users').doc(user.uid).update({
                    role: 'admin',
                    permissions: ['read', 'write', 'delete', 'manage_users'],
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            window.location.href = 'index.html';
        } catch (error) {
            showError('Invalid email or password');
            hideLoading();
        }
    });
}

// Admin Dashboard
if (!isLoginPage) {
    // Set up authentication state listener for dashboard
    auth.onAuthStateChanged(async (user) => {
        if (!user || user.email !== ADMIN_EMAIL) {
            console.log('User not authenticated or not admin, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        // User is authenticated and is admin, proceed with dashboard functionality
        currentUser = user;
        isAuthenticated = true;

        // Check if user document exists
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            // Create user document if it doesn't exist
            await db.collection('users').doc(user.uid).set({
                name: 'Admin',
                email: user.email,
                role: 'admin',
                permissions: ['read', 'write', 'delete', 'manage_users'],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Update last login time
            await db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Check which page we're on and initialize accordingly
        const isHistoryPage = window.location.pathname.includes('history.html');
        
        if (isHistoryPage) {
            initializeHistoryPage();
        } else {
            initializeDashboard();
        }
    });

    // Function to initialize history page functionality
    function initializeHistoryPage() {
        // Navigation
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = 'login.html';
                });
            });
        }

        // Load history logs
        function loadHistory() {
            db.collection('keyHistory').orderBy('timestamp', 'desc').limit(100).onSnapshot((snapshot) => {
                const historyTableBody = document.getElementById('historyTableBody');
                if (!historyTableBody) return;
                
                historyTableBody.innerHTML = '';
                snapshot.forEach((doc) => {
                    const log = doc.data();
                    let dateStr = '';
                    if (log.timestamp) {
                        if (typeof log.timestamp.toDate === 'function') {
                            dateStr = new Date(log.timestamp.toDate()).toLocaleString();
                        } else {
                            dateStr = new Date(log.timestamp).toLocaleString();
                        }
                    }
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${dateStr}</td>
                        <td>${log.instructorName || ''}</td>
                        <td>${log.labName || ''}</td>
                        <td>${log.action || ''}</td>
                    `;
                    historyTableBody.appendChild(row);
                });
            }, (error) => {
                console.error('Error loading history:', error);
                // If there's an index error, Firebase will show a link to create the required index
                if (error.code === 'failed-precondition') {
                    console.log('Index required. Check Firebase console for index creation link.');
                }
            });
        }

        // Initial load
        loadHistory();
    }

    // Function to initialize dashboard functionality
    function initializeDashboard() {
        // Navigation
        menuItems.forEach(item => {
            if (item.id === 'logoutBtn') {
                item.addEventListener('click', () => {
                    auth.signOut().then(() => {
                        window.location.href = 'login.html';
                    });
                });
            }
        });

        // Room Management
        let editingRoomId = null;

        // Load rooms
        function loadRooms() {
            db.collection('labs').onSnapshot((snapshot) => {
                roomsTableBody.innerHTML = '';
                snapshot.forEach((doc) => {
                    const room = doc.data();
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${room.labName || 'Unnamed Lab'}</td>
                        <td>${room.building || 'Unknown Building'}</td>
                        <td>${room.status || 'Available'}</td>
                        <td>${room.status === 'Unavailable' ? (room.keyHolder || room.unavailableBy || 'Unknown') : '-'}</td>
                        <td>
                            <button class="action-btn edit-btn" data-id="${doc.id}">
                                <span class="material-icons">edit</span>
                            </button>
                            <button class="action-btn delete-btn" data-id="${doc.id}">
                                <span class="material-icons">delete</span>
                            </button>
                        </td>
                    `;
                    roomsTableBody.appendChild(row);
                });

                // Add event listeners to buttons
                document.querySelectorAll('.edit-btn').forEach(btn => {
                    btn.addEventListener('click', () => editRoom(btn.dataset.id));
                });

                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', () => deleteRoom(btn.dataset.id));
                });
            });
        }

        // Load key requests
        function loadKeyRequests() {
            db.collection('keyRequests')
              .where('status', '==', 'pending')
              .orderBy('requestedAt', 'desc')
              .onSnapshot(snapshot => {
                requestsTableBody.innerHTML = '';
                snapshot.forEach(doc => {
                    const req = doc.data();
                    let dateStr = '';
                    if (req.requestedAt) {
                        if (typeof req.requestedAt.toDate === 'function') {
                            dateStr = new Date(req.requestedAt.toDate()).toLocaleString();
                        } else {
                            dateStr = new Date(req.requestedAt).toLocaleString();
                        }
                    }
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${dateStr}</td>
                        <td>${req.labName || ''}</td>
                        <td>${req.requesterName || ''}</td>
                        <td>${req.status || ''}</td>
                        <td>
                            <button class="action-btn accept-btn" onclick="acceptKeyRequest('${doc.id}', '${req.labId}', '${req.requesterName}')">Accept</button>
                            <button class="action-btn deny-btn" onclick="denyKeyRequest('${doc.id}', '${req.requesterName}')">Deny</button>
                        </td>
                    `;
                    requestsTableBody.appendChild(row);
                });
            });
        }

        // Load history logs
        function loadHistory() {
            db.collection('keyHistory').orderBy('timestamp', 'desc').limit(100).onSnapshot((snapshot) => {
                historyTableBody.innerHTML = '';
                snapshot.forEach((doc) => {
                    const log = doc.data();
                    let dateStr = '';
                    if (log.timestamp) {
                        if (typeof log.timestamp.toDate === 'function') {
                            dateStr = new Date(log.timestamp.toDate()).toLocaleString();
                        } else {
                            dateStr = new Date(log.timestamp).toLocaleString();
                        }
                    }
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${dateStr}</td>
                        <td>${log.instructorName || ''}</td>
                        <td>${log.labName || ''}</td>
                        <td>${log.action || ''}</td>
                    `;
                    historyTableBody.appendChild(row);
                });
            }, (error) => {
                console.error('Error loading history:', error);
                // If there's an index error, Firebase will show a link to create the required index
                if (error.code === 'failed-precondition') {
                    console.log('Index required. Check Firebase console for index creation link.');
                }
            });
        }

        // Add/Edit Room
        addRoomBtn.addEventListener('click', () => {
            editingRoomId = null;
            modalTitle.textContent = 'Add Room';
            roomForm.reset();
            roomModal.style.display = 'flex';
        });

        function editRoom(roomId) {
            editingRoomId = roomId;
            modalTitle.textContent = 'Edit Room';
            
            db.collection('labs').doc(roomId).get().then((doc) => {
                const room = doc.data();
                document.getElementById('roomName').value = room.labName || '';
                document.getElementById('building').value = room.building || '';
                roomModal.style.display = 'flex';
            });
        }

        function deleteRoom(roomId) {
            if (confirm('Are you sure you want to delete this room?')) {
                db.collection('labs').doc(roomId).delete();
            }
        }

        // Modal handlers
        closeModal.addEventListener('click', () => {
            roomModal.style.display = 'none';
        });

        cancelBtn.addEventListener('click', () => {
            roomModal.style.display = 'none';
        });

        roomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const roomData = {
                labName: document.getElementById('roomName').value,
                building: document.getElementById('building').value,
                status: 'Available',
                currentUser: null
            };

            try {
                if (editingRoomId) {
                    await db.collection('labs').doc(editingRoomId).update(roomData);
                } else {
                    await db.collection('labs').add(roomData);
                }
                roomModal.style.display = 'none';
            } catch (error) {
                console.error('Error saving room:', error);
                alert('Error saving room. Please try again.');
            }
        });

        // Initial load
        loadRooms();
        loadHistory();
        loadKeyRequests();
    }
}

// Global functions for key requests
window.acceptKeyRequest = async function(requestId, labId, requesterName) {
    try {
        // Update lab status
        await db.collection('labs').doc(labId).update({
            status: 'Unavailable',
            unavailableBy: requesterName,
            keyHolder: requesterName,
            keyTakenAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update request status
        await db.collection('keyRequests').doc(requestId).update({
            status: 'accepted',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Add to history
        const labDoc = await db.collection('labs').doc(labId).get();
        await db.collection('keyHistory').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            instructorName: requesterName,
            labName: labDoc.data().labName,
            action: 'Request Accepted - Room Occupied'
        });

        alert('Key request accepted!');
    } catch (error) {
        console.error('Error accepting key request:', error);
        alert('Error accepting key request. Please try again.');
    }
};

window.denyKeyRequest = async function(requestId, requesterName) {
    try {
        await db.collection('keyRequests').doc(requestId).update({
            status: 'denied',
            deniedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Optionally, add to history
        alert('Key request denied!');
    } catch (error) {
        console.error('Error denying key request:', error);
        alert('Error denying key request. Please try again.');
    }
};