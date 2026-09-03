"""
Real-Time Road Hazard Detection System — Backend
"""

import time

from threading import Lock
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field

from routers import (
    detections,
    status,
    trials,
)


app = FastAPI(
    title="Road Hazard Detection API"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    detections.router
)

app.include_router(
    status.router
)

app.include_router(
    trials.router
)


class LiveBoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

    class_id: Optional[int] = None
    class_name: str
    confidence: Optional[float] = None


class LiveDetectionUpdate(BaseModel):
    detections: List[LiveBoundingBox] = Field(
        default_factory=list
    )

    frame_width: int = 640
    frame_height: int = 480


live_lock = Lock()


live_state = {
    "timestamp": 0.0,
    "frame_width": 640,
    "frame_height": 480,
    "detections": [],
}


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


@app.get("/api/live")
def get_live_detection():
    with live_lock:
        state = dict(
            live_state
        )

    age = (
        time.time()
        - state["timestamp"]
    )

    if age > 2.0:
        return {
            "timestamp":
                state["timestamp"],

            "frame_width":
                state["frame_width"],

            "frame_height":
                state["frame_height"],

            "detections": [],
        }

    return state


@app.get("/")
def root():
    return {
        "message":
            "Road Hazard Detection API is running"
    }