"use client";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

import L from "leaflet";

import { Detection } from "@/types/detection";

interface HazardMapProps {
  detections: Detection[];
}

/*
 * Custom marker para hindi tayo umasa
 * sa default Leaflet marker image files.
 */
const hazardMarker = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #22d3ee;
        border: 3px solid white;
        box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.25);
      "
    ></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

export default function HazardMap({
  detections,
}: HazardMapProps) {
  const locatedDetections = detections.filter(
    (d) =>
      d.latitude != null &&
      d.longitude != null
  );

  /*
   * Default center:
   * Metro Manila.
   *
   * Kapag may actual GPS detection,
   * doon automatic mag-center.
   */
  const center: [number, number] =
    locatedDetections.length > 0
      ? [
          Number(locatedDetections[0].latitude),
          Number(locatedDetections[0].longitude),
        ]
      : [14.5995, 120.9842];

  return (
    <MapContainer
      center={center}
      zoom={locatedDetections.length > 0 ? 16 : 12}
      scrollWheelZoom
      className="h-full w-full"
      style={{
        height: "100%",
        width: "100%",
        minHeight: "400px",
      }}
    >
      {/* FREE MAP — NO API KEY REQUIRED */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {locatedDetections.map((detection) => (
        <Marker
          key={detection.id}
          position={[
            Number(detection.latitude),
            Number(detection.longitude),
          ]}
          icon={hazardMarker}
        >
          <Popup>
            <div
              style={{
                minWidth: "180px",
              }}
            >
              <strong>
                {detection.hazard_type}
              </strong>

              <br />

              Confidence:{" "}
              {(detection.confidence * 100).toFixed(1)}%

              <br />

              Latitude:{" "}
              {Number(detection.latitude).toFixed(6)}

              <br />

              Longitude:{" "}
              {Number(detection.longitude).toFixed(6)}

              <br />

              Detected:{" "}
              {new Date(
                detection.created_at
              ).toLocaleString()}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}