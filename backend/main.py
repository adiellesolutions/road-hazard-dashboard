"""
Real-Time Road Hazard Detection System — Backend

Run locally with:

    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import time
from threading import Lock
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from routers import detections, status


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Road Hazard Detection API"
)


# ============================================================
# CORS
# ============================================================

# Thesis/demo setup:
# Allow the frontend to access the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# EXISTING ROUTERS
# ============================================================

app.include_router(detections.router)
app.include_router(status.router)


# ============================================================
# LIVE BOUNDING BOX MODELS
# ============================================================

class LiveBoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

    class_id: Optional[int] = None
    class_name: str

    confidence: Optional[float] = None


class LiveDetectionUpdate(BaseModel):
    detections: List[LiveBoundingBox] = []

    frame_width: int = 640
    frame_height: int = 480


# ============================================================
# LIVE BOUNDING BOX MEMORY
#
# IMPORTANT:
# This is NOT saved to Supabase.
#
# This only keeps the latest YOLO bounding boxes in RAM so the
# Vercel live-camera page can retrieve them through HTTPS.
# ============================================================

live_lock = Lock()

live_state = {
    "timestamp": 0.0,
    "frame_width": 640,
    "frame_height": 480,
    "detections": [],
}


# ============================================================
# RECEIVE LATEST BOUNDING BOXES FROM RASPBERRY PI
# ============================================================

@app.post("/api/live")
def update_live_detection(
    data: LiveDetectionUpdate
):
    global live_state

    boxes = [
        box.model_dump()
        for box in data.detections
    ]

    with live_lock:
        live_state = {
            "timestamp": time.time(),
            "frame_width": data.frame_width,
            "frame_height": data.frame_height,
            "detections": boxes,
        }

    return {
        "success": True,
        "detections": len(boxes),
    }


# ============================================================
# SEND LATEST BOUNDING BOXES TO WEBSITE
# ============================================================

@app.get("/api/live")
def get_live_detection():
    with live_lock:
        state = dict(live_state)

    age = time.time() - state["timestamp"]

    # If Raspberry Pi hasn't updated us recently,
    # remove the old boxes so they don't remain frozen.
    if age > 2.0:
        return {
            "timestamp": state["timestamp"],
            "frame_width": state["frame_width"],
            "frame_height": state["frame_height"],
            "detections": [],
        }

    return state


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def root():
    return {
        "message":
            "Road Hazard Detection API is running"
    }