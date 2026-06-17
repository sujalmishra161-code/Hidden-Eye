import cv2
import numpy as np
import math
import time
from typing import List, Tuple

class TrackedPoint:
    """Represents a point tracked across consecutive video frames to determine stability."""
    def __init__(self, x: int, y: int, r: int, max_lifetime: int = 5):
        self.x = x
        self.y = y
        self.r = r
        self.lifetime = max_lifetime
        self.max_lifetime = max_lifetime
        self.frames_active = 1

    def update(self, x: int, y: int, r: int):
        # Smoothing filters using exponential moving average
        self.x = int(0.6 * self.x + 0.4 * x)
        self.y = int(0.6 * self.y + 0.4 * y)
        self.r = int(0.6 * self.r + 0.4 * r)
        self.lifetime = min(self.lifetime + 1, self.max_lifetime)
        self.frames_active += 1

    def decay(self) -> bool:
        self.lifetime -= 1
        self.frames_active = max(0, self.frames_active - 1)
        return self.lifetime > 0


def detect_lens_reflection(
    frame: np.ndarray,
    min_val: int,
    min_area: int,
    max_area: int,
    min_circ: float
) -> Tuple[List[Tuple[int, int, int]], np.ndarray]:
    """
    Detects lens reflections based on brightness, local contrast, and circularity.
    Returns a list of (x, y, radius) coordinates along with the processing binary mask.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # 1. Adaptive Thresholding to extract high local contrast boundaries
    thresh = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )

    # 2. Global intensity thresholding to keep only high-intensity specular highlights
    _, bright_mask = cv2.threshold(blurred, min_val, 255, cv2.THRESH_BINARY)

    # Combine masks
    combined_mask = cv2.bitwise_and(thresh, bright_mask)

    # Morphological opening to clean up small single-pixel noise
    kernel = np.ones((3, 3), np.uint8)
    combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)

    # Find contours
    contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detected_points = []
    for cnt in contours:
        area = cv2.contourArea(cnt)

        # Filter contours by size limits
        if min_area < area < max_area:
            x_rect, y_rect, w_rect, h_rect = cv2.boundingRect(cnt)
            aspect_ratio = float(w_rect) / h_rect if h_rect > 0 else 0.0
            
            # Lens reflections must be nearly square/circular (aspect ratio near 1.0)
            if 0.7 <= aspect_ratio <= 1.4:
                (x, y), radius = cv2.minEnclosingCircle(cnt)
                if radius > 1:
                    enclosing_area = np.pi * radius * radius
                    circle_ratio = area / enclosing_area

                    # Check perimeter-based circularity (4 * pi * Area / Perimeter^2)
                    perimeter = cv2.arcLength(cnt, True)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter * perimeter)
                    else:
                        circularity = 0.0

                    # Validate circular metrics
                    if circularity > min_circ and circle_ratio > (min_circ * 0.8):
                        # Validate that the average region brightness is actually high
                        mask = np.zeros(gray.shape, dtype=np.uint8)
                        cv2.drawContours(mask, [cnt], -1, 255, -1)
                        mean_brightness = cv2.mean(gray, mask=mask)[0]

                        if mean_brightness >= min_val:
                            detected_points.append((int(x), int(y), int(radius)))

    return detected_points, combined_mask


def update_tracks(
    tracked_points: List[TrackedPoint],
    detected_points: List[Tuple[int, int, int]],
    dist_thresh: float = 35.0,
    max_lifetime: int = 8
) -> List[TrackedPoint]:
    """Associates current frame detections with existing point tracks using Euclidean distance."""
    updated_tracks = []
    matched_detections = set()

    # Match current detections to existing tracks
    for track in tracked_points:
        best_match_idx = -1
        best_dist = float("inf")

        for idx, det in enumerate(detected_points):
            if idx in matched_detections:
                continue
            dist = math.hypot(track.x - det[0], track.y - det[1])
            if dist < dist_thresh and dist < best_dist:
                best_dist = dist
                best_match_idx = idx

        if best_match_idx != -1:
            track.update(*detected_points[best_match_idx])
            matched_detections.add(best_match_idx)
            updated_tracks.append(track)
        else:
            # Decay unmatched tracks. Keep if they still have lifetime left.
            if track.decay():
                updated_tracks.append(track)

    # Create new tracks for unmatched detections
    for idx, det in enumerate(detected_points):
        if idx not in matched_detections:
            updated_tracks.append(TrackedPoint(det[0], det[1], det[2], max_lifetime))

    return updated_tracks


def draw_reticle(
    img: np.ndarray,
    center: Tuple[int, int],
    radius: int,
    color: Tuple[int, int, int],
    thickness: int = 2,
    label: str = None
):
    """Draws a premium-looking crosshair reticle target overlay around detections."""
    x, y = center
    # Main outer circle
    cv2.circle(img, (x, y), radius, color, thickness)
    # Center dot
    cv2.circle(img, (x, y), 2, color, -1)
    
    # Draw crosshair marks stretching from radius out to length
    len_extension = int(radius * 0.6)
    # Left
    cv2.line(img, (x - radius - len_extension, y), (x - radius, y), color, thickness)
    # Right
    cv2.line(img, (x + radius, y), (x + radius + len_extension, y), color, thickness)
    # Top
    cv2.line(img, (x, y - radius - len_extension), (x, y - radius), color, thickness)
    # Bottom
    cv2.line(img, (x, y + radius), (x, y + radius + len_extension), color, thickness)

    if label:
        cv2.putText(
            img, label, (x - radius, y - radius - 5),
            cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1, cv2.LINE_AA
        )


import sys

def main():
    # Determine video source (camera index or video file path)
    source = 0
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        source = int(arg) if arg.isdigit() else arg

    cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        print(f"Error: Unable to open video source: {source}.")
        print("Please verify your camera connection, system permissions, or file path.")
        print("\nNote: On macOS, make sure your Terminal app has permission to access the Camera")
        print("under: System Settings -> Privacy & Security -> Camera")
        return

    # Create UI Windows
    cv2.namedWindow("Detection", cv2.WINDOW_NORMAL)
    cv2.namedWindow("Controls", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Controls", 420, 320)

    # Empty callback for trackbars
    def nothing(val):
        pass

    # Setup trackbars for real-time adjustments
    cv2.createTrackbar("Min Brightness", "Controls", 200, 255, nothing)
    cv2.createTrackbar("Min Area (px)", "Controls", 15, 200, nothing)
    cv2.createTrackbar("Max Area (px)", "Controls", 400, 2000, nothing)
    cv2.createTrackbar("Min Circularity", "Controls", 60, 100, nothing)
    cv2.createTrackbar("Stability Frame Thresh", "Controls", 5, 25, nothing)

    tracked_points: List[TrackedPoint] = []
    debug_mode = False

    prev_time = cv2.getTickCount()
    tick_frequency = cv2.getTickFrequency()

    print("\n--- Camera Lens Reflection Detector Initialized ---")
    print("Controls window is open. You can adjust parameters in real-time.")
    print("Keys:")
    print("  'd' : Toggle Debug Mask View")
    print("  'q' : Quit the application")

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            print("Error: Could not read frame from camera.")
            break

        # 1. Read Trackbar parameters
        min_val = cv2.getTrackbarPos("Min Brightness", "Controls")
        min_area = cv2.getTrackbarPos("Min Area (px)", "Controls")
        max_area = cv2.getTrackbarPos("Max Area (px)", "Controls")
        min_circ = cv2.getTrackbarPos("Min Circularity", "Controls") / 100.0
        stability_thresh = cv2.getTrackbarPos("Stability Frame Thresh", "Controls")

        # Keep parameter sanity limits
        if min_area >= max_area:
            min_area = max_area - 1

        # 2. Detect candidate reflections
        detected, mask = detect_lens_reflection(frame, min_val, min_area, max_area, min_circ)

        # 3. Update spatial-temporal tracking with tighter matching distance
        tracked_points = update_tracks(tracked_points, detected, dist_thresh=20.0, max_lifetime=8)

        # 4. Render visual feedback on frame
        warning_triggered = False
        for tp in tracked_points:
            # Highlight points only if they've been stable for the required number of frames
            if tp.frames_active >= stability_thresh:
                warning_triggered = True
                draw_reticle(frame, (tp.x, tp.y), tp.r, (0, 0, 255), 2, f"SUSPECT: F={tp.frames_active}")
            else:
                # Draw a calibrating target for points that are stabilizing
                draw_reticle(frame, (tp.x, tp.y), tp.r, (255, 255, 0), 1, f"Calibrating ({tp.frames_active})")

        if warning_triggered:
            # Prominent alerting header text
            cv2.putText(
                frame, "WARNING: POSSIBLE CAMERA REFLECTION", (30, 45),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA
            )

        # 5. Telemetry / HUD Overlay
        # Compute real-time FPS
        curr_time = cv2.getTickCount()
        fps = tick_frequency / (curr_time - prev_time) if curr_time != prev_time else 0.0
        prev_time = curr_time

        # Semi-transparent HUD background panel
        hud_overlay = frame.copy()
        cv2.rectangle(hud_overlay, (10, 10), (290, 150), (25, 25, 25), -1)
        cv2.addWeighted(hud_overlay, 0.7, frame, 0.3, 0, frame)

        # Print HUD parameters
        hud_font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(frame, f"FPS: {fps:.1f}", (20, 30), hud_font, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Tracked Points: {len(tracked_points)}", (20, 50), hud_font, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Debug View: {'ON' if debug_mode else 'OFF'} ('d' to toggle)", (20, 70), hud_font, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Brightness Floor: {min_val}", (20, 90), hud_font, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Stability Target: {stability_thresh} frames", (20, 110), hud_font, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, "Press 'q' to Quit", (20, 135), hud_font, 0.45, (120, 120, 255), 1, cv2.LINE_AA)

        # 6. Display output frame / debug window side-by-side
        if debug_mode:
            mask_bgr = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
            combined_display = np.hstack((frame, mask_bgr))
            cv2.imshow("Detection", combined_display)
        else:
            cv2.imshow("Detection", frame)

        # Handle system close button (graceful exit)
        try:
            if cv2.getWindowProperty("Detection", cv2.WND_PROP_VISIBLE) < 1 or \
               cv2.getWindowProperty("Controls", cv2.WND_PROP_VISIBLE) < 1:
                break
        except Exception:
            # OpenCV window properties query can raise exception if window doesn't support or isn't built with GUI backends
            pass

        # Keyboard event handler
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('d'):
            debug_mode = not debug_mode

    # Cleanup resource handles
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()