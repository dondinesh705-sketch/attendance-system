// Main Load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadStudents();

    // Set current date
    const now = new Date();
    document.getElementById('attYear').value = now.getFullYear();
    document.getElementById('attMonth').value = String(now.getMonth() + 1).padStart(2, '0');
});

async function checkAuth() {
    const response = await fetch('/api/auth/check');
    const data = await response.json();
    if (!data.authenticated || data.user.role !== 'admin') {
        window.location.href = '/index.html';
    }
}

function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => window.location.href = '/index.html');
}

function showSection(id) {
    document.getElementById('students-section').classList.add('hidden');
    document.getElementById('attendance-section').classList.add('hidden');
    document.getElementById(id + '-section').classList.remove('hidden');
}

// --- Students Logic ---

async function loadStudents() {
    const response = await fetch('/api/admin/students');
    const data = await response.json();
    if (data.success) {
        renderStudents(data.students);
    }
}

function renderStudents(students) {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';
    students.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td>${s.roll_number}</td>
                <td>${s.name}</td>
                <td>
                    <button class="btn btn-danger btn-small" style="width:auto" onclick="deleteStudent(${s.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

async function addStudent() {
    const name = document.getElementById('studentName').value;
    const roll_number = document.getElementById('rollNumber').value;

    if (!name || !roll_number) return alert('Fill all fields');

    const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, roll_number })
    });
    const data = await res.json();
    if (data.success) {
        document.getElementById('studentName').value = '';
        document.getElementById('rollNumber').value = '';
        loadStudents();
    } else {
        alert(data.message);
    }
}

async function deleteStudent(id) {
    if (!confirm('Delete student? All attendance data will be lost.')) return;

    await fetch(`/api/admin/students/${id}`, { method: 'DELETE' });
    loadStudents();
}

async function searchStudents() {
    const term = document.getElementById('searchBox').value;
    const response = await fetch(`/api/admin/students/search?term=${term}`);
    const data = await response.json();
    renderStudents(data.students);
}

// --- Attendance Logic ---

let currentStudents = [];
let currentAttendance = {};
let loadedYear, loadedMonth;

async function loadAttendance() {
    loadedYear = document.getElementById('attYear').value;
    loadedMonth = document.getElementById('attMonth').value;

    const res = await fetch(`/api/admin/attendance?month=${loadedMonth}&year=${loadedYear}`);
    const data = await res.json();

    if (data.success) {
        currentStudents = data.students;
        currentAttendance = data.attendance;
        renderAttendanceSheet(loadedYear, loadedMonth);
    }
}

function renderAttendanceSheet(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const isCurrentMonth = now.getFullYear() == year && (now.getMonth() + 1) == month;
    const today = now.getDate();

    const attHeader = document.getElementById('attHeader');
    const attBody = document.getElementById('attBody');

    // Headers
    let headerHTML = '<tr><th class="name-col">Student Name</th>';
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month - 1, i);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isToday = isCurrentMonth && i === today;

        const classes = [
            isWeekend ? 'weekend' : '',
            isToday ? 'today-col' : ''
        ].filter(Boolean).join(' ');

        headerHTML += `<th class="${classes}">${i}<br><small style="font-size:10px">${dayName}</small></th>`;
    }
    headerHTML += '</tr>';
    attHeader.innerHTML = headerHTML;

    // Body
    let bodyHTML = '';
    currentStudents.forEach(student => {
        bodyHTML += `<tr><td class="name-col">${student.name} <br><small>${student.roll_number}</small></td>`;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
            const status = (currentAttendance[student.id] && currentAttendance[student.id][dateStr]) || '-';

            const d = new Date(year, month - 1, day);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isToday = isCurrentMonth && day === today;

            const classes = [
                isWeekend ? 'weekend' : '',
                isToday ? 'today-col' : ''
            ].filter(Boolean).join(' ');

            const selectedP = status === 'P' ? 'selected' : '';
            const selectedA = status === 'A' ? 'selected' : '';
            const selectedL = status === 'L' ? 'selected' : '';
            const selectedNone = status === '-' ? 'selected' : '';

            bodyHTML += `
                <td class="${classes}" style="min-width: 60px;">
                    <select class="attendance-select" data-sid="${student.id}" data-date="${dateStr}" data-status="${status}" onchange="this.dataset.status=this.value">
                        <option value="" ${selectedNone}>-</option>
                        <option value="P" ${selectedP}>P</option>
                        <option value="A" ${selectedA}>A</option>
                        <option value="L" ${selectedL}>L</option>
                    </select>
                </td>
            `;
        }
        bodyHTML += '</tr>';
    });
    attBody.innerHTML = bodyHTML;
}

async function saveAttendance() {
    // Gather all changed data
    const selects = document.querySelectorAll('.attendance-select');
    const updateData = [];

    // Simple optimization: send all or track changes? sending all meaningful ones is safer for now.
    // Actually, only sending ones that have values is better.
    // But backend is UPSERT.

    // Group by Date for API efficiency? No, API takes array.

    // IMPORTANT: Let's group by date locally to avoid sending 30 requests.
    // Wait, API 'POST /attendance' takes { date, attendanceData }.
    // So one request PER DATE.
    // We should batch this client side or change API. api takes 1 date.

    // Let's modify the Loop to send one request per date? 
    // Or better: Modify API or just iterate. Iterating 30 days is okay.
    // Let's just group by Date.

    const updatesByDate = {}; // { '2023-01-01': [ {sid, status} ] }

    selects.forEach(sel => {
        if (sel.value) { // Only save P, A, or L.
            const date = sel.dataset.date;
            const sid = sel.dataset.sid;
            if (!updatesByDate[date]) updatesByDate[date] = [];
            updatesByDate[date].push({ student_id: sid, status: sel.value });
        }
    });

    // Send requests serially or parallel
    const promises = Object.keys(updatesByDate).map(date => {
        return fetch('/api/admin/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, attendanceData: updatesByDate[date] })
        });
    });

    await Promise.all(promises);
    alert('Attendance Saved Successfully');
}

function exportReport() {
    window.print();
}
