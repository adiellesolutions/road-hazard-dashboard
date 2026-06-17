-- ============================================================
-- Real-Time Road Hazard Detection System — Database Schema
-- Run this once in your Supabase project's SQL Editor
-- (Project → SQL Editor → New Query → paste → Run)
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. detections
-- One row per hazard detected by YOLOv8 on the Raspberry Pi
-- ------------------------------------------------------------
create table if not exists detections (
  id           uuid primary key default gen_random_uuid(),
  hazard_type  text        not null check (hazard_type in (
                  'Alligator Cracking',
                  'Bleeding',
                  'Block Cracking',
                  'Corrugation and Shoving',
                  'Depression',
                  'Joint Reflection Cracking',
                  'Longitudinal Cracking',
                  'Patching',
                  'Potholes',
                  'Raveling',
                  'Rutting',
                  'Slippage Cracking',
                  'Stripping',
                  'Transverse Cracking'
                )),
  confidence   numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  latitude     double precision,
  longitude    double precision,
  image_url    text,                 -- optional snapshot of the detection frame
  created_at   timestamptz not null default now()
);

create index if not exists idx_detections_created_at on detections (created_at desc);
create index if not exists idx_detections_hazard_type on detections (hazard_type);

-- ------------------------------------------------------------
-- 2. device_status
-- Single-row "heartbeat" table the Raspberry Pi updates so the
-- dashboard knows if the system / camera / GPS are online.
-- ------------------------------------------------------------
create table if not exists device_status (
  id              int primary key default 1,      -- always row id = 1
  system_online   boolean not null default false,
  camera_online   boolean not null default false,
  gps_online      boolean not null default false,
  last_heartbeat  timestamptz,
  constraint single_row check (id = 1)
);

insert into device_status (id, system_online, camera_online, gps_online)
values (1, false, false, false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Row Level Security
-- Kept simple for a thesis demo: allow public read, and allow
-- inserts/updates only with the service role key (used by your
-- FastAPI backend, never exposed to the browser).
-- ------------------------------------------------------------
alter table detections enable row level security;
alter table device_status enable row level security;

create policy "Public can read detections"
  on detections for select
  using (true);

create policy "Public can read device status"
  on device_status for select
  using (true);

-- No insert/update/delete policies for the anon role on purpose.
-- The FastAPI backend writes using the Supabase service_role key,
-- which bypasses RLS automatically.

-- ------------------------------------------------------------
-- Realtime
-- Lets the frontend subscribe to new rows for the Live Monitoring
-- page (Supabase → Database → Replication, or run this):
-- ------------------------------------------------------------
alter publication supabase_realtime add table detections;
alter publication supabase_realtime add table device_status;
