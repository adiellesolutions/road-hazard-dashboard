"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import PageHeader from "@/components/PageHeader";
import { getDetections, getExportUrl, getTrials } from "@/lib/api";
import { Detection, HazardType, TestSession } from "@/types/detection";

const HazardMap = dynamic(() => import("@/components/HazardMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] w-full flex items-center justify-center text-text-faint font-mono text-sm">
      Loading map…
    </div>
  ),
});

const HAZARD_TYPES: HazardType[] = [
  "Alligator Cracking",
  "Bleeding",
  "Block Cracking",
  "Corrugation and Shoving",
  "Depression",
  "Joint Reflection Cracking",
  "Longitudinal Cracking",
  "Patching",
  "Potholes",
  "Raveling",
  "Rutting",
  "Slippage Cracking",
  "Stripping",
  "Transverse Cracking",
];

type DetectionLog = Detection & {
  confidence?: number | null;
  trial_id?: string | null;
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function DetectionLogsPage() {
  const [logs, setLogs] = useState<DetectionLog[]>([]);
  const [trials, setTrials] = useState<TestSession[]>([]);
  const [hazardFilter, setHazardFilter] = useState("all");
  const [trialFilter, setTrialFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [mapLogs, setMapLogs] = useState<DetectionLog[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [focusedDetectionId, setFocusedDetectionId] = useState<string | null>(null);
  const [focusRequestKey, setFocusRequestKey] = useState(0);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  const sortedTrials = useMemo(
    () => [...trials].sort((a, b) => a.trial_number - b.trial_number),
    [trials]
  );

  useEffect(() => {
    getTrials().then(setTrials).catch(console.error);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getDetections(1000, trialFilter, hazardFilter);
      setLogs(data as DetectionLog[]);
    } catch (error) {
      console.error(error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [trialFilter, hazardFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  /*
   * Keep the map tied to the selected trial.
   * Hazard filtering only affects the table, matching the previous behavior.
   */
  const loadMapLogs = useCallback(async () => {
    setMapLoading(true);

    try {
      const data = await getDetections(1000, trialFilter);
      setMapLogs(data as DetectionLog[]);
    } catch (error) {
      console.error(error);
      setMapLogs([]);
    } finally {
      setMapLoading(false);
    }
  }, [trialFilter]);

  useEffect(() => {
    loadMapLogs();
  }, [loadMapLogs]);

  useEffect(() => {
    setFocusedDetectionId(null);
  }, [trialFilter]);

  function focusDetectionOnMap(log: DetectionLog) {
    if (log.latitude == null || log.longitude == null) return;

    setFocusedDetectionId(log.id);
    setFocusRequestKey((current) => current + 1);

    window.setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  return (
    <div>
      <PageHeader
        eyebrow="History"
        title="Detection Logs"
        description="Every hazard recorded by the system, newest first."
      />

      {/* FILTERS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={hazardFilter}
            onChange={(event) => setHazardFilter(event.target.value)}
            className="bg-base-surface border border-base-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono"
          >
            <option value="all">All Hazard Types</option>

            {HAZARD_TYPES.map((hazard) => (
              <option key={hazard} value={hazard}>
                {hazard}
              </option>
            ))}
          </select>

          <select
            value={trialFilter}
            onChange={(event) => setTrialFilter(event.target.value)}
            className="bg-base-surface border border-base-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono"
          >
            <option value="all">All Trials</option>

            {sortedTrials.map((trial) => (
              <option key={trial.id} value={trial.id}>
                Trial {trial.trial_number}
              </option>
            ))}
          </select>
        </div>

        <a
          href={getExportUrl(trialFilter)}
          className="inline-flex items-center justify-center bg-accent hover:bg-accent-dim transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          Export CSV
        </a>
      </div>

      {/* READ-ONLY MAP */}
      <div
        ref={mapSectionRef}
        className="mb-5 bg-base-surface border border-base-border rounded-lg overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-base-border">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-cyan mb-1">
              Detection Map
            </div>
            <p className="text-sm text-text-primary">
              Recorded GPS locations for the selected trial.
            </p>
          </div>

          {mapLoading && (
            <span className="text-[11px] text-text-faint font-mono">
              Loading map data…
            </span>
          )}
        </div>

        <div className="h-[430px] w-full">
          <HazardMap
            detections={mapLogs}
            focusDetectionId={focusedDetectionId}
            focusRequestKey={focusRequestKey}
          />
        </div>
      </div>

      {/* LOG TABLE */}
      <div className="bg-base-surface border border-base-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-border text-left">
              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Image
              </th>
              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Hazard Type
              </th>
              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Latitude
              </th>
              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Longitude
              </th>
              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Time
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-base-border">
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-text-muted py-8"
                >
                  Loading…
                </td>
              </tr>
            )}

            {!loading && logs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-text-muted py-8"
                >
                  No detections found.
                </td>
              </tr>
            )}

            {logs.map((log) => {
              const hasCoordinates =
                log.latitude != null && log.longitude != null;

              return (
                <tr
                  key={log.id}
                  onClick={() => {
                    if (hasCoordinates) focusDetectionOnMap(log);
                  }}
                  title={
                    hasCoordinates
                      ? "Click to show this detection on the map"
                      : undefined
                  }
                  className={`transition-colors hover:bg-base-surface2 ${
                    hasCoordinates ? "cursor-pointer" : "cursor-default"
                  } ${
                    focusedDetectionId === log.id ? "bg-accent/10" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    {log.image_url ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedImage(log.image_url);
                        }}
                        className="block rounded-md overflow-hidden border border-base-border hover:border-accent-cyan transition-colors"
                      >
                        <img
                          src={log.image_url}
                          alt={`${log.hazard_type} detection`}
                          className="w-20 h-14 object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-20 h-14 rounded-md border border-base-border flex items-center justify-center text-text-faint text-[10px] font-mono">
                        No image
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-3 text-text-primary">
                    {log.hazard_type}
                  </td>

                  <td className="px-5 py-3 font-mono text-text-muted">
                    {log.latitude?.toFixed(5) ?? "—"}
                  </td>

                  <td className="px-5 py-3 font-mono text-text-muted">
                    {log.longitude?.toFixed(5) ?? "—"}
                  </td>

                  <td className="px-5 py-3 font-mono text-text-muted whitespace-nowrap">
                    {formatTimestamp(log.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* IMAGE PREVIEW */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white text-sm font-medium"
            >
              Close ✕
            </button>

            <img
              src={selectedImage}
              alt="Road hazard detection"
              className="w-full max-h-[85vh] object-contain rounded-lg bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
