from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from database import supabase


router = APIRouter(
    prefix="/api/trials",
    tags=["trials"],
)


def get_active_trial():
    result = (
        supabase
        .table("test_sessions")
        .select("*")
        .eq("status", "active")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )

    if result.data:
        return result.data[0]

    return None


@router.get("")
def list_trials():
    result = (
        supabase
        .table("test_sessions")
        .select("*")
        .order("trial_number", desc=False)
        .execute()
    )

    return result.data


@router.get("/active")
def active_trial():
    trial = get_active_trial()

    return {
        "active": trial is not None,
        "trial": trial,
    }


@router.post("/start")
def start_trial():
    current = get_active_trial()

    if current:
        raise HTTPException(
            status_code=409,
            detail=f"Trial {current['trial_number']} is still active.",
        )

    latest = (
        supabase
        .table("test_sessions")
        .select("trial_number")
        .order("trial_number", desc=True)
        .limit(1)
        .execute()
    )

    if latest.data:
        next_trial_number = latest.data[0]["trial_number"] + 1
    else:
        next_trial_number = 1

    result = (
        supabase
        .table("test_sessions")
        .insert(
            {
                "trial_number": next_trial_number,
                "status": "active",
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail="Unable to start trial.",
        )

    return result.data[0]


@router.post("/end")
def end_trial():
    current = get_active_trial()

    if not current:
        raise HTTPException(
            status_code=404,
            detail="There is no active trial.",
        )

    result = (
        supabase
        .table("test_sessions")
        .update(
            {
                "status": "completed",
                "ended_at": datetime.now(
                    timezone.utc
                ).isoformat(),
            }
        )
        .eq("id", current["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail="Unable to end trial.",
        )

    return result.data[0]