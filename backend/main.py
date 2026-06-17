"""
Real-Time Road Hazard Detection System — Backend
Run locally with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import detections, status

app = FastAPI(title="Road Hazard Detection API")

# Allow the Next.js frontend (any origin, fine for a thesis demo) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detections.router)
app.include_router(status.router)


@app.get("/")
def root():
    return {"message": "Road Hazard Detection API is running"}
