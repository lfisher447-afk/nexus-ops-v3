class NexusClient {
    constructor() {
        this.apiUrl = window.location.origin; // Adapts to localhost, Render, or Vercel
        this.currentUrl = "";
        this.console = document.getElementById('consoleOutput');
        this.initBtn = document.getElementById('initBtn');
        this.input = document.getElementById('targetUrl');
        
        this.bindEvents();
        this.checkSystem();
    }

    async checkSystem() {
        this.log("Connecting to Nexus Backend...", "warn");
        try {
            const res = await fetch(`${this.apiUrl}/api/status`);
            const data = await res.json();
            document.getElementById('sysStatus').innerText = "SYSTEM: ONLINE";
            document.getElementById('sysStatus').style.color = "#00ff41";
            this.log(`CONNECTED: ${data.system} [${data.time}]`, "success");
            this.ping();
        } catch (e) {
            this.log("CRITICAL ERROR: BACKEND OFFLINE", "error");
            document.getElementById('sysStatus').innerText = "SYSTEM: OFFLINE";
            document.getElementById('sysStatus').style.color = "red";
        }
    }

    ping() {
        const start = Date.now();
        fetch(`${this.apiUrl}/api/status`).then(() => {
            const ms = Date.now() - start;
            document.getElementById('latency').innerText = `PING: ${ms}ms`;
        });
    }

    bindEvents() {
        this.initBtn.addEventListener('click', () => this.initSequence());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.initSequence();
        });
    }

    log(msg, type = "info") {
        const time = new Date().toLocaleTimeString('en-US', {hour12: false});
        const div = document.createElement('div');
        div.className = `log-line ${type}`;
        div.innerHTML = `<span style="opacity:0.5">[${time}]</span> ${msg}`;
        this.console.appendChild(div);
        this.console.scrollTop = this.console.scrollHeight;
    }

    async initSequence() {
        const url = this.input.value.trim();
        if (!url.includes('docs.google.com')) {
            this.log("ERROR: INVALID TARGET URL", "error");
            return;
        }

        this.currentUrl = url;
        this.log("TARGET ACQUIRED. INITIATING HANDSHAKE...", "warn");
        
        try {
            // 1. Get Metadata
            const metaRes = await fetch(`${this.apiUrl}/api/meta?url=${encodeURIComponent(url)}`);
            const meta = await metaRes.json();
            
            if (meta.error) throw new Error(meta.error);

            this.log(`ID LOCKED: ${meta.docId}`, "success");
            this.log(`TITLE: ${meta.title}`);
            document.getElementById('docTitle').innerText = meta.title.toUpperCase();

            // 2. Unlock UI
            document.getElementById('toolsPanel').classList.remove('disabled');
            
            // 3. Load Default View
            this.setMode('mobilebasic');

        } catch (e) {
            this.log(`SEQUENCE FAILED: ${e.message}`, "error");
        }
    }

    setMode(mode) {
        this.log(`SWITCHING VISUALIZER TO: ${mode.toUpperCase()}`);
        const loader = document.getElementById('loader');
        const frame = document.getElementById('mainFrame');
        
        loader.style.display = 'flex';
        frame.style.opacity = '0';

        // Use our Backend Proxy to load the content
        frame.src = `${this.apiUrl}/api/proxy?url=${encodeURIComponent(this.currentUrl)}&mode=${mode}`;

        frame.onload = () => {
            loader.style.display = 'none';
            frame.style.opacity = '1';
            this.log("STREAM ESTABLISHED.", "success");
        };
    }

    download(format) {
        if (!this.currentUrl) return;
        this.log(`REQUESTING SECURE DOWNLOAD: .${format.toUpperCase()}`);
        
        // Trigger download via backend tunnel
        const link = document.createElement('a');
        link.href = `${this.apiUrl}/api/download?url=${encodeURIComponent(this.currentUrl)}&format=${format}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.log("PACKET TRANSFER INITIATED...", "success");
    }
}

// Initialize
const Nexus = new NexusClient();
