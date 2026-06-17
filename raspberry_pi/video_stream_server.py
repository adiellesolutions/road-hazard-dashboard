"""
EXAMPLE: Minimal MJPEG video stream server, run ON the Raspberry Pi.

This is what the frontend's Live Monitoring page connects to directly
(not through the FastAPI backend) — keeps video simple and low-latency.

Run with:  python3 video_stream_server.py
Then visit http://<PI_IP>:8001/video_feed in a browser to test it.

Install deps on the Pi:
    pip install flask ultralytics opencv-python
"""

from flask import Flask, Response
import cv2
from ultralytics import YOLO

app = Flask(__name__)
model = YOLO("best.pt")  # your trained YOLOv8 road-hazard model
camera = cv2.VideoCapture(0)  # Raspberry Pi Camera


def generate_frames():
    while True:
        success, frame = camera.read()
        if not success:
            break

        # Run YOLOv8 and draw boxes directly onto the frame
        results = model(frame, verbose=False)
        annotated_frame = results[0].plot()

        ok, buffer = cv2.imencode(".jpg", annotated_frame)
        if not ok:
            continue

        frame_bytes = buffer.tobytes()
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )


@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001)
