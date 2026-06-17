"""
Endpoints for hazard detections:
  POST   /api/detections          -> Raspberry Pi sends a new detection
  GET    /api/detections          -> frontend fetches the log table
  GET    /api/detections/export   -> frontend downloads a CSV
"""

import csv
import io

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from database import supabase
from models import DetectionCreate, DetectionOut

router = APIRouter(prefix="/api/detections", tags=["detections"])


@router.post("", response_model=DetectionOut)
def create_detection(detection: DetectionCreate):
    """Called by the Raspberry Pi every time YOLOv8 detects a hazard."""
    result = supabase.table("detections").insert(detection.model_dump()).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save detection")

    return result.data[0]


@router.get("", response_model=list[DetectionOut])
def list_detections(
    limit: int = Query(100, le=1000),
    hazard_type: str | None = None,
):
    """Used by the Detection Logs page and the Map page."""
    query = supabase.table("detections").select("*").order("created_at", desc=True).limit(limit)

    if hazard_type:
        query = query.eq("hazard_type", hazard_type)

    result = query.execute()
    return result.data


@router.get("/export")
def export_detections_csv():
    """Downloads all detection logs as a CSV file."""
    result = supabase.table("detections").select("*").order("created_at", desc=True).execute()
    rows = result.data

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Hazard Type", "Confidence", "Latitude", "Longitude", "Time"])

    for row in rows:
        writer.writerow(
            [
                row["hazard_type"],
                row["confidence"],
                row.get("latitude", ""),
                row.get("longitude", ""),
                row["created_at"],
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=detection_logs.csv"},
    )
