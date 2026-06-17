"""
EXAMPLE: How the Raspberry Pi talks to the backend.

This is a minimal reference you wire into your real YOLOv8 + GPS loop —
it is NOT meant to be run as-is. Replace the placeholder functions
(get_gps_coordinates, run_yolo_detection) with your real code.

Two things the Pi needs to do:
  1. Every few seconds: POST a heartbeat so the dashboard knows it's online.
  2. Every time YOLOv8 detects a hazard: POST that detection.

Video itself is NOT sent through this API — keep that simple by running
an MJPEG stream directly from the Pi (see notes at the bottom) and
pointing the frontend's Live page at it.
"""

import time
import requests

BACKEND_URL = "http://<YOUR_BACKEND_IP>:8000"  # e.g. http://192.168.1.50:8000


def get_gps_coordinates():
    """Replace with your real GPS module read (e.g. via gpsd or serial NMEA parsing)."""
    return {"latitude": 14.5995, "longitude": 120.9842}  # placeholder: Manila


def send_heartbeat(camera_ok: bool, gps_ok: bool):
    try:
        requests.post(
            f"{BACKEND_URL}/api/status/heartbeat",
            json={"camera_online": camera_ok, "gps_online": gps_ok},
            timeout=3,
        )
    except requests.RequestException as e:
        print(f"[heartbeat] failed: {e}")


def send_detection(hazard_type: str, confidence: float, lat: float, lon: float):
    try:
        requests.post(
            f"{BACKEND_URL}/api/detections",
            json={
                "hazard_type": hazard_type,
                "confidence": confidence,
                "latitude": lat,
                "longitude": lon,
            },
            timeout=3,
        )
    except requests.RequestException as e:
        print(f"[detection] failed: {e}")


if __name__ == "__main__":
    last_heartbeat = 0

    while True:
        # --- 1. Heartbeat every 5 seconds ---
        if time.time() - last_heartbeat > 5:
            send_heartbeat(camera_ok=True, gps_ok=True)
            last_heartbeat = time.time()

        # --- 2. Run your real YOLOv8 inference on the current camera frame here ---
        # results = yolo_model(frame)
        # for box in results.boxes:
        #     hazard_type = model.names[int(box.cls)]
        #     confidence = float(box.conf)
        #     gps = get_gps_coordinates()
        #     send_detection(hazard_type, confidence, gps["latitude"], gps["longitude"])

        time.sleep(0.1)

# ------------------------------------------------------------------
# Streaming live video (separate from this script):
# Run a tiny MJPEG server on the Pi using Flask or FastAPI, where YOLOv8
# draws its boxes directly onto each frame with results.plot() before
# streaming it. Then set NEXT_PUBLIC_PI_STREAM_URL in the frontend's
# .env.local to that stream's URL, e.g. http://192.168.1.50:8001/video_feed
# This keeps video simple: the Pi does the drawing, the browser just
# displays an <img> tag pointed at the stream.
# ------------------------------------------------------------------
