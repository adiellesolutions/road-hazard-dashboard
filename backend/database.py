"""
Single shared Supabase client for the backend.
Uses the service_role key so it can read AND write,
bypassing Row Level Security (RLS) safely on the server side.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. "
        "Copy backend/.env.example to backend/.env and fill in your Supabase project values."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

HEARTBEAT_TIMEOUT_SECONDS = int(os.getenv("HEARTBEAT_TIMEOUT_SECONDS", "15"))
