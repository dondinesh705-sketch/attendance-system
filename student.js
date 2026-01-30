document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboard();
});

async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (!data.authenticated || data.user.role !== 'student') {
            window.location.href = '/index.html';
        }
    } catch (e) {
        window.location.href = '/index.html';
    }
}

function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => window.location.href = '/index.html');
}

async function loadDashboard() {
    try {
        const response = await fetch('/api/student/my-attendance');
        const data = await response.json();

        if (data.success) {
            const { student, attendance, summary } = data;

            // Update Profile
            document.getElementById('studentName').textContent = student.name;
            document.getElementById('studentRoll').textContent = student.roll_number;

            // Update Stats
            document.getElementById('statTotal').textContent = summary.total;
            document.getElementById('statPresent').textContent = summary.present;
            document.getElementById('statAbsent').textContent = summary.absent;
            document.getElementById('statPercentage').textContent = summary.percentage + '%';

            // Colorize Percentage
            const pElem = document.getElementById('statPercentage');
            if (parseFloat(summary.percentage) < 75) {
                pElem.style.color = 'var(--danger)';
            } else {
                pElem.style.color = 'var(--success)';
            }

            // Update Table
            const tbody = document.getElementById('attendanceHistory');
            tbody.innerHTML = '';

            attendance.forEach(record => {
                let statusBadge = '';
                if (record.status === 'P') statusBadge = '<span class="status-badge status-p">Present</span>';
                else if (record.status === 'A') statusBadge = '<span class="status-badge status-a">Absent</span>';
                else if (record.status === 'L') statusBadge = '<span class="status-badge status-l">Leave</span>';

                tbody.innerHTML += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}
