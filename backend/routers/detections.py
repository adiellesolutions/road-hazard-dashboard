import csv
import io

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from database import supabase
from models import DetectionCreate


router = APIRouter(
    prefix="/api/detections",
    tags=["detections"],
)


def get_active_trial():
    result = (
        supabase
        .table("test_sessions")
        .select("id,trial_number")
        .eq("status", "active")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )

    if result.data:
        return result.data[0]

    return None


@router.post("")
def create_detection(
    detection: DetectionCreate,
):
    payload = detection.model_dump()

    active_trial = get_active_trial()

    if active_trial:
        payload["trial_id"] = active_trial["id"]
    else:
        payload["trial_id"] = None

    result = (
        supabase
        .table("detections")
        .insert(payload)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to save detection",
        )

    return result.data[0]


@router.get("")
def list_detections(
    limit: int = Query(
        100,
        ge=1,
        le=2000,
    ),
    hazard_type: str | None = None,
    trial_id: str | None = None,
):
    query = (
        supabase
        .table("detections")
        .select(
            """
            *,
            test_sessions (
                id,
                trial_number,
                started_at,
                ended_at,
                status
            )
            """
        )
        .order(
            "created_at",
            desc=True,
        )
        .limit(limit)
    )

    if hazard_type:
        query = query.eq(
            "hazard_type",
            hazard_type,
        )

    if trial_id:
        query = query.eq(
            "trial_id",
            trial_id,
        )

    result = query.execute()

    return result.data


@router.get("/export")
def export_detections_csv(
    trial_id: str | None = None,
):
    query = (
        supabase
        .table("detections")
        .select(
            """
            *,
            test_sessions (
                trial_number
            )
            """
        )
        .order(
            "created_at",
            desc=True,
        )
    )

    if trial_id:
        query = query.eq(
            "trial_id",
            trial_id,
        )

    result = query.execute()

    rows = result.data

    buffer = io.StringIO()

    writer = csv.writer(buffer)

    writer.writerow(
        [
            "Trial",
            "Hazard Type",
            "Confidence",
            "Latitude",
            "Longitude",
            "Time",
        ]
    )

    for row in rows:
        session = (
            row.get("test_sessions")
            or {}
        )

        trial_number = session.get(
            "trial_number"
        )

        writer.writerow(
            [
                (
                    f"Trial {trial_number}"
                    if trial_number
                    else "Unassigned"
                ),
                row.get(
                    "hazard_type",
                    "",
                ),
                row.get(
                    "confidence",
                    "",
                ),
                row.get(
                    "latitude",
                    "",
                ),
                row.get(
                    "longitude",
                    "",
                ),
                row.get(
                    "created_at",
                    "",
                ),
            ]
        )

    buffer.seek(0)

    filename = (
        "detection_logs.csv"
        if not trial_id
        else "trial_detection_logs.csv"
    )

    return StreamingResponse(
        iter(
            [
                buffer.getvalue()
            ]
        ),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                f"attachment; filename={filename}"
        },
    )