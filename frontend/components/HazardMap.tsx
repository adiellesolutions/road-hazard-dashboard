"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";

import {
  Detection,
} from "@/types/detection";


interface HazardMapProps {
  detections: Detection[];

  selectable?: boolean;

  selectedPosition?: {
    latitude: number;
    longitude: number;
  } | null;

  onLocationSelect?: (
    latitude: number,
    longitude: number
  ) => void;

  focusDetectionId?: string | null;

  focusRequestKey?: number;
}


/* =========================================================
   CUSTOM HAZARD MARKER
========================================================= */

const hazardMarker =
  L.divIcon({

    className: "",

    html: `
      <div
        style="
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #22d3ee;
          border: 3px solid white;
          box-shadow:
            0 0 0 3px
            rgba(
              34,
              211,
              238,
              0.25
            );
        "
      ></div>
    `,

    iconSize: [
      18,
      18,
    ],

    iconAnchor: [
      9,
      9,
    ],

    popupAnchor: [
      0,
      -12,
    ],
  });


/* =========================================================
   SELECTED LOCATION MARKER
========================================================= */

const selectedMarker =
  L.divIcon({

    className: "",

    html: `
      <div
        style="
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #facc15;
          border: 4px solid white;
          box-shadow:
            0 0 0 4px
            rgba(
              250,
              204,
              21,
              0.35
            );
        "
      ></div>
    `,

    iconSize: [
      22,
      22,
    ],

    iconAnchor: [
      11,
      11,
    ],

    popupAnchor: [
      0,
      -14,
    ],
  });


/* =========================================================
   MAP CLICK LOCATION PICKER
========================================================= */

function MapLocationPicker({
  enabled,
  onLocationSelect,
}: {
  enabled: boolean;
  onLocationSelect?: (
    latitude: number,
    longitude: number
  ) => void;
}) {

  useMapEvents({

    click(event) {

      if (!enabled) {
        return;
      }

      onLocationSelect?.(
        event.latlng.lat,
        event.latlng.lng
      );

    },

  });


  return null;
}


/* =========================================================
   MAP RESIZE FIX
========================================================= */

function MapResizeFix() {

  const map = useMap();


  useEffect(() => {

    const fixSize = () => {

      map.invalidateSize();

    };


    const timer1 =
      window.setTimeout(
        fixSize,
        100
      );

    const timer2 =
      window.setTimeout(
        fixSize,
        500
      );


    window.addEventListener(
      "resize",
      fixSize
    );


    const container =
      map.getContainer();


    const resizeObserver =
      new ResizeObserver(
        () => {

          map.invalidateSize();

        }
      );


    resizeObserver.observe(
      container
    );


    return () => {

      window.clearTimeout(
        timer1
      );

      window.clearTimeout(
        timer2
      );


      window.removeEventListener(
        "resize",
        fixSize
      );


      resizeObserver.disconnect();

    };

  }, [
    map,
  ]);


  return null;
}


/* =========================================================
   FIT DETECTION BOUNDS
========================================================= */

function FitDetectionBounds({
  detections,
}: {
  detections: Detection[];
}) {

  const map = useMap();


  useEffect(() => {

    const located =
      detections.filter(
        (detection) =>
          detection.latitude != null
          &&
          detection.longitude != null
      );


    if (
      located.length === 0
    ) {

      return;

    }


    const points =
      located.map(
        (detection) =>
          [
            Number(
              detection.latitude
            ),

            Number(
              detection.longitude
            ),
          ] as [
            number,
            number,
          ]
      );


    if (
      points.length === 1
    ) {

      map.setView(
        points[0],
        17
      );

      return;

    }


    const bounds =
      L.latLngBounds(
        points
      );


    map.fitBounds(
      bounds,
      {
        padding: [
          40,
          40,
        ],

        maxZoom: 17,
      }
    );

  }, [
    detections,
    map,
  ]);


  return null;
}


/* =========================================================
   DETECTION MARKER
   Can be focused from the Detection Logs table.
========================================================= */

function DetectionMarker({
  detection,
  focused,
  focusRequestKey,
}: {
  detection: Detection;
  focused: boolean;
  focusRequestKey: number;
}) {

  const map =
    useMap();

  const markerRef =
    useRef<L.Marker | null>(
      null
    );

  const latitude =
    Number(
      detection.latitude
    );

  const longitude =
    Number(
      detection.longitude
    );

  useEffect(() => {

    if (!focused) {
      return;
    }

    map.flyTo(
      [
        latitude,
        longitude,
      ],
      Math.max(
        map.getZoom(),
        17
      ),
      {
        duration: 0.6,
      }
    );

    const timer =
      window.setTimeout(
        () => {
          markerRef.current?.openPopup();
        },
        450
      );

    return () =>
      window.clearTimeout(
        timer
      );

  }, [
    focused,
    focusRequestKey,
    latitude,
    longitude,
    map,
  ]);

  return (

    <Marker
      ref={
        markerRef
      }
      position={[
        latitude,
        longitude,
      ]}
      icon={
        hazardMarker
      }
    >

      <Popup
        maxWidth={
          320
        }
      >

        <div
          style={{
            width:
              "250px",
          }}
        >

          {detection.image_url && (

            <a
              href={
                detection.image_url
              }
              target="_blank"
              rel="noreferrer"
              style={{
                display:
                  "block",
                marginBottom:
                  "10px",
              }}
            >

              <img
                src={
                  detection.image_url
                }
                alt={
                  detection.hazard_type
                }
                style={{
                  display:
                    "block",
                  width:
                    "100%",
                  height:
                    "140px",
                  objectFit:
                    "cover",
                  borderRadius:
                    "6px",
                }}
              />

            </a>

          )}

          <strong
            style={{
              fontSize:
                "14px",
            }}
          >
            {
              detection.hazard_type
            }
          </strong>

          <div
            style={{
              marginTop:
                "6px",
              fontSize:
                "12px",
              lineHeight:
                "1.6",
            }}
          >

            {detection.test_sessions && (

              <>
                Trial:{" "}
                <strong>
                  {
                    detection
                      .test_sessions
                      .trial_number
                  }
                </strong>
                <br />
              </>

            )}

            {detection.confidence != null && (

              <>
                Confidence:{" "}
                {
                  (
                    detection.confidence *
                    100
                  ).toFixed(1)
                }
                %
                <br />
              </>

            )}

            Latitude:{" "}
            {latitude.toFixed(6)}
            <br />

            Longitude:{" "}
            {longitude.toFixed(6)}
            <br />

            Detected:{" "}
            {new Date(
              detection.created_at
            ).toLocaleString()}

          </div>

        </div>

      </Popup>

    </Marker>

  );
}


/* =========================================================
   MAIN MAP
========================================================= */

export default function HazardMap({
  detections,
  selectable = false,
  selectedPosition = null,
  onLocationSelect,
  focusDetectionId = null,
  focusRequestKey = 0,
}: HazardMapProps) {

  const locatedDetections =
    detections.filter(
      (detection) =>
        detection.latitude != null
        &&
        detection.longitude != null
    );


  const center:
    [number, number] =

    selectedPosition

      ? [
          selectedPosition.latitude,
          selectedPosition.longitude,
        ]

      : locatedDetections.length > 0

      ? [
          Number(
            locatedDetections[
              0
            ].latitude
          ),

          Number(
            locatedDetections[
              0
            ].longitude
          ),
        ]

      : [
          14.5995,
          120.9842,
        ];


  return (

    <div
      className="
        relative
        w-full
        h-full
      "
      style={{
        minHeight:
          "400px",
      }}
    >

      <MapContainer
        center={
          center
        }
        zoom={
          locatedDetections.length
            > 0
            ? 16
            : 12
        }
        scrollWheelZoom={
          true
        }
        className="
          absolute
          inset-0
        "
        style={{
          width:
            "100%",

          height:
            "100%",

          minHeight:
            "400px",

          cursor:
            selectable
              ? "crosshair"
              : "grab",
        }}
      >

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />


        <MapResizeFix />


        <FitDetectionBounds
          detections={
            locatedDetections
          }
        />


        <MapLocationPicker
          enabled={
            selectable
          }
          onLocationSelect={
            onLocationSelect
          }
        />


        {locatedDetections.map(
          (detection) => (

            <DetectionMarker
              key={
                detection.id
              }
              detection={
                detection
              }
              focused={
                focusDetectionId ===
                detection.id
              }
              focusRequestKey={
                focusRequestKey
              }
            />

          )
        )}


        {selectedPosition && (

          <Marker
            position={[
              selectedPosition.latitude,
              selectedPosition.longitude,
            ]}
            icon={
              selectedMarker
            }
          >

            <Popup>

              <div
                style={{
                  fontSize:
                    "12px",

                  lineHeight:
                    "1.6",
                }}
              >

                <strong>
                  Selected Location
                </strong>

                <br />

                Latitude:{" "}

                {
                  selectedPosition
                    .latitude
                    .toFixed(6)
                }

                <br />

                Longitude:{" "}

                {
                  selectedPosition
                    .longitude
                    .toFixed(6)
                }

              </div>

            </Popup>

          </Marker>

        )}

      </MapContainer>

    </div>

  );

}
