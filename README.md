# Real-Time Road Hazard Detection System Using YOLOv8

A simple, dark-mode dashboard for a thesis prototype that detects road hazards
(potholes, cracking, rutting, etc.) from a Raspberry Pi camera using YOLOv8,
tags each detection with GPS coordinates, and displays everything live on the web.

```
road-hazard-dashboard/
├── frontend/        Next.js + Tailwind dashboard
├── backend/         FastAPI server (talks to Supabase)
├── database/        Supabase schema (run once)
└── raspberry_pi/    Example scripts that run ON the Pi
```

## How it fits together

```
Raspberry Pi Camera ──► YOLOv8 + GPS ──► FastAPI backend ──► Supabase (database)
        │                                                          │
        └──► MJPEG video stream (direct) ──► Next.js frontend ◄────┘
                                              (reads via API + realtime)
```

- The **Pi** runs YOLOv8 locally, draws detection boxes on the video, and streams
  that video directly to the browser (see `raspberry_pi/video_stream_server.py`).
  This keeps video simple — no need to pipe frames through the backend.
- Whenever YOLOv8 detects a hazard, the Pi also sends a small JSON message
  (hazard type, confidence, GPS lat/lon) to the **FastAPI backend**, which saves
  it to **Supabase**.
- The **frontend** reads from the backend (status, logs, CSV export) and
  subscribes directly to Supabase for real-time updates on the Live page.

## 1. Set up the database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the contents of `database/schema.sql`, and run it.
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key (for the frontend)
   - `service_role` key (for the backend — keep this secret)

## 2. Run the backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Visit `http://localhost:8000/docs` to see and test the API.

## 3. Run the frontend (Next.js)

```bash
cd frontend
npm install

cp .env.local.example .env.local   # then fill in your Supabase + backend + Pi values
npm run dev
```

Visit `http://localhost:3000`.

## 4. Connect the Raspberry Pi

You need two small things running on the Pi:

1. **Video stream** — `raspberry_pi/video_stream_server.py` runs YOLOv8 on each
   camera frame, draws the boxes, and serves it as an MJPEG stream on port 8001.
   Point the frontend's `NEXT_PUBLIC_PI_STREAM_URL` at it.
2. **Detection + heartbeat reporting** — `raspberry_pi/example_client.py` shows
   how to `POST` each detection and a periodic heartbeat to the FastAPI backend.
   Wire the commented-out section into your real YOLOv8 + GPS loop.

Both files are heavily commented references, not drop-in production code —
swap in your real model path, GPS module, and camera setup.

## Pages

| Page | Route | What it shows |
|---|---|---|
| Dashboard | `/` | System / camera / GPS status, total hazards, recent detections |
| Live Monitoring | `/live` | Live video stream + the most recent detection (real-time via Supabase) |
| Detection Logs | `/logs` | Filterable table of every detection, with CSV export |
| Hazard Map | `/map` | All detections plotted on a dark map (click a marker for details) |

## Notes for your thesis defense

- The map uses **OpenStreetMap / CARTO** tiles — free, no API key needed.
- "System Online" on the dashboard is based on the Pi's heartbeat: if it hasn't
  pinged in the last `HEARTBEAT_TIMEOUT_SECONDS` (default 15s), it shows Offline.
- All 14 hazard classes from your model are already wired into the database
  schema, the logs filter dropdown, and the shared TypeScript/Python types.
- Swap the placeholder coordinates and stream URL for your real Pi's IP address
  on the same network before your demo.
