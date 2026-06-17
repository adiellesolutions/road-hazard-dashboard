"""
Endpoints for system status:
  POST /api/status/heartbeat -> Raspberry Pi pings this every few seconds
  GET  /api/status           -> frontend dashboard reads this (poll every few seconds)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from database import supabase, HEARTBEAT_TIMEOUT_SECONDS
from models import HeartbeatUpdate, StatusOut

router = APIRouter(prefix="/api/status", tags=["status"])


@router.post("/heartbeat")
def send_heartbeat(heartbeat: HeartbeatUpdate):
    """Called by the Raspberry Pi on a timer (e.g. every 5 seconds) to say 'I'm alive'."""
    now = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("device_status")
        .update(
            {
                "system_online": True,
                "camera_online": heartbeat.camera_online,
                "gps_online": heartbeat.gps_online,
                "last_heartbeat": now,
            }
        )
        .eq("id", 1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update status")

    return {"ok": True}


@router.get("", response_model=StatusOut)
def get_status():
    """Used by the Dashboard page."""
    status_result = supabase.table("device_status").select("*").eq("id", 1).single().execute()
    status = status_result.data

    count_result = supabase.table("detections").select("id", count="exact").execute()
    total_hazards = count_result.count or 0

    # A device is only really "online" if it has pinged recently.
    system_online = False
    if status.get("last_heartbeat"):
        last_seen = datetime.fromisoformat(status["last_heartbeat"].replace("Z", "+00:00"))
        seconds_since = (datetime.now(timezone.utc) - last_seen).total_seconds()
        system_online = seconds_since <= HEARTBEAT_TIMEOUT_SECONDS

    return StatusOut(
        system_online=system_online,
        camera_online=status.get("camera_online", False) and system_online,
        gps_online=status.get("gps_online", False) and system_online,
        last_heartbeat=status.get("last_heartbeat"),
        total_hazards=total_hazards,
    )
