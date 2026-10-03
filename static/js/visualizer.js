class ProtocolVisualizer {
    constructor() {
        this.sequence = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.playInterval = null;
        this.animationDuration = 1200; // ms between steps
        this.currentView = 'app'; // 'app' or 'transport'

        // DOM Elements
        this.visArea = document.getElementById('vis-area');
        this.emptyState = document.getElementById('vis-empty');
        this.seqContainer = document.getElementById('sequence-container');
        this.timeline = document.getElementById('timeline');
        this.serverName = document.getElementById('server-name');
        
        this.detailsPanel = document.getElementById('message-details');
        this.detailProtocol = document.getElementById('detail-protocol');
        this.detailSummary = document.getElementById('detail-summary');
        this.detailRaw = document.getElementById('detail-raw');
        
        this.detailFlags = document.getElementById('detail-flags');
        this.detailTransportMeta = document.getElementById('detail-transport-meta');
        this.metaSeq = document.getElementById('meta-seq');
        this.metaAck = document.getElementById('meta-ack');
        this.metaWin = document.getElementById('meta-win');

        // Buttons
        this.btnPrev = document.getElementById('btn-prev');
        this.btnPlayPause = document.getElementById('btn-playpause');
        this.btnNext = document.getElementById('btn-next');
        this.btnReplay = document.getElementById('btn-replay');
        
        this.btnViewApp = document.getElementById('btn-view-app');
        this.btnViewTransport = document.getElementById('btn-view-transport');

        this.bindEvents();
    }

    bindEvents() {
        this.btnPrev.addEventListener('click', () => this.stepBackward());
        this.btnNext.addEventListener('click', () => this.stepForward());
        this.btnPlayPause.addEventListener('click', () => this.togglePlay());
        this.btnReplay.addEventListener('click', () => this.replay());
        
        this.btnViewApp.addEventListener('click', () => this.setView('app'));
        this.btnViewTransport.addEventListener('click', () => this.setView('transport'));
    }

    setView(view) {
        this.currentView = view;
        this.btnViewApp.classList.toggle('active', view === 'app');
        this.btnViewTransport.classList.toggle('active', view === 'transport');
        
        // Re-render the timeline
        if (this.sequence.length > 0) {
            this.reRenderTimeline();
        }
    }

    reRenderTimeline() {
        // Save state
        const savedIndex = this.currentIndex;
        this.pause();
        
        // Clear timeline
        const lines = this.timeline.querySelectorAll('.timeline-line');
        this.timeline.innerHTML = '';
        lines.forEach(l => this.timeline.appendChild(l));
        
        // Render up to saved index
        for (let i = 0; i <= savedIndex; i++) {
            this.currentIndex = i;
            this.renderCurrentStep(false);
        }
        
        // Update details
        if (savedIndex >= 0) {
            this.showDetails(this.sequence[savedIndex]);
        }
    }

    loadSequence(sequenceData) {
        this.sequence = sequenceData;
        this.currentIndex = -1;
        this.pause();
        
        // Update UI state
        this.emptyState.classList.add('hidden');
        this.seqContainer.classList.remove('hidden');
        this.detailsPanel.classList.add('hidden');
        
        // Enable buttons
        this.btnPlayPause.disabled = false;
        this.btnNext.disabled = false;
        this.btnReplay.disabled = false;
        this.btnPrev.disabled = true;

        // Clear existing timeline
        const lines = this.timeline.querySelectorAll('.timeline-line');
        this.timeline.innerHTML = '';
        lines.forEach(l => this.timeline.appendChild(l));

        // Determine main server name from the first non-DNS packet if possible
        const mainServer = this.sequence.find(s => s.app_layer && s.app_layer.protocol !== 'DNS' && s.receiver !== 'Client');
        this.serverName.textContent = mainServer ? mainServer.receiver : 'Server';

        // Auto-play on load
        this.play();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            if (this.currentIndex >= this.sequence.length - 1) {
                this.replay();
            } else {
                this.play();
            }
        }
    }

    play() {
        if (this.currentIndex >= this.sequence.length - 1) return;
        this.isPlaying = true;
        this.updatePlayBtnIcon();
        
        this.stepForward();
        this.playInterval = setInterval(() => {
            if (this.currentIndex >= this.sequence.length - 1) {
                this.pause();
            } else {
                this.stepForward();
            }
        }, this.animationDuration);
    }

    pause() {
        this.isPlaying = false;
        clearInterval(this.playInterval);
        this.updatePlayBtnIcon();
    }

    replay() {
        this.pause();
        // Clear rendered messages
        const lines = this.timeline.querySelectorAll('.timeline-line');
        this.timeline.innerHTML = '';
        lines.forEach(l => this.timeline.appendChild(l));
        
        this.currentIndex = -1;
        this.detailsPanel.classList.add('hidden');
        this.btnPrev.disabled = true;
        this.btnNext.disabled = false;
        this.play();
    }

    stepForward() {
        if (this.currentIndex < this.sequence.length - 1) {
            this.currentIndex++;
            this.renderCurrentStep(true);
        }
        this.updateButtonStates();
    }

    stepBackward() {
        if (this.currentIndex > 0) {
            // Remove the last rendered element
            const lastRendered = this.timeline.lastElementChild;
            if (lastRendered && lastRendered.classList.contains('message-row')) {
                this.timeline.removeChild(lastRendered);
            }
            this.currentIndex--;
            this.showDetails(this.sequence[this.currentIndex]);
        } else if (this.currentIndex === 0) {
            const lastRendered = this.timeline.lastElementChild;
            if (lastRendered && lastRendered.classList.contains('message-row')) {
                this.timeline.removeChild(lastRendered);
            }
            this.currentIndex = -1;
            this.detailsPanel.classList.add('hidden');
        }
        this.updateButtonStates();
    }

    renderCurrentStep(animate = true) {
        const step = this.sequence[this.currentIndex];
        
        const row = document.createElement('div');
        row.className = `message-row dir-${step.direction}`;
        
        let protocol = '';
        let summary = '';
        
        if (this.currentView === 'app') {
            if (step.app_layer) {
                protocol = step.app_layer.protocol;
                summary = step.app_layer.summary;
            } else {
                protocol = step.transport_layer.protocol;
                summary = "Transport Layer Event"; // fallback, shouldn't really happen with our new data
            }
        } else {
            protocol = step.transport_layer.protocol;
            // Generate summary from flags or app layer
            if (protocol === 'TCP' && step.transport_layer.flags.length > 0) {
                summary = `[${step.transport_layer.flags.join(',')}]`;
                if (step.transport_layer.flags.includes('PSH') && step.app_layer) {
                    summary += ` ${step.app_layer.protocol}`;
                }
            } else if (protocol === 'UDP') {
                summary = `Datagram (${step.app_layer ? step.app_layer.protocol : 'Data'})`;
            } else {
                summary = `${protocol} Packet`;
            }
        }
        
        row.dataset.protocol = protocol;
        
        row.innerHTML = `
            <div class="message-label">${protocol}: ${summary}</div>
            <div class="message-arrow"></div>
            ${animate ? '<div class="message-particle"></div>' : ''}
        `;
        
        this.timeline.appendChild(row);
        
        if (animate) {
            // Trigger reflow for animation
            void row.offsetWidth;
            row.classList.add('visible');
        } else {
            row.style.opacity = 1;
            row.style.transform = 'translateY(0)';
        }

        // Auto-scroll
        this.visArea.scrollTop = this.visArea.scrollHeight;

        this.showDetails(step);
    }

    showDetails(step) {
        this.detailsPanel.classList.remove('hidden');
        
        // Reset flags
        this.detailFlags.innerHTML = '';
        
        if (this.currentView === 'app') {
            const layer = step.app_layer || step.transport_layer;
            this.detailProtocol.textContent = layer.protocol;
            this.detailProtocol.className = `protocol-badge proto-${layer.protocol.toLowerCase()}`;
            this.detailSummary.textContent = layer.summary || layer.protocol;
            this.detailRaw.textContent = layer.details;
            this.detailTransportMeta.classList.add('hidden');
        } else {
            const layer = step.transport_layer;
            this.detailProtocol.textContent = layer.protocol;
            this.detailProtocol.className = `protocol-badge proto-${layer.protocol.toLowerCase()}`;
            
            let summary = '';
            if (layer.protocol === 'TCP') {
                summary = `Segment`;
                // Add flags
                layer.flags.forEach(flag => {
                    const pill = document.createElement('span');
                    pill.className = `flag-pill flag-${flag.toLowerCase()}`;
                    pill.textContent = flag;
                    this.detailFlags.appendChild(pill);
                });
                
                this.metaSeq.textContent = layer.seq;
                this.metaAck.textContent = layer.ack;
                this.metaWin.textContent = layer.win;
                this.detailTransportMeta.classList.remove('hidden');
            } else {
                summary = `Datagram`;
                this.detailTransportMeta.classList.add('hidden');
            }
            
            this.detailSummary.textContent = summary;
            
            // Raw details (Ports) + App Data
            let detailsText = layer.details;
            if (step.app_layer) {
                detailsText += `\n\n[Payload: ${step.app_layer.protocol}]\n${step.app_layer.details}`;
            }
            this.detailRaw.textContent = detailsText;
        }
    }

    updateButtonStates() {
        this.btnPrev.disabled = this.currentIndex <= -1;
        this.btnNext.disabled = this.currentIndex >= this.sequence.length - 1;
        if (this.currentIndex >= this.sequence.length - 1 && this.isPlaying) {
            this.pause();
        }
    }

    updatePlayBtnIcon() {
        const svg = this.isPlaying ? 
            `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>` : 
            `<svg class="icon-play" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
        this.btnPlayPause.innerHTML = svg;
    }
}

// Make it globally available
window.visualizer = new ProtocolVisualizer();
