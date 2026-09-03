import csv
import io
import os
import uuid
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import StreamingResponse

from database import supabase
from models import DetectionCreate


router = APIRouter(
    prefix="/api/detections",
    tags=["detections"],
)


IMAGE_BUCKET = "hazard-images"


# ============================================================
# ACTIVE TRIAL
# ============================================================

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


# ============================================================
# IMAGE UPLOAD
# ============================================================

@router.post("/upload-image")
async def upload_detection_image(
    file: UploadFile = File(...),
):
    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="Missing image content type",
        )

    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed",
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Empty image file",
        )

    # 10 MB safety limit
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image is too large",
        )

    extension = os.path.splitext(
        file.filename or ""
    )[1].lower()

    if extension not in {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    }:
        extension = ".jpg"

    now = datetime.now(
        timezone.utc
    )

    folder = now.strftime(
        "%Y/%m/%d"
    )

    filename = (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )

    storage_path = (
        f"{folder}/{filename}"
    )

    try:
        supabase.storage.from_(
            IMAGE_BUCKET
        ).upload(
            path=storage_path,
            file=image_bytes,
            file_options={
                "content-type":
                    file.content_type,
                "upsert":
                    "false",
            },
        )

        public_url = (
            supabase.storage
            .from_(IMAGE_BUCKET)
            .get_public_url(
                storage_path
            )
        )

        # Depending on supabase-py version,
        # get_public_url may return string/object.
        if isinstance(
            public_url,
            str,
        ):
            image_url = public_url

        elif isinstance(
            public_url,
            dict,
        ):
            image_url = (
                public_url.get(
                    "publicUrl"
                )
                or public_url.get(
                    "public_url"
                )
            )

        else:
            image_url = str(
                public_url
            )

        if not image_url:
            raise Exception(
                "Could not obtain public image URL"
            )

        return {
            "image_url":
                image_url,
            "storage_path":
                storage_path,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to upload image: "
                f"{error}"
            ),
        )


# ============================================================
# CREATE DETECTION
# ============================================================

@router.post("")
def create_detection(
    detection: DetectionCreate,
):
    payload = (
        detection.model_dump()
    )

    active_trial = (
        get_active_trial()
    )

    if active_trial:
        payload[
            "trial_id"
        ] = active_trial[
            "id"
        ]
    else:
        payload[
            "trial_id"
        ] = None

    result = (
        supabase
        .table("detections")
        .insert(payload)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save detection"
            ),
        )

    return result.data[0]


# ============================================================
# LIST DETECTIONS
# ============================================================

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

    result = (
        query.execute()
    )

    return result.data


# ============================================================
# CSV EXPORT
# ============================================================

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

    writer = csv.writer(
        buffer
    )

    writer.writerow(
        [
            "Trial",
            "Hazard Type",
            "Confidence",
            "Latitude",
            "Longitude",
            "Image URL",
            "Time",
        ]
    )

    for row in rows:
        session = (
            row.get(
                "test_sessions"
            )
            or {}
        )

        trial_number = (
            session.get(
                "trial_number"
            )
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
                    "image_url",
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
        else
        "trial_detection_logs.csv"
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
                (
                    "attachment; "
                    f"filename={filename}"
                )
        },
    )