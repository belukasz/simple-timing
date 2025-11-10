class SoundRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordings = [];
        this.isRecording = false;

        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.status = document.getElementById('status');
        this.recordingsList = document.getElementById('recordingsList');

        this.init();
    }

    init() {
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.loadRecordings();
        this.renderRecordings();
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Get supported MIME type for better cross-browser/mobile compatibility
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4'; // iOS Safari
            } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                mimeType = 'audio/ogg;codecs=opus';
            }

            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            this.audioChunks = [];

            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                this.audioChunks.push(event.data);
            });

            this.mediaRecorder.addEventListener('stop', () => {
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                this.saveRecording(audioBlob);

                // Stop all tracks to turn off the microphone
                stream.getTracks().forEach(track => track.stop());
            });

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateUI();
            this.status.textContent = 'Recording...';
            this.status.className = 'status recording';

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.status.textContent = 'Error: Could not access microphone';
            this.status.className = 'status';
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateUI();
            this.status.textContent = 'Recording saved!';
            this.status.className = 'status';

            setTimeout(() => {
                this.status.textContent = '';
            }, 3000);
        }
    }

    saveRecording(audioBlob) {
        const recording = {
            id: Date.now(),
            blob: audioBlob,
            url: URL.createObjectURL(audioBlob),
            timestamp: new Date().toLocaleString(),
            name: `Recording ${this.recordings.length + 1}`
        };

        this.recordings.unshift(recording);
        this.saveToLocalStorage();
        this.renderRecordings();
    }

    playRecording(id) {
        const recording = this.recordings.find(r => r.id === id);
        if (recording) {
            const audio = new Audio(recording.url);
            audio.play();
        }
    }

    deleteRecording(id) {
        const index = this.recordings.findIndex(r => r.id === id);
        if (index !== -1) {
            URL.revokeObjectURL(this.recordings[index].url);
            this.recordings.splice(index, 1);
            this.saveToLocalStorage();
            this.renderRecordings();
        }
    }

    saveToLocalStorage() {
        // Convert blobs to base64 for localStorage
        const recordingsToSave = this.recordings.map(rec => ({
            id: rec.id,
            timestamp: rec.timestamp,
            name: rec.name,
            audioData: null // We'll store the blob data separately
        }));

        // Note: For a production app, you'd want to use IndexedDB for storing audio blobs
        // localStorage has size limitations
        localStorage.setItem('recordings', JSON.stringify(recordingsToSave));
    }

    loadRecordings() {
        const saved = localStorage.getItem('recordings');
        if (saved) {
            // In this simple version, recordings are lost on refresh
            // To persist recordings, you'd need to use IndexedDB
            this.recordings = [];
        }
    }

    renderRecordings() {
        if (this.recordings.length === 0) {
            this.recordingsList.innerHTML = '<div class="empty-state">No recordings yet. Start recording to create your first sound!</div>';
            return;
        }

        this.recordingsList.innerHTML = this.recordings.map(recording => `
            <div class="recording-item">
                <div class="recording-info">
                    <div class="recording-name">${recording.name}</div>
                    <div class="recording-time">${recording.timestamp}</div>
                </div>
                <div class="recording-controls">
                    <button class="btn-small btn-play" onclick="recorder.playRecording(${recording.id})">Play</button>
                    <button class="btn-small btn-delete" onclick="recorder.deleteRecording(${recording.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    updateUI() {
        this.recordBtn.disabled = this.isRecording;
        this.stopBtn.disabled = !this.isRecording;
    }
}

// Initialize the recorder when the page loads
const recorder = new SoundRecorder();
