document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('msg');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            msg.style.color = 'var(--success)';
            msg.textContent = data.message;
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            msg.style.color = 'var(--danger)';
            msg.textContent = data.message;
        }
    } catch (error) {
        msg.style.color = 'var(--danger)';
        msg.textContent = 'Server connection error';
    }
});
