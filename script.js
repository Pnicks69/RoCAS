// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCMyS7W55x8NzBQrKVuiiYh3EDQcQZnua4",
    authDomain: "rocas-b8f4f.firebaseapp.com",
    projectId: "rocas-b8f4f",
    storageBucket: "rocas-b8f4f.firebasestorage.app",
    messagingSenderId: "76188071739",
    appId: "1:761880717397:android:bbc453f4fe59ab9afe0cdc",
    measurementId: "G-JCLKKPTYNR"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Check if user is on login page
const isLoginPage = window.location.pathname.includes('login.html');

// Admin email (you should change this to your admin email)
const ADMIN_EMAIL = 'admin@gmail.com';

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

// Authentication Functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

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
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (!user || user.email !== ADMIN_EMAIL) {
            window.location.href = 'login.html';
            return;
        }

        // Check if user document exists
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            // Create user document if it doesn't exist
            await db.collection('users').doc(user.uid).set({
                name: 'Admin',
                email: user.email,
                role: 'admin',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });

    // Navigation
    menuItems.forEach(item => {
        if (item.id === 'logoutBtn') {
            item.addEventListener('click', () => {
                auth.signOut();
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

    // Load history logs
    function loadHistory() {
        db.collection('keyHistory').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            historyTableBody.innerHTML = '';
            snapshot.forEach((doc) => {
                const log = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(log.timestamp.toDate()).toLocaleString()}</td>
                    <td>${log.instructorName}</td>
                    <td>${log.labName}</td>
                    <td>${log.action}</td>
                `;
                historyTableBody.appendChild(row);
            });
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
} 