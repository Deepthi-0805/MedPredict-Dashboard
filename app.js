// DOM Elements
const symptomInput = document.getElementById('symptom-input');
const tagsContainer = document.getElementById('tags-container');
const suggestionsBox = document.getElementById('suggestions');
const clearBtn = document.getElementById('clear-btn');
const predictBtn = document.getElementById('predict-btn');
const emptyState = document.getElementById('empty-state');
const loader = document.getElementById('loader');
const predictionsList = document.getElementById('predictions-list');
const aiStatus = document.getElementById('ai-status');
const patientNameInput = document.getElementById('patient-name');
const patientAgeInput = document.getElementById('patient-age');
const showAddPatientBtn = document.getElementById('show-add-patient-btn');
const cancelAddPatientBtn = document.getElementById('cancel-add-patient-btn');
const savePatientBtn = document.getElementById('save-patient-btn');
const addPatientForm = document.getElementById('add-patient-form-container');
const patientsGrid = document.getElementById('patients-grid');
const historyTbody = document.getElementById('history-tbody');

// State
let selectedSymptoms = [];

// Databases
let patientsDB = JSON.parse(localStorage.getItem('medpredict_patients')) || [];
let historyDB = JSON.parse(localStorage.getItem('medpredict_history')) || [];
// Mock Database of common symptoms for autocomplete
const availableSymptoms = [
    "fever", "cough", "fatigue", "headache", "nausea", "vomiting",
    "shortness of breath", "loss of taste", "loss of smell", "muscle ache",
    "chills", "sore throat", "runny nose", "chest pain", "dizziness",
    "rash", "joint pain", "stomach ache", "sneezing", "congestion",
    "weight loss", "night sweats", "wheezing", "frequent urination",
    "excessive thirst", "blurred vision", "palpitations", "abdominal pain",
    "pale skin", "weakness", "diarrhea", "blisters", "red eyes", "loss of appetite"
];

// Mock Disease mapping (Simple rule engine for demonstration)
const diseaseDatabase = [
    { name: "COVID-19", symptoms: ["fever", "cough", "fatigue", "loss of taste", "loss of smell", "shortness of breath", "muscle ache"], severity: "High" },
    { name: "Common Cold", symptoms: ["cough", "sore throat", "runny nose", "sneezing", "congestion"], severity: "Low" },
    { name: "Influenza (Flu)", symptoms: ["fever", "chills", "muscle ache", "fatigue", "headache", "cough"], severity: "Medium" },
    { name: "Migraine", symptoms: ["headache", "nausea", "dizziness", "vomiting"], severity: "Medium" },
    { name: "Food Poisoning", symptoms: ["nausea", "vomiting", "stomach ache", "fever", "fatigue"], severity: "Medium" },
    { name: "Malaria", symptoms: ["fever", "chills", "headache", "nausea", "vomiting", "muscle ache"], severity: "High" },
    { name: "Dengue", symptoms: ["fever", "headache", "muscle ache", "joint pain", "nausea", "rash"], severity: "High" },
];

// Initialize
function init() {
    setupEventListeners();
    updateButtonState();
    renderPatients();
    renderHistory();

    const notifyBtn = document.getElementById('notify-btn');
    const notifyDot = document.querySelector('.notify-dot');
    const notifyDropdown = document.getElementById('notify-dropdown');
    const notifyList = document.getElementById('notify-list');

    // Enforce Role-Based Access Control
    try {
        const session = JSON.parse(localStorage.getItem('medpredict_auth'));
        if (session && session.role === 'user') {
            document.querySelector('[data-target="view-history"]').style.display = 'none';
            document.querySelector('[data-target="view-patients"]').style.display = 'none';
            document.querySelector('.user-name').textContent = 'Clinical User';
            document.querySelector('.user-role').textContent = 'Standard Access';
            document.querySelector('.user-profile .avatar').textContent = 'CU';
        }

        // Unified Notification System
        if (session) {
            let notifs = JSON.parse(localStorage.getItem('medpredict_notifications')) || [];
            let unread = notifs.filter(n => !n.read);

            if (unread.length > 0) notifyDot.style.display = 'block';
            else notifyDot.style.display = 'none';

            // Clear functionality
            const clearNotifsBtn = document.getElementById('clear-notifs-btn');
            if (clearNotifsBtn) {
                clearNotifsBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent closing dropdown or toggling other things
                    localStorage.setItem('medpredict_notifications', JSON.stringify([]));
                    notifs = [];
                    notifyList.innerHTML = '<div style="color:var(--text-muted); padding:0.5rem 0;">No system alerts.</div>';
                    notifyDot.style.display = 'none';
                });
            }

            notifyBtn.addEventListener('click', () => {
                if (notifyDropdown.style.display === 'none') {
                    notifyDropdown.style.display = 'block';
                    notifyList.innerHTML = '';

                    if (notifs.length === 0) {
                        notifyList.innerHTML = '<div style="color:var(--text-muted); padding:0.5rem 0;">No system alerts.</div>';
                    } else {
                        // Show newest first
                        [...notifs].reverse().forEach(n => {
                            let color = n.read ? 'var(--text-muted)' : 'var(--accent-cyan)';
                            notifyList.innerHTML += `<div style="padding:0.75rem 0; border-bottom:1px solid rgba(255,255,255,0.05); color:${color};">
                                <i class="fa-solid fa-circle-info"></i> <strong>${n.message}</strong><br>
                                <small style="color:var(--text-muted); margin-left: 1.25rem;">${n.time}</small>
                            </div>`;
                        });
                    }

                    // Mark read
                    notifs.forEach(n => n.read = true);
                    localStorage.setItem('medpredict_notifications', JSON.stringify(notifs));
                    notifyDot.style.display = 'none';
                } else {
                    notifyDropdown.style.display = 'none';
                }
            });

            // Close dropdown if clicking outside
            document.addEventListener('click', (e) => {
                if (notifyDropdown && notifyBtn && !e.target.closest('#notify-btn') && !e.target.closest('#notify-dropdown')) {
                    notifyDropdown.style.display = 'none';
                }
            });
        }
    } catch (e) { console.error('Auth parse error:', e); }
}

function setupEventListeners() {
    // Focus input when clicking anywhere in the tags container
    tagsContainer.addEventListener('click', (e) => {
        if (e.target === tagsContainer) symptomInput.focus();
    });

    symptomInput.addEventListener('input', handleInput);
    symptomInput.addEventListener('keydown', handleKeydown);
    clearBtn.addEventListener('click', clearAllTags);
    predictBtn.addEventListener('click', runPrediction);

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.symptom-input-container')) {
            suggestionsBox.style.display = 'none';
        }
    });
}

// Input Handling
function handleInput(e) {
    const value = e.target.value.toLowerCase().trim();
    if (!value) {
        suggestionsBox.style.display = 'none';
        return;
    }

    const matches = availableSymptoms.filter(sym =>
        sym.includes(value) && !selectedSymptoms.includes(sym)
    );

    renderSuggestions(matches);
}

function handleKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const value = symptomInput.value.toLowerCase().trim();
        // If there's an exact or partial match in suggestions, pick it, else allow custom tag
        if (value && !selectedSymptoms.includes(value)) {
            addTag(value);
        }
    } else if (e.key === 'Backspace' && symptomInput.value === '' && selectedSymptoms.length > 0) {
        // Delete last tag
        removeTag(selectedSymptoms[selectedSymptoms.length - 1]);
    }
}

// Tag Management
function addTag(symptom) {
    selectedSymptoms.push(symptom);
    symptomInput.value = '';
    suggestionsBox.style.display = 'none';
    renderTags();
    updateButtonState();
    resetResults();
}

function removeTag(symptom) {
    selectedSymptoms = selectedSymptoms.filter(s => s !== symptom);
    renderTags();
    updateButtonState();
    resetResults();
}

function clearAllTags() {
    selectedSymptoms = [];
    renderTags();
    updateButtonState();
    resetResults();
}

// Rendering
function renderTags() {
    // Remove all existing tag elements
    document.querySelectorAll('.tag').forEach(el => el.remove());

    // Insert new tags before the input field
    selectedSymptoms.forEach(sym => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `${sym} <i class="fa-solid fa-xmark"></i>`;
        tag.querySelector('i').addEventListener('click', () => removeTag(sym));
        tagsContainer.insertBefore(tag, symptomInput);
    });
}

function renderSuggestions(matches) {
    suggestionsBox.innerHTML = '';
    if (matches.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    matches.forEach(match => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = match;
        div.addEventListener('click', () => {
            addTag(match);
            symptomInput.focus();
        });
        suggestionsBox.appendChild(div);
    });
    suggestionsBox.style.display = 'block';
}

function updateButtonState() {
    predictBtn.disabled = selectedSymptoms.length === 0;
}

function resetResults() {
    emptyState.style.display = 'block';
    loader.style.display = 'none';
    predictionsList.style.display = 'none';
    predictionsList.innerHTML = '';
    aiStatus.textContent = 'Waiting for input';
    aiStatus.classList.remove('active');
}

// Real ML Prediction Logic (Decision Tree & Random Forest Hybrid)
async function runPrediction() {
    if (selectedSymptoms.length === 0) return;

    const pName = patientNameInput.value.trim();
    if (!pName) {
        alert("Please provide a Patient Name before scanning.");
        patientNameInput.focus();
        return;
    }

    // UI Updates
    emptyState.style.display = 'none';
    predictionsList.style.display = 'none';
    loader.style.display = 'block';
    aiStatus.textContent = 'Analyzing with Hybrid ML Models...';
    aiStatus.classList.add('active');

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms: selectedSymptoms })
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        loader.style.display = 'none';
        renderResults(data.results);

        aiStatus.textContent = `Analysis Complete (Ensemble choice: ${data.hybrid_choice})`;
        predictionsList.style.display = 'flex';

        // Log to history dataset
        const bestMatch = data.results[0];
        const record = {
            id: 'P-' + Math.floor(Math.random() * 9000 + 1000),
            name: pName,
            age: patientAgeInput.value || "N/A",
            date: new Date().toLocaleString(),
            primaryDisease: bestMatch.name,
            confidence: bestMatch.score,
            status: bestMatch.severity === 'High' ? 'Review Pending' : 'Archived'
        };
        historyDB.unshift(record); // Add to top
        localStorage.setItem('medpredict_history', JSON.stringify(historyDB));
        renderHistory();

        // Update/Add Patient in directory
        let pIndex = patientsDB.findIndex(p => p.name.toLowerCase() === pName.toLowerCase());
        if (pIndex !== -1) {
            patientsDB[pIndex].lastDiagnosis = bestMatch.name;
            patientsDB[pIndex].severity = bestMatch.severity;
        } else {
            patientsDB.push({
                name: pName,
                age: patientAgeInput.value || "N/A",
                gender: "Unspecified",
                lastDiagnosis: bestMatch.name,
                severity: bestMatch.severity
            });
        }
        localStorage.setItem('medpredict_patients', JSON.stringify(patientsDB));
        renderPatients();

    } catch (error) {
        console.error("Error fetching prediction:", error);
        loader.style.display = 'none';
        aiStatus.textContent = 'Error during analysis';
        predictionsList.innerHTML = '<div style="color:var(--danger); text-align:center; padding: 2rem;">Failed to connect to ML backend. Is the Python server running?</div>';
        predictionsList.style.display = 'flex';
    }
}

function renderResults(results) {
    predictionsList.innerHTML = '';

    if (results.length === 0) {
        predictionsList.innerHTML = `<div style="text-align:center; padding: 2rem 0;">No confident matches found. Try adding more specific symptoms.</div>`;
        return;
    }

    results.forEach((res, index) => {
        // Different colors based on severity
        let color = '#64ffda'; // Safe
        if (res.severity === 'Medium') color = '#f59e0b'; // Warning
        if (res.severity === 'High') color = '#ef4444'; // Danger

        // Top match is always cyan in this theme, letting severity badge handle colors is better, but let's color the bar
        let barColor = index === 0 ? 'var(--accent-cyan)' : color;

        const card = document.createElement('div');
        card.className = 'prediction-card';
        card.innerHTML = `
            <div class="prediction-header">
                <span class="disease-name">${res.name}</span>
                <span class="match-score">${res.score}% Confidence</span>
            </div>
            <div class="match-bar-bg">
                <div class="match-bar-fill" style="width: 0%; background-color: ${barColor}"></div>
            </div>
            ${res.severity === 'High' ? `<div class="warning-indicator"><i class="fa-solid fa-triangle-exclamation"></i> High Severity - Medical attention advised</div>` : ''}
        `;

        predictionsList.appendChild(card);

        // Trigger animation after append
        setTimeout(() => {
            card.querySelector('.match-bar-fill').style.width = res.score + '%';
        }, 50);
    });
}

// --- Data Renderers ---
function renderHistory() {
    historyTbody.innerHTML = '';
    if (historyDB.length === 0) {
        // Note: Colspan updated to 5
        historyTbody.innerHTML = '<tr><td colspan="5" style="padding:1rem; text-align:center; color:var(--text-muted);">No scan history available.</td></tr>';
        return;
    }
    historyDB.forEach(record => {
        let statusBadge = '';
        if (record.status === 'Review Pending') {
            statusBadge = `<span class="status-badge" style="background: rgba(239, 68, 68, 0.2); color: var(--danger);">${record.status}</span>`;
        } else if (record.status === 'Approved') {
            statusBadge = `<span class="status-badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">${record.status}</span>`;
        } else {
            statusBadge = `<span class="status-badge" style="background: rgba(136, 146, 176, 0.2); color: var(--text-muted);">${record.status}</span>`;
        }

        historyTbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 1rem;">${record.date}</td>
                <td style="padding: 1rem;">${record.id} <br><small style="color:var(--text-muted)">${record.name}</small></td>
                <td style="padding: 1rem;">${record.primaryDisease}</td>
                <td style="padding: 1rem; color: var(--accent-cyan);">${record.confidence}%</td>
                <td style="padding: 1rem;">${statusBadge}</td>
            </tr>
        `;
    });
}

function renderPatients(searchQuery = '') {
    patientsGrid.innerHTML = '';

    // Filter logic
    const filteredDB = patientsDB.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (patientsDB.length === 0) {
        patientsGrid.innerHTML = '<div style="color:var(--text-muted);">No patients in directory.</div>';
        return;
    }
    if (filteredDB.length === 0) {
        patientsGrid.innerHTML = '<div style="color:var(--text-muted);">No patients match your search.</div>';
        return;
    }

    filteredDB.forEach(patient => {
        let initials = patient.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        patientsGrid.innerHTML += `
            <div style="border: 1px solid var(--panel-border); padding: 1.5rem; border-radius: var(--radius-md); background: rgba(0,0,0,0.2);">
                <div style="display:flex; align-items:center; gap:1rem; margin-bottom: 1rem;">
                    <div class="avatar" style="background: var(--accent-blue);">${initials}</div>
                    <div>
                        <div style="font-weight:600;">${patient.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">Age ${patient.age}, ${patient.gender}</div>
                    </div>
                </div>
                <div style="font-size:0.85rem; margin-bottom: 0.5rem;"><strong style="color:var(--text-muted);">Last Diagnosis:</strong> ${patient.lastDiagnosis || 'None'}</div>
                <div style="display:flex; gap:0.5rem; margin-top: 0.5rem;">
                    <button class="glow-btn" style="flex:2; padding: 0.5rem; font-size: 0.8rem;" onclick="approveRecord('${patient.name.replace(/'/g, "\\'")}')">View / Approve</button>
                    <button class="clear-btn" style="flex:1; padding: 0.5rem; font-size: 0.8rem; color:var(--danger); border-color:rgba(239, 68, 68, 0.3);" onclick="deletePatient('${patient.name.replace(/'/g, "\\'")}')"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
    });
}

// --- Patient Data Deletion ---
window.deletePatient = function (patientName) {
    if (confirm(`Are you sure you want to delete patient "${patientName}"?`)) {
        patientsDB = patientsDB.filter(p => p.name.toLowerCase() !== patientName.toLowerCase());
        localStorage.setItem('medpredict_patients', JSON.stringify(patientsDB));
        renderPatients();
    }
};

window.deleteHistoryRecord = function (recordId) {
    if (confirm(`Delete scan record ${recordId}?`)) {
        historyDB = historyDB.filter(r => r.id !== recordId);
        localStorage.setItem('medpredict_history', JSON.stringify(historyDB));
        renderHistory();
    }
};

// --- Record Approval Logic ---
window.approveRecord = function (patientName) {
    let hasUpdates = false;

    // Find all pending history records for this patient and approve them
    historyDB.forEach(record => {
        if (record.name.toLowerCase() === patientName.toLowerCase() && record.status === 'Review Pending') {
            record.status = 'Approved';
            hasUpdates = true;
        }
    });

    if (hasUpdates) {
        localStorage.setItem('medpredict_history', JSON.stringify(historyDB));
        renderHistory();
    }

    // Auto-navigate to history tab to show the approved records
    document.querySelector('[data-target="view-history"]').click();
};

// --- Add Patient Modal Logic ---
showAddPatientBtn.addEventListener('click', () => {
    addPatientForm.style.display = 'block';
});
cancelAddPatientBtn.addEventListener('click', () => {
    addPatientForm.style.display = 'none';
});
savePatientBtn.addEventListener('click', () => {
    let name = document.getElementById('new-patient-name').value.trim();
    let age = document.getElementById('new-patient-age').value;
    let gender = document.getElementById('new-patient-gender').value;

    if (!name) return alert("Name is required");

    patientsDB.push({ name, age: age || 'N/A', gender, lastDiagnosis: 'N/A' });
    localStorage.setItem('medpredict_patients', JSON.stringify(patientsDB));
    renderPatients();

    // Clear & close
    document.getElementById('new-patient-name').value = '';
    document.getElementById('new-patient-age').value = '';
    addPatientForm.style.display = 'none';
});

// --- History Clear Logic ---
const clearHistoryBtn = document.getElementById('clear-history-btn');
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear ALL patient scan history?")) {
            historyDB = [];
            localStorage.setItem('medpredict_history', JSON.stringify(historyDB));
            renderHistory();
        }
    });
}

// SPA Navigation Logic

const navItems = document.querySelectorAll('.nav-item[data-target]');
const spaViews = document.querySelectorAll('.spa-view');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        // Remove active class from all links
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

        // Add active class to clicked link
        item.classList.add('active');

        // Hide all views
        spaViews.forEach(view => view.style.display = 'none');

        // Show target view
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).style.display = 'block';
    });
});

// Logout Logic
document.getElementById('nav-logout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('medpredict_auth');
    window.location.href = 'login.html';
});

// Top header buttons
document.getElementById('new-scan-btn').addEventListener('click', () => {
    // Navigate back to Dashboard and clear fields
    document.querySelector('[data-target="view-dashboard"]').click();
    clearAllTags();
});

// Top Search Bar Logic
const topSearchBar = document.getElementById('top-search-bar');
if (topSearchBar) {
    topSearchBar.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        // Auto-navigate to patients tab if they start typing
        if (query.length > 0) {
            document.querySelector('[data-target="view-patients"]').click();
        }

        renderPatients(query);
    });
}

// Start
init();
