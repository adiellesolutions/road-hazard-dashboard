"""
Pydantic models shared by the API routers.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

HazardType = Literal[
    "Alligator Cracking",
    "Bleeding",
    "Block Cracking",
    "Corrugation and Shoving",
    "Depression",
    "Joint Reflection Cracking",
    "Longitudinal Cracking",
    "Patching",
    "Potholes",
    "Raveling",
    "Rutting",
    "Slippage Cracking",
    "Stripping",
    "Transverse Cracking",
]


class DetectionCreate(BaseModel):
    """What the Raspberry Pi sends each time YOLOv8 detects a hazard."""

    hazard_type: HazardType
    confidence: float = Field(..., ge=0, le=1, description="YOLOv8 confidence score, 0-1")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None


class DetectionOut(DetectionCreate):
    id: str
    created_at: datetime


class HeartbeatUpdate(BaseModel):
    """What the Raspberry Pi sends periodically (e.g. every 5s)."""

    camera_online: bool
    gps_online: bool


class StatusOut(BaseModel):
    system_online: bool
    camera_online: bool
    gps_online: bool
    last_heartbeat: Optional[datetime] = None
    total_hazards: int
