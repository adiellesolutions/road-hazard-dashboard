export type HazardType =
  | "Alligator Cracking"
  | "Bleeding"
  | "Block Cracking"
  | "Corrugation and Shoving"
  | "Depression"
  | "Joint Reflection Cracking"
  | "Longitudinal Cracking"
  | "Patching"
  | "Potholes"
  | "Raveling"
  | "Rutting"
  | "Slippage Cracking"
  | "Stripping"
  | "Transverse Cracking";

export interface Detection {
  id: string;
  hazard_type: HazardType;
  confidence: number;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  created_at: string;
}

export interface SystemStatus {
  system_online: boolean;
  camera_online: boolean;
  gps_online: boolean;
  last_heartbeat: string | null;
  total_hazards: number;
}
