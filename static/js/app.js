document.addEventListener('DOMContentLoaded', () => {
    const statusBadge = document.getElementById('global-status');
    const logList = document.getElementById('log-list');

    function logActivity(message, isError = false) {
        const li = document.createElement('li');
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        
        li.innerHTML = `<span class="time">${timeStr}</span> <span class="msg" style="${isError ? 'color: var(--error)' : ''}">${message}</span>`;
        logList.insertBefore(li, logList.firstChild);
        
        // Update badge
        statusBadge.textContent = isError ? 'Error' : 'Running...';
        statusBadge.style.color = isError ? 'var(--error)' : 'var(--success)';
        const badgeBg = isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)';
        statusBadge.style.background = badgeBg;
        
        setTimeout(() => {
            if (statusBadge.textContent === 'Running...') {
                statusBadge.textContent = 'Ready';
            }
        }, 3000);
    }

    // Tab Switching
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
            
            // Reset visualizer on tab switch if needed
            if (window.visualizer) {
                window.visualizer.pause();
            }
        });
    });

    // Form Submissions
    async function fetchSimulation(endpoint, payload, activityName) {
        logActivity(`Starting ${activityName}...`);
        try {
            const response = await fetch(`/api/simulate/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error('API Error');
            
            const sequence = await response.json();
            logActivity(`Received protocol sequence for ${activityName}. Visualizing...`);
            
            if (window.visualizer) {
                window.visualizer.loadSequence(sequence);
            }
        } catch (error) {
            logActivity(`Failed to fetch simulation: ${error.message}`, true);
        }
    }

    document.getElementById('form-browsing').addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('browse-url').value;
        fetchSimulation('browsing', { url }, `Browsing to ${url}`);
    });

    document.getElementById('form-mail').addEventListener('submit', (e) => {
        e.preventDefault();
        const to = document.getElementById('mail-to').value;
        const subject = document.getElementById('mail-subject').value;
        const body = document.getElementById('mail-body').value;
        fetchSimulation('mail', { to, subject, body }, `Sending Email to ${to}`);
    });

    document.getElementById('form-streaming').addEventListener('submit', (e) => {
        e.preventDefault();
        const quality = document.getElementById('stream-quality').value;
        fetchSimulation('streaming', { quality }, `Starting Video Stream (${quality})`);
    });
});
