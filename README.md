# Hidden Eye - Anti-Spy Camera Lens Reflection Detector (Prototype)

Hidden Eye is a real-time, on-device proof-of-concept web application designed to scan the surrounding environment for hidden camera lenses by isolating specular reflection highlights.

> [!WARNING]
> **PROTOTYPE DISCLAIMER**: This application is a proof-of-concept prototype. It is designed to demonstrate local browser-based computer vision (OpenCV.js) for detecting camera lens reflections. It should not be used as a primary or sole security measure. Accuracy varies based on ambient lighting, hardware camera quality, and slider calibrations.

---

## How It Works

Spy camera lenses are designed to collect light, meaning they will reflect back concentrated, circular highlights when illuminated by an external source. Hidden Eye runs a local, real-time image thresholding pipeline:

1. **Grayscale & Blur**: Converts the incoming video feed frame to grayscale and applies a Gaussian filter to suppress high-frequency noise.
2. **Adaptive Contrast**: Isolates sudden local high-contrast peaks to find boundaries.
3. **Global Intensity thresholding**: Filters out dark structures and shadow edges, leaving only high-intensity specular highlights.
4. **Morphological Filtering**: Intersects the contrast and intensity masks and performs a morphological opening operation to remove single-pixel flickers.
5. **Geometric Verification**: Checks the bounding box aspect ratio (must be close to 1.0) and contour circularity to ensure reflections are circular.
6. **Spatial-Temporal Tracking**: Smooths reflection coordinates across consecutive frames using an Exponential Moving Average (EMA). If a target remains active and stable for a set frame count, it confirms a threat.

---

## Features

* **100% On-Device Processing**: Runs locally in your browser sandbox using WebAssembly OpenCV modules. No camera frames or images are sent to any external server.
* **Web Audio Synthesis**: Programmatically generates detuned dual-oscillator warning sirens using the Web Audio API when a threat is confirmed.
* **Threat Snapshot Gallery**: Automatically takes snapshot frames of confirmed targets, displaying timestamped coordinates in an interactive gallery panel.
* **HUD Theme Switcher**: Easily switch between **Electric Orchid** (obsidian dark mode), **Pip-Boy 3000** (retro monochrome green CRT terminal), and **Frost Glass** (frosted light mode).

---

## Local Development & Setup

To run the application locally on your machine:

1. **Serve the Directory**:
   Run a local web server from this directory (e.g., using Python):
   ```bash
   python3 -m http.server 8000
   ```
2. **Access in Browser**:
   Open **[http://localhost:8000](http://localhost:8000)** in your browser.
3. **Scan**:
   Dim the room lights, turn on your phone's flashlight directly next to your web camera, and sweep it across the room. Calibrate settings sliders to filter out ambient reflections.
