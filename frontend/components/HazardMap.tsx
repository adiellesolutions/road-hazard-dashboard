"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import { Detection } from "@/types/detection";

interface HazardMapProps {
  detections: Detection[];
}

/* =========================================================
   CUSTOM HAZARD MARKER
========================================================= */

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

/* =========================================================
   FORCE LEAFLET TO RECALCULATE CONTAINER SIZE

   Fixes:
   - small map in center
   - blank area around map
   - incorrect dimensions after responsive layout
========================================================= */

function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const fixSize = () => {
      map.invalidateSize();
    };

    /* First correction after initial render */
    const timer1 = window.setTimeout(fixSize, 100);
    const timer2 = window.setTimeout(fixSize, 500);

    window.addEventListener("resize", fixSize);

    const container = map.getContainer();

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(container);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);

      window.removeEventListener(
        "resize",
        fixSize
      );

      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
}

/* =========================================================
   AUTOMATICALLY FIT MAP TO GPS DETECTIONS
========================================================= */

function FitDetectionBounds({
  detections,
}: {
  detections: Detection[];
}) {
  const map = useMap();

  useEffect(() => {
    const located = detections.filter(
      (d) =>
        d.latitude != null &&
        d.longitude != null
    );

    if (located.length === 0) {
      return;
    }

    const points = located.map(
      (d) =>
        [
          Number(d.latitude),
          Number(d.longitude),
        ] as [number, number]
    );

    if (points.length === 1) {
      map.setView(points[0], 17);
      return;
    }

    const bounds =
      L.latLngBounds(points);

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 17,
    });
  }, [detections, map]);

  return null;
}

/* =========================================================
   MAIN MAP
========================================================= */

export default function HazardMap({
  detections,
}: HazardMapProps) {
  const locatedDetections =
    detections.filter(
      (d) =>
        d.latitude != null &&
        d.longitude != null
    );

  /*
   * Default map center.
   * Only used when there are no GPS records.
   */
  const center: [number, number] =
    locatedDetections.length > 0
      ? [
          Number(
            locatedDetections[0].latitude
          ),
          Number(
            locatedDetections[0].longitude
          ),
        ]
      : [14.5995, 120.9842];

  return (
    <div
      className="relative w-full h-full"
      style={{
        minHeight: "400px",
      }}
    >
      <MapContainer
        center={center}
        zoom={
          locatedDetections.length > 0
            ? 16
            : 12
        }
        scrollWheelZoom={true}
        className="absolute inset-0"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
        }}
      >
        {/* FREE OPENSTREETMAP - NO API KEY */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fix map dimensions */}
        <MapResizeFix />

        {/* Automatically zoom to hazard locations */}
        <FitDetectionBounds
          detections={locatedDetections}
        />

        {/* Hazard markers */}
        {locatedDetections.map(
          (detection) => (
            <Marker
              key={detection.id}
              position={[
                Number(
                  detection.latitude
                ),
                Number(
                  detection.longitude
                ),
              ]}
              icon={hazardMarker}
            >
              <Popup>
                <div
                  style={{
                    minWidth: "190px",
                  }}
                >
                  <strong>
                    {
                      detection.hazard_type
                    }
                  </strong>

                  <br />

                  Confidence:{" "}
                  {(
                    detection.confidence *
                    100
                  ).toFixed(1)}
                  %

                  <br />

                  Latitude:{" "}
                  {Number(
                    detection.latitude
                  ).toFixed(6)}

                  <br />

                  Longitude:{" "}
                  {Number(
                    detection.longitude
                  ).toFixed(6)}

                  <br />

                  Detected:{" "}
                  {new Date(
                    detection.created_at
                  ).toLocaleString()}
                </div>
              </Popup>
            </Marker>
          )
        )}
      </MapContainer>
    </div>
  );
}