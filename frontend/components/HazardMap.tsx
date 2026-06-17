"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Detection } from "@/types/detection";

// Default Leaflet marker icons don't load correctly with bundlers — fix manually.
const hazardIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:14px;height:14px;border-radius:50%;
    background:#3B82F6;border:2px solid #F1F4F9;
    box-shadow:0 0 0 4px rgba(59,130,246,0.25);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function HazardMap({ detections }: { detections: Detection[] }) {
  const located = detections.filter((d) => d.latitude != null && d.longitude != null);
  const center: [number, number] =
    located.length > 0 ? [located[0].latitude!, located[0].longitude!] : [14.5995, 120.9842];

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
      />
      {located.map((d) => (
        <Marker key={d.id} position={[d.latitude!, d.longitude!]} icon={hazardIcon}>
          <Popup>
            <div className="font-mono text-xs">
              <p className="text-sm font-semibold mb-1">{d.hazard_type}</p>
              <p>Confidence: {(d.confidence * 100).toFixed(1)}%</p>
              <p>
                {d.latitude!.toFixed(5)}, {d.longitude!.toFixed(5)}
              </p>
              <p>{new Date(d.created_at).toLocaleString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
