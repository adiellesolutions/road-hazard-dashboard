import { Detection, SystemStatus } from "@/types/detection";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_URL}/api/status`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

export async function getDetections(limit = 100): Promise<Detection[]> {
  const res = await fetch(`${API_URL}/api/detections?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch detections");
  return res.json();
}

export function getExportUrl(): string {
  return `${API_URL}/api/detections/export`;
}
