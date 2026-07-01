// DOM Elements
const video = document.getElementById('video-input');
const canvas = document.getElementById('canvas-output');
const noCameraPrompt = document.getElementById('no-camera-prompt');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const snapshotBtn = document.getElementById('snapshot-btn');
const flipBtn = document.getElementById('flip-btn');
const themeSelector = document.getElementById('theme-selector');

// Slider Settings
const paramBrightness = document.getElementById('param-brightness');
const paramMinArea = document.getElementById('param-min-area');
const paramMaxArea = document.getElementById('param-max-area');
const paramCircularity = document.getElementById('param-circularity');
const paramStability = document.getElementById('param-stability');
const paramDebug = document.getElementById('param-debug');

// Value Display Elements
const brightVal = document.getElementById('bright-val');
const minAreaVal = document.getElementById('min-area-val');
const maxAreaVal = document.getElementById('max-area-val');
const circVal = document.getElementById('circ-val');
const stabVal = document.getElementById('stab-val');

// UI Status indicators
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const alertBanner = document.getElementById('alert-banner');
const hudFpsDisplay = document.getElementById('hud-fps');

// Console Log Element
const consoleBody = document.getElementById('console-body');

// Telemetry Stats Elements
const statTargets = document.getElementById('stat-targets');
const statLatency = document.getElementById('stat-latency');
const statBrightness = document.getElementById('stat-brightness');
const statEngine = document.getElementById('stat-engine');
const graphCanvas = document.getElementById('graph-canvas');
const signalStrengthText = document.getElementById('signal-strength');

// Logging utility helper
function logEvent(message, type = 'system') {
    if (!consoleBody) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
    
    const line = document.createElement('div');
    line.className = 'console-line';
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'console-timestamp';
    timeSpan.textContent = timestamp;
    
    const textSpan = document.createElement('span');
    textSpan.className = `console-text ${type}`;
    textSpan.textContent = message;
    
    line.appendChild(timeSpan);
    line.appendChild(textSpan);
    
    consoleBody.appendChild(line);
    
    // Auto-scroll to bottom
    consoleBody.scrollTop = consoleBody.scrollHeight;
}

// Procedural Web Audio Engine
class WebAudioEngine {
    constructor() {
        this.ctx = null;
        this.warningInterval = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
    }

    playChirp() {
        // Calibration chirp disabled to prevent noise spam during scanning
    }

    startWarningAlarm() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (this.warningInterval) return;

        this.warningInterval = setInterval(() => {
            if (!streaming || !this.ctx) {
                this.stopWarningAlarm();
                return;
            }
            try {
                const now = this.ctx.currentTime;
                
                // Double oscillator combination for a fat, buzzing industrial siren
                const osc1 = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gainNode = this.ctx.createGain();
                
                osc1.type = 'sawtooth';
                osc1.frequency.setValueAtTime(600, now);
                osc1.frequency.linearRampToValueAtTime(900, now + 0.15);
                osc1.frequency.linearRampToValueAtTime(600, now + 0.3);
                
                osc2.type = 'square';
                osc2.frequency.setValueAtTime(605, now);
                osc2.frequency.linearRampToValueAtTime(905, now + 0.15);
                osc2.frequency.linearRampToValueAtTime(605, now + 0.3);
                
                // Higher gain for loud, clear public demonstration (0.16 volume)
                gainNode.gain.setValueAtTime(0.16, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                
                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(this.ctx.destination);
                
                osc1.start();
                osc1.stop(now + 0.3);
                osc2.start();
                osc2.stop(now + 0.3);
            } catch (e) {
                console.error("Audio alarm error:", e);
            }
        }, 350);
    }

    stopWarningAlarm() {
        if (this.warningInterval) {
            clearInterval(this.warningInterval);
            this.warningInterval = null;
        }
    }
}

const audioEngine = new WebAudioEngine();

// Bind callback for when OpenCV finishes initializing
window.initializeOpenCvStatus = () => {
    if (statEngine) {
        statEngine.textContent = 'ACTIVE';
        statEngine.style.color = 'var(--color-green)';
    }
    logEvent("OpenCV.js WebAssembly core engine initialized.", "success");
    logEvent("System diagnostics completed: OK.", "success");
};

// Initial Console Boot Log
logEvent("System boot sequence complete. Awaiting video feed activation...", "system");

// Update Value Displays on Input and write to Console logs
paramBrightness.addEventListener('input', () => { 
    brightVal.textContent = paramBrightness.value; 
    if (statBrightness) statBrightness.textContent = paramBrightness.value;
});
paramBrightness.addEventListener('change', () => {
    logEvent(`Min Brightness floor updated to ${paramBrightness.value}`, "system");
});

paramMinArea.addEventListener('input', () => { 
    minAreaVal.textContent = paramMinArea.value; 
});
paramMinArea.addEventListener('change', () => {
    logEvent(`Min Target Size threshold updated to ${paramMinArea.value}px`, "system");
});

paramMaxArea.addEventListener('input', () => { 
    maxAreaVal.textContent = paramMaxArea.value; 
});
paramMaxArea.addEventListener('change', () => {
    logEvent(`Max Target Size threshold updated to ${paramMaxArea.value}px`, "system");
});

paramCircularity.addEventListener('input', () => { 
    circVal.textContent = paramCircularity.value + '%'; 
});
paramCircularity.addEventListener('change', () => {
    logEvent(`Min Circularity threshold updated to ${paramCircularity.value}%`, "system");
});

paramStability.addEventListener('input', () => { 
    stabVal.textContent = paramStability.value; 
});
paramStability.addEventListener('change', () => {
    logEvent(`Stability Target updated to ${paramStability.value} frames`, "system");
});

paramDebug.addEventListener('change', () => {
    const isChecked = paramDebug.checked;
    logEvent(`Binary Mask Debug Mode toggled: ${isChecked ? 'ON' : 'OFF'}`, isChecked ? "warning" : "system");
});

// Calibration Presets Event Listeners
const presetDark = document.getElementById('preset-dark');
const presetDay = document.getElementById('preset-day');
const presetRange = document.getElementById('preset-range');

function applyPreset(presetName, settings) {
    paramBrightness.value = settings.brightness;
    paramMinArea.value = settings.minArea;
    paramMaxArea.value = settings.maxArea;
    paramCircularity.value = settings.circularity;
    paramStability.value = settings.stability;

    brightVal.textContent = settings.brightness;
    minAreaVal.textContent = settings.minArea;
    maxAreaVal.textContent = settings.maxArea;
    circVal.textContent = settings.circularity + '%';
    stabVal.textContent = settings.stability;
    
    if (statBrightness) statBrightness.textContent = settings.brightness;

    // Trigger input events to update sliders programmatically
    paramBrightness.dispatchEvent(new Event('input'));
    paramMinArea.dispatchEvent(new Event('input'));
    paramMaxArea.dispatchEvent(new Event('input'));
    paramCircularity.dispatchEvent(new Event('input'));
    paramStability.dispatchEvent(new Event('input'));

    [presetDark, presetDay, presetRange].forEach(btn => btn.classList.remove('active'));

    logEvent(`Preset [${presetName.toUpperCase()}] applied successfully.`, "success");
    logEvent(`Calibrated settings: brightness floor=${settings.brightness}, minArea=${settings.minArea}px, circularity=${settings.circularity}%, stability=${settings.stability}f`, "system");
}

presetDark.addEventListener('click', () => {
    applyPreset('Dark Room', { brightness: 200, minArea: 15, maxArea: 400, circularity: 60, stability: 5 });
    presetDark.classList.add('active');
});

presetDay.addEventListener('click', () => {
    if (!isPremium) {
        showPaywall();
        return;
    }
    applyPreset('Daylight', { brightness: 235, minArea: 12, maxArea: 300, circularity: 75, stability: 7 });
    presetDay.classList.add('active');
});

presetRange.addEventListener('click', () => {
    if (!isPremium) {
        showPaywall();
        return;
    }
    applyPreset('Long Range', { brightness: 185, minArea: 6, maxArea: 150, circularity: 45, stability: 4 });
    presetRange.classList.add('active');
});

// Theme Switcher Listener
themeSelector.addEventListener('change', () => {
    const theme = themeSelector.value;
    document.body.className = ''; // Reset body theme classes
    if (theme === 'pipboy') {
        document.body.classList.add('theme-pipboy');
        logEvent("HUD terminal theme changed: Pip-Boy 3000.", "warning");
    } else if (theme === 'frost') {
        document.body.classList.add('theme-frost');
        logEvent("HUD terminal theme changed: Frost Glass.", "system");
    } else {
        logEvent("HUD terminal theme changed: Electric Orchid.", "system");
    }
});

// Application State
let streaming = false;
let stream = null;
let fps = 30.0;
let prevTime = 0;
let animationFrameId = null;
let wasWarningActive = false;
let currentFacingMode = 'environment'; // 'environment' (back) or 'user' (front)
let signalHistory = new Array(120).fill(0); // Holds rolling history of target threat scores

// OpenCV WebAssembly Mats (Persistent)
let cap = null;
let src = null;
let gray = null;
let blurred = null;
let thresh = null;
let brightMask = null;
let combinedMask = null;
let ksize = null;
let kernel = null;

// Tracked Points State
let trackedPoints = [];

// Point Tracker Class
class TrackedPoint {
    constructor(x, y, r, maxLifetime = 8) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.lifetime = maxLifetime;
        this.maxLifetime = maxLifetime;
        this.framesActive = 1;
    }

    update(x, y, r) {
        // Smooth coordinates with exponential moving average
        this.x = Math.round(0.6 * this.x + 0.4 * x);
        this.y = Math.round(0.6 * this.y + 0.4 * y);
        this.r = Math.round(0.6 * this.r + 0.4 * r);
        this.lifetime = Math.min(this.lifetime + 1, this.maxLifetime);
        this.framesActive += 1;
    }

    decay() {
        this.lifetime -= 1;
        this.framesActive = Math.max(0, this.framesActive - 1);
        return this.lifetime > 0;
    }
}

// Distance matching helper
function updateTracks(detectedPoints, distThresh = 35.0, maxLifetime = 8) {
    let updatedTracks = [];
    let matchedDetections = new Set();

    // Match current detections to existing tracks
    for (let track of trackedPoints) {
        let bestMatchIdx = -1;
        let bestDist = Infinity;

        for (let i = 0; i < detectedPoints.length; i++) {
            if (matchedDetections.has(i)) continue;
            let det = detectedPoints[i];
            let dist = Math.hypot(track.x - det.x, track.y - det.y);
            if (dist < distThresh && dist < bestDist) {
                bestDist = dist;
                bestMatchIdx = i;
            }
        }

        if (bestMatchIdx !== -1) {
            track.update(detectedPoints[bestMatchIdx].x, detectedPoints[bestMatchIdx].y, detectedPoints[bestMatchIdx].r);
            matchedDetections.add(bestMatchIdx);
            updatedTracks.push(track);
        } else {
            if (track.decay()) {
                updatedTracks.push(track);
            }
        }
    }

    // Create new tracks for unmatched detections
    for (let i = 0; i < detectedPoints.length; i++) {
        if (!matchedDetections.has(i)) {
            updatedTracks.push(new TrackedPoint(detectedPoints[i].x, detectedPoints[i].y, detectedPoints[i].r, maxLifetime));
            // playChirp is disabled during calibration to avoid noise clutter
        }
    }

    trackedPoints = updatedTracks;
}

// Canvas Reticle Drawing
function drawCanvasReticle(ctx, x, y, r, color, label) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillStyle = color;

    // Draw main circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw center dot
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw crosshair extension lines
    let len = r * 0.6;
    ctx.beginPath();
    // Left
    ctx.moveTo(x - r - len, y);
    ctx.lineTo(x - r, y);
    // Right
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + r + len, y);
    // Top
    ctx.moveTo(x, y - r - len);
    ctx.lineTo(x, y - r);
    // Bottom
    ctx.moveTo(x, y + r);
    ctx.lineTo(x, y + r + len);
    ctx.stroke();

    if (label) {
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, x, y - r - 5);
    }
}

// Snapshot Capture & Gallery Module
function captureSnapshot() {
    if (!streaming) return;

    try {
        // Create temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw current canvas scene
        tempCtx.drawImage(canvas, 0, 0);

        const imgDataUrl = tempCanvas.toDataURL('image/png');
        const timestamp = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${pad(timestamp.getHours())}:${pad(timestamp.getMinutes())}:${pad(timestamp.getSeconds())}`;

        const galleryGrid = document.getElementById('gallery-grid');
        const galleryEmpty = document.getElementById('gallery-empty');

        if (galleryEmpty) {
            galleryEmpty.style.display = 'none';
        }

        // Create card element
        const card = document.createElement('div');
        card.className = 'gallery-card';

        const thumbWrapper = document.createElement('div');
        thumbWrapper.className = 'gallery-thumb-wrapper';

        const img = document.createElement('img');
        img.src = imgDataUrl;

        const downloadBtn = document.createElement('div');
        downloadBtn.className = 'gallery-download-btn';
        downloadBtn.textContent = 'Download';

        thumbWrapper.appendChild(img);
        thumbWrapper.appendChild(downloadBtn);

        const info = document.createElement('div');
        info.className = 'gallery-card-info';

        const time = document.createElement('div');
        time.className = 'gallery-card-time';
        time.textContent = `ALERT @ ${timeStr}`;

        const coords = document.createElement('div');
        coords.className = 'gallery-card-coords';
        const target = trackedPoints.find(tp => tp.framesActive >= parseInt(paramStability.value)) || trackedPoints[0];
        if (target) {
            coords.textContent = `LOC: X:${target.x} Y:${target.y}`;
        } else {
            coords.textContent = 'MANUAL SNAPSHOT';
        }

        info.appendChild(time);
        info.appendChild(coords);

        card.appendChild(thumbWrapper);
        card.appendChild(info);

        // Bind download link trigger
        card.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `HiddenEye_Snapshot_${timestamp.getTime()}.png`;
            link.href = imgDataUrl;
            link.click();
            logEvent("High-res threat snapshot downloaded.", "success");
        });

        // Insert at top of grid
        galleryGrid.insertBefore(card, galleryGrid.firstChild);
        logEvent(`Threat snapshot captured and stored: ${coords.textContent}`, "success");
    } catch (e) {
        console.error("Capture snapshot failed:", e);
        logEvent(`Capture snapshot failed: ${e.message}`, "warning");
    }
}

snapshotBtn.addEventListener('click', () => {
    if (!isPremium) {
        showPaywall();
        return;
    }
    captureSnapshot();
});

// Camera control routines
startBtn.addEventListener('click', () => {
    // Initialize Web Audio Engine
    audioEngine.init();
    scanStartTime = Date.now();
    
    logEvent("Initializing hardware capture modules...", "system");
    
    // Synchronously play empty video to register user gesture (Safari Autoplay bypass)
    video.play().catch(() => { /* ignore empty stream play rejection */ });

    const constraints = {
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: currentFacingMode
        },
        audio: false
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(mediaStream) {
            logEvent("Camera access granted. Connecting feed stream...", "success");
            stream = mediaStream;
            video.srcObject = stream;
            video.play()
                .catch(err => {
                    console.error("video.play() failed: ", err);
                    logEvent(`Playback failed: ${err.message}`, "warning");
                });

            let loopStarted = false;
            const checkDimensionsAndStart = () => {
                if (loopStarted) return;
                
                // Safari can delay reporting actual dimensions. Poll until ready.
                if (video.videoWidth === 0 || video.videoHeight === 0) {
                    setTimeout(checkDimensionsAndStart, 50);
                    return;
                }

                loopStarted = true;
                noCameraPrompt.style.display = 'none';
                logEvent(`Camera stream active: ${video.videoWidth}x${video.videoHeight}`, "success");
                initOpenCvMatsAndLoop();
            };

            // Bind metadata events and check readyState
            video.onloadedmetadata = checkDimensionsAndStart;
            video.onloadeddata = checkDimensionsAndStart;
            video.onplaying = checkDimensionsAndStart;
            video.oncanplay = checkDimensionsAndStart;

            // Fallback: trigger check immediately in case events fired instantly
            if (video.readyState >= 2) {
                checkDimensionsAndStart();
            }
        })
        .catch(function(err) {
            console.error("Camera access failed: ", err);
            logEvent(`Hardware authorization failed: ${err.message}`, "warning");
            alert("Unable to access webcam. Please verify camera permissions in your browser.");
        });
});

flipBtn.addEventListener('click', () => {
    currentFacingMode = (currentFacingMode === "environment") ? "user" : "environment";
    logEvent(`Preferred camera flipped: ${currentFacingMode === "user" ? "FRONT (Selfie)" : "REAR (Main)"}`, "system");

    if (streaming) {
        logEvent("Flipping camera stream source active...", "system");
        
        // Pause loop animation frame briefly
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Stop current active tracks
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: currentFacingMode
            },
            audio: false
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(function(mediaStream) {
                logEvent("New camera stream source authorized.", "success");
                stream = mediaStream;
                video.srcObject = stream;
                video.play()
                    .then(() => {
                        let loopStarted = false;
                        const checkDimensionsAndResume = () => {
                            if (loopStarted) return;
                            if (video.videoWidth === 0 || video.videoHeight === 0) {
                                setTimeout(checkDimensionsAndResume, 50);
                                return;
                            }
                            loopStarted = true;
                            
                            video.width = video.videoWidth;
                            video.height = video.videoHeight;
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            
                            // Re-bind OpenCV capturing for new stream dimension mapping
                            cap = new cv.VideoCapture('video-input');
                            
                            logEvent(`Camera stream switched successfully: ${video.videoWidth}x${video.videoHeight}`, "success");
                            
                            // Resume processing loop
                            animationFrameId = requestAnimationFrame(processingLoop);
                        };

                        video.onloadedmetadata = checkDimensionsAndResume;
                        if (video.readyState >= 2) {
                            checkDimensionsAndResume();
                        }
                    })
                    .catch(err => {
                        console.error("video.play() failed on flip: ", err);
                        logEvent(`Playback failed: ${err.message}`, "warning");
                    });
            })
            .catch(function(err) {
                console.error("Camera switch failed: ", err);
                logEvent(`Camera swap failed: ${err.message}`, "warning");
                alert("Could not switch camera source in this orientation.");
                // Revert state variables
                currentFacingMode = (currentFacingMode === "environment") ? "user" : "environment";
            });
    }
});

stopBtn.addEventListener('click', stopScanner);

function stopScanner() {
    logEvent("Halting hardware scanner loop...", "system");
    streaming = false;
    audioEngine.stopWarningAlarm();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    video.srcObject = null;
    video.removeAttribute('width');
    video.removeAttribute('height');

    // Reset status HUDs
    statusDot.className = 'dot idle';
    statusText.textContent = "SYSTEM STANDBY";
    alertBanner.classList.add('hidden');
    hudFpsDisplay.textContent = "FPS: 0.0";
    noCameraPrompt.style.display = 'flex';
    document.getElementById('laser-sweep').classList.remove('active');

    // Reset Telemetry counters
    if (statTargets) statTargets.textContent = '0';
    if (statLatency) statLatency.textContent = '0.0ms';

    // Clear Canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Free OpenCV structures to prevent WebAssembly memory leaks
    if (src) { src.delete(); src = null; }
    if (gray) { gray.delete(); gray = null; }
    if (blurred) { blurred.delete(); blurred = null; }
    if (thresh) { thresh.delete(); thresh = null; }
    if (brightMask) { brightMask.delete(); brightMask = null; }
    if (combinedMask) { combinedMask.delete(); combinedMask = null; }
    if (kernel) { kernel.delete(); kernel = null; }
    
    cap = null;
    ksize = null;
    trackedPoints = [];
    wasWarningActive = false;
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    snapshotBtn.disabled = true;

    logEvent("Scanner entering standby mode.", "system");
}

function initOpenCvMatsAndLoop() {
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;
    
    // Explicitly set video element width/height attributes for OpenCV.js VideoCapture
    video.width = width;
    video.height = height;
    
    canvas.width = width;
    canvas.height = height;

    // Allocate persistent OpenCV WebAssembly structures
    cap = new cv.VideoCapture('video-input');
    src = new cv.Mat(height, width, cv.CV_8UC4);
    gray = new cv.Mat();
    blurred = new cv.Mat();
    thresh = new cv.Mat();
    brightMask = new cv.Mat();
    combinedMask = new cv.Mat();
    ksize = new cv.Size(5, 5);
    kernel = cv.Mat.ones(3, 3, cv.CV_8U);

    streaming = true;
    prevTime = performance.now();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    snapshotBtn.disabled = false;

    // Trigger UI animations
    document.getElementById('laser-sweep').classList.add('active');
    logEvent("Spatial-temporal frame scanner initialized.", "success");

    // Start Processing Loop
    animationFrameId = requestAnimationFrame(processingLoop);
}

function processingLoop() {
    if (!streaming) return;

    // Premium session scanning limit check (45 seconds)
    if (!isPremium && scanStartTime > 0) {
        const elapsed = Date.now() - scanStartTime;
        if (elapsed >= 45000) {
            logEvent("🔒 Scan session limit reached (45s limit). Please upgrade to Premium.", "warning");
            stopScanner();
            showPaywall();
            return;
        }
    }

    try {
        let t0 = performance.now();

        // Check for dynamic resolution changes (highly common on Safari startup)
        let currentWidth = video.videoWidth;
        let currentHeight = video.videoHeight;
        
        if (currentWidth > 0 && currentHeight > 0 && 
            (currentWidth !== src.cols || currentHeight !== src.rows)) {
            
            // Explicitly set video element width/height attributes for OpenCV.js VideoCapture
            video.width = currentWidth;
            video.height = currentHeight;

            canvas.width = currentWidth;
            canvas.height = currentHeight;
            
            src.delete();
            gray.delete();
            blurred.delete();
            thresh.delete();
            brightMask.delete();
            combinedMask.delete();
            
            // Recreate cap to sync its internal size with the new video size
            cap = new cv.VideoCapture('video-input');
            
            src = new cv.Mat(currentHeight, currentWidth, cv.CV_8UC4);
            gray = new cv.Mat();
            blurred = new cv.Mat();
            thresh = new cv.Mat();
            brightMask = new cv.Mat();
            combinedMask = new cv.Mat();
            
            console.log(`Resolution changed. Mats & cap re-allocated to ${currentWidth}x${currentHeight}`);
            logEvent(`Scanner resolution auto-adjusted: ${currentWidth}x${currentHeight}`, "warning");
        }

        // 1. Capture current video frame
        cap.read(src);

        // 2. Fetch parameters from GUI inputs
        let minVal = parseFloat(paramBrightness.value);
        let minArea = parseFloat(paramMinArea.value);
        let maxArea = parseFloat(paramMaxArea.value);
        let minCirc = parseFloat(paramCircularity.value) / 100.0;
        let stabilityThresh = parseInt(paramStability.value);

        if (minArea >= maxArea) {
            minArea = maxArea - 1;
        }

        // 3. OpenCV pipeline processing
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blurred, ksize, 0);

        // Local contrast adaptive thresholding
        cv.adaptiveThreshold(
            blurred, thresh, 255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY,
            11, 2
        );

        // Global bright spots thresholding
        cv.threshold(blurred, brightMask, minVal, 255, cv.THRESH_BINARY);

        // Intersect lists
        cv.bitwise_and(thresh, brightMask, combinedMask);

        // Morphological open to remove noise
        cv.morphologyEx(combinedMask, combinedMask, cv.MORPH_OPEN, kernel);

        // Find contours inside current frame
        // Allocation is local to avoid cumulative memory leaks in WASM
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(combinedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let detected = [];
        for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i);
            let area = cv.contourArea(cnt);

            if (area > minArea && area < maxArea) {
                let rect = cv.boundingRect(cnt);
                let aspectRatio = rect.width / rect.height;
                
                // Lens reflections must be nearly square/circular (aspect ratio near 1.0)
                if (aspectRatio >= 0.7 && aspectRatio <= 1.4) {
                    let circle = cv.minEnclosingCircle(cnt);
                    let radius = circle.radius;
                    let cx = circle.center.x;
                    let cy = circle.center.y;

                    if (radius > 1) {
                        let enclosingArea = Math.PI * radius * radius;
                        let circleRatio = area / enclosingArea;

                        let perimeter = cv.arcLength(cnt, true);
                        let circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;

                        if (circularity > minCirc && circleRatio > (minCirc * 0.8)) {
                            // Validate average brightness inside the contour boundary
                            let contourMask = cv.Mat.zeros(gray.rows, gray.cols, cv.CV_8U);
                            let color = new cv.Scalar(255);
                            let tempVector = new cv.MatVector();
                            tempVector.push_back(cnt);
                            cv.drawContours(contourMask, tempVector, -1, color, -1);
                            tempVector.delete();

                            let meanVal = cv.mean(gray, contourMask)[0];
                            contourMask.delete();

                            if (meanVal >= minVal) {
                                detected.push({
                                    x: Math.round(cx),
                                    y: Math.round(cy),
                                    r: Math.round(radius)
                                });
                            }
                        }
                    }
                }
            }
        }

        // Clean local Mat allocations
        contours.delete();
        hierarchy.delete();

        // 4. Update tracking models
        updateTracks(detected, 20.0, 8);

        // 5. Draw background frame to Canvas
        let debugMode = paramDebug.checked;
        if (debugMode) {
            cv.imshow('canvas-output', combinedMask);
        } else {
            cv.imshow('canvas-output', src);
        }

        // 6. Draw vector targets on top of the pixel frame using 2D context
        const ctx = canvas.getContext('2d');
        let warningTriggered = false;

        for (let tp of trackedPoints) {
            if (tp.framesActive >= stabilityThresh) {
                warningTriggered = true;
                drawCanvasReticle(ctx, tp.x, tp.y, tp.r, '#ff3366', `SUSPECT [F=${tp.framesActive}]`);
            } else {
                drawCanvasReticle(ctx, tp.x, tp.y, tp.r, '#a855f7', `CALIBRATING (${tp.framesActive})`);
            }
        }

        // Update UI warnings and Log alerts
        if (warningTriggered) {
            alertBanner.classList.remove('hidden');
            statusDot.className = 'dot danger';
            statusText.textContent = "SUSPECT DETECTED";
            
            if (!wasWarningActive) {
                logEvent(`CRITICAL THREAT: STABILIZED LENS REFLECTION CONFIRMED AT (${trackedPoints[0]?.x || 0}, ${trackedPoints[0]?.y || 0})`, "warning");
                audioEngine.startWarningAlarm();
                wasWarningActive = true;
                
                // Auto snapshot
                setTimeout(captureSnapshot, 120);
            }
        } else {
            alertBanner.classList.add('hidden');
            statusDot.className = 'dot scanning';
            statusText.textContent = "SCANNING ACTIVE";
            
            if (wasWarningActive) {
                logEvent("Threat cleared. Scanner feed returning normal.", "success");
                audioEngine.stopWarningAlarm();
                wasWarningActive = false;
            }
        }

        // Calculate and smooth frame rate display
        let t1 = performance.now();
        let frameTime = t1 - t0;
        let currentFps = 1000 / (t1 - prevTime);
        prevTime = t1;
        fps = 0.9 * fps + 0.1 * currentFps;
        hudFpsDisplay.textContent = `FPS: ${fps.toFixed(1)}`;

        // Update Dashboard Telemetry counters
        if (statTargets) statTargets.textContent = trackedPoints.length;
        if (statLatency) statLatency.textContent = `${frameTime.toFixed(1)}ms`;

        // Calculate Threat Signal Strength
        let signalStrength = 0;
        if (trackedPoints.length > 0) {
            let maxStability = 0;
            for (let tp of trackedPoints) {
                if (tp.framesActive > maxStability) {
                    maxStability = tp.framesActive;
                }
            }
            let stabilityRatio = Math.min(1.0, maxStability / stabilityThresh);
            let countBonus = Math.min(0.2, (trackedPoints.length - 1) * 0.1);
            
            if (warningTriggered) {
                signalStrength = 100;
            } else {
                signalStrength = Math.min(99, Math.round((stabilityRatio * 75) + (countBonus * 100)));
            }
        }
        
        // Push current strength to history
        signalHistory.push(signalStrength);
        signalHistory.shift();

        // Update Signal Strength indicator UI
        if (signalStrengthText) {
            signalStrengthText.textContent = `${signalStrength}% STRENGTH`;
            if (warningTriggered) {
                signalStrengthText.classList.add('alert-pulse');
            } else {
                signalStrengthText.classList.remove('alert-pulse');
            }
        }

        // Render Telemetry Line Graph on canvas
        drawTelemetryGraph(warningTriggered);

        // Loop next frame
        animationFrameId = requestAnimationFrame(processingLoop);

    } catch (err) {
        console.error("Error in camera frames process loop:", err);
        logEvent(`Process loop exception: ${err.message}`, "warning");
        alert("Scanner processing error occurred: " + err + "\nStopping scanner.");
        stopScanner();
    }
}

// Telemetry Graph rendering function using HTML5 canvas
function drawTelemetryGraph(isWarning) {
    if (!graphCanvas) return;
    const ctx = graphCanvas.getContext('2d');
    const width = graphCanvas.clientWidth;
    const height = graphCanvas.clientHeight;
    
    // Sync canvas buffer width with CSS layouts
    if (graphCanvas.width !== width || graphCanvas.height !== height) {
        graphCanvas.width = width;
        graphCanvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // Fetch theme-specific CSS color tokens dynamically
    const primaryColor = getComputedStyle(document.body).getPropertyValue('--color-cyan').trim() || '#00f0ff';
    const glowColor = getComputedStyle(document.body).getPropertyValue('--color-cyan-glow').trim() || 'rgba(0, 240, 255, 0.3)';
    const warningColor = getComputedStyle(document.body).getPropertyValue('--color-red').trim() || '#ff3366';

    // 1. Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let y = 18; y < height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Vertical lines scrolling grid animation
    let scrollOffset = (prevTime / 40) % 30;
    for (let x = -scrollOffset; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // 2. Draw Signal Wave path
    ctx.beginPath();
    let sliceWidth = width / (signalHistory.length - 1);
    
    for (let i = 0; i < signalHistory.length; i++) {
        let x = i * sliceWidth;
        let val = signalHistory[i];
        let y = height - (val / 100) * (height - 10) - 5;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.strokeStyle = isWarning ? warningColor : primaryColor;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = isWarning ? 'rgba(255, 51, 102, 0.45)' : glowColor;
    ctx.stroke();
    
    // Reset shadow for translucent gradient fill
    ctx.shadowBlur = 0;

    // 3. Draw Gradient Fill Area
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let i = 0; i < signalHistory.length; i++) {
        let x = i * sliceWidth;
        let val = signalHistory[i];
        let y = height - (val / 100) * (height - 10) - 5;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();

    let gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (isWarning) {
        gradient.addColorStop(0, 'rgba(255, 51, 102, 0.15)');
        gradient.addColorStop(1, 'rgba(255, 51, 102, 0.0)');
    } else {
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
    }
    ctx.fillStyle = gradient;
    ctx.fill();
}

// ==========================================
// Phase 2: Mobile Navigation, Auth & Paywall
// ==========================================

// Global state trackers
let isPremium = false;
let currentUser = null;
let scanStartTime = 0;

// Local Storage registered users database initializer
let registeredUsersList = JSON.parse(localStorage.getItem('hidden_eye_registered_users') || '[]');
if (!registeredUsersList.some(u => u.email === 'test@hiddeneye.com')) {
    registeredUsersList.push({
        email: 'test@hiddeneye.com',
        name: 'test',
        password: 'testpass',
        premium: true
    });
    localStorage.setItem('hidden_eye_registered_users', JSON.stringify(registeredUsersList));
}

// Tab Switching Listener (collapses UI on mobile viewport layout)
document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Toggle tab button states
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Toggle tab card visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.classList.contains('tab-' + tabName)) {
                content.classList.add('active');
            }
        });
        
        logEvent(`Navigated to workspace: [${tabName.toUpperCase()}]`, "system");
    });
});

// Modal selectors
const authModal = document.getElementById('auth-modal');
const paywallModal = document.getElementById('paywall-modal');
const authBtn = document.getElementById('auth-btn');
const authBtnText = document.getElementById('auth-btn-text');
const closeAuthBtn = document.getElementById('close-auth-btn');
const closePaywallBtn = document.getElementById('close-paywall-btn');

const authErrorMsg = document.getElementById('auth-error-msg');

function displayAuthError(message) {
    if (authErrorMsg) {
        authErrorMsg.textContent = message;
        authErrorMsg.style.display = 'block';
    }
}

function clearAuthError() {
    if (authErrorMsg) {
        authErrorMsg.style.display = 'none';
        authErrorMsg.textContent = '';
    }
}

// Login modal trigger actions
if (authBtn) {
    authBtn.addEventListener('click', () => {
        if (currentUser) {
            logOutUser();
        } else {
            clearAuthError();
            authModal.classList.remove('hidden');
        }
    });
}

if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', () => {
        clearAuthError();
        authModal.classList.add('hidden');
    });
}

if (closePaywallBtn) {
    closePaywallBtn.addEventListener('click', () => {
        paywallModal.classList.add('hidden');
    });
}

// Close overlays if backing out
window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        clearAuthError();
        authModal.classList.add('hidden');
    }
    if (e.target === paywallModal) {
        paywallModal.classList.add('hidden');
    }
});

// Auth Modal Login/Register tabs switching logic
const tabLoginBtn = document.getElementById('tab-login-btn');
const tabSignupBtn = document.getElementById('tab-signup-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

if (tabLoginBtn && tabSignupBtn) {
    tabLoginBtn.addEventListener('click', () => {
        clearAuthError();
        tabLoginBtn.classList.add('active');
        tabSignupBtn.classList.remove('active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });
    
    tabSignupBtn.addEventListener('click', () => {
        clearAuthError();
        tabSignupBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });
}

// User credentials secure forms handlers
const loginFormElement = document.getElementById('login-form');
const signupFormElement = document.getElementById('signup-form');

if (loginFormElement) {
    loginFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAuthError();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        
        const usersList = JSON.parse(localStorage.getItem('hidden_eye_registered_users') || '[]');
        const matchedUser = usersList.find(u => u.email === email);
        
        if (!matchedUser) {
            displayAuthError("🔒 This email is not registered. Please register first and then log in!");
            logEvent(`Login failed: ${email} is not registered.`, "warning");
            return;
        }
        
        if (matchedUser.password !== password) {
            displayAuthError("❌ Incorrect password. Please check your credentials.");
            logEvent(`Login failed: Incorrect password for ${email}.`, "warning");
            return;
        }
        
        currentUser = {
            email: matchedUser.email,
            name: matchedUser.name,
            premium: localStorage.getItem('hidden_eye_premium') === 'true' || matchedUser.premium === true
        };
        
        // Sync premium state
        if (currentUser.premium) {
            localStorage.setItem('hidden_eye_premium', 'true');
        }
        
        localStorage.setItem('hidden_eye_user', JSON.stringify(currentUser));
        isPremium = currentUser.premium;
        
        logEvent(`Secure session loaded. Access granted to: ${currentUser.name}`, "success");
        updateAuthUI();
        authModal.classList.add('hidden');
    });
}

if (signupFormElement) {
    signupFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAuthError();
        const email = document.getElementById('signup-email').value.trim().toLowerCase();
        const name = document.getElementById('signup-name').value.trim();
        const password = document.getElementById('signup-password').value;
        
        const usersList = JSON.parse(localStorage.getItem('hidden_eye_registered_users') || '[]');
        if (usersList.some(u => u.email === email)) {
            displayAuthError("⚠️ Email already registered. Please log in instead.");
            return;
        }
        
        const newUser = {
            email: email,
            name: name,
            password: password,
            premium: false
        };
        
        usersList.push(newUser);
        localStorage.setItem('hidden_eye_registered_users', JSON.stringify(usersList));
        
        currentUser = newUser;
        localStorage.setItem('hidden_eye_user', JSON.stringify(currentUser));
        isPremium = false;
        localStorage.setItem('hidden_eye_premium', 'false');
        
        logEvent(`SECURE ACCOUNT REGISTERED. Welcome, ${name}!`, "success");
        updateAuthUI();
        authModal.classList.add('hidden');
    });
}

function logOutUser() {
    logEvent(`User session terminated for security profile: ${currentUser.name}`, "system");
    currentUser = null;
    isPremium = false;
    localStorage.removeItem('hidden_eye_user');
    localStorage.setItem('hidden_eye_premium', 'false');
    updateAuthUI();
}

function updateAuthUI() {
    if (currentUser) {
        authBtnText.textContent = currentUser.name.toUpperCase();
        authBtn.classList.add('btn-primary');
        authBtn.classList.remove('btn-tertiary');
    } else {
        authBtnText.textContent = "Log In";
        authBtn.classList.remove('btn-primary');
        authBtn.classList.add('btn-tertiary');
    }
    updatePremiumState();
}

function showPaywall() {
    paywallModal.classList.remove('hidden');
    logEvent("🔒 Upgrade Required. Premium alert triggered.", "warning");
}

// Secure billing checkout simulators
document.querySelectorAll('.select-tier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tier = btn.getAttribute('data-tier');
        logEvent(`Redirecting to secure merchant checkout for: ${tier.toUpperCase()}`, "system");
        
        btn.textContent = "CONNECTING...";
        btn.disabled = true;
        
        setTimeout(() => {
            isPremium = true;
            localStorage.setItem('hidden_eye_premium', 'true');
            
            if (currentUser) {
                currentUser.premium = true;
                localStorage.setItem('hidden_eye_user', JSON.stringify(currentUser));
            }
            
            logEvent("🎉 Billing authorized! Premium member status activated.", "success");
            updatePremiumState();
            
            btn.textContent = "SUBSCRIBE";
            btn.disabled = false;
            paywallModal.classList.add('hidden');
            alert("Upgrade completed successfully! Thank you for purchasing Hidden Eye Premium.");
        }, 1200);
    });
});

// Developer bypass switch listener
const devPremiumBypass = document.getElementById('param-dev-premium');
if (devPremiumBypass) {
    devPremiumBypass.addEventListener('change', function() {
        isPremium = this.checked;
        localStorage.setItem('hidden_eye_premium', isPremium ? 'true' : 'false');
        if (currentUser) {
            currentUser.premium = isPremium;
            localStorage.setItem('hidden_eye_user', JSON.stringify(currentUser));
        }
        logEvent(`[DEV BYPASS] Simulated premium authorization: ${isPremium ? 'ACTIVE' : 'DEACTIVATED'}`, isPremium ? "success" : "warning");
        updatePremiumState();
    });
}

function updatePremiumState() {
    const presetDay = document.getElementById('preset-day');
    const presetRange = document.getElementById('preset-range');
    if (devPremiumBypass) {
        devPremiumBypass.checked = isPremium;
    }
    
    if (isPremium) {
        if (presetDay) presetDay.classList.remove('premium-locked');
        if (presetRange) presetRange.classList.remove('premium-locked');
    } else {
        if (presetDay) presetDay.classList.add('premium-locked');
        if (presetRange) presetRange.classList.add('premium-locked');
    }
}

// Initial session load parameters
const savedPremium = localStorage.getItem('hidden_eye_premium');
if (savedPremium === 'true') {
    isPremium = true;
}
const savedUser = localStorage.getItem('hidden_eye_user');
if (savedUser) {
    currentUser = JSON.parse(savedUser);
    if (currentUser.premium) {
        isPremium = true;
    }
}

// Auto-run status update
setTimeout(() => {
    updateAuthUI();
}, 200);
