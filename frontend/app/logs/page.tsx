"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { getDetections, getExportUrl } from "@/lib/api";
import { Detection, HazardType } from "@/types/detection";

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

export default function DetectionLogsPage() {
  const [logs, setLogs] = useState<Detection[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDetections(200)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.hazard_type === filter);

  return (
    <div>
      <PageHeader
        eyebrow="History"
        title="Detection Logs"
        description="Every hazard recorded by the system, newest first."
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-base-surface border border-base-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="all">All Hazard Types</option>
          {HAZARD_TYPES.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <a
          href={getExportUrl()}
          className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dim transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          Export CSV
        </a>
      </div>

      <div className="bg-base-surface border border-base-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-border text-left">
              <th className="font-mono text-[11px] uppercase tracking-wider text-text-faint px-5 py-3">
                Hazard Type
              </th>
              <th className="font-mono text-[11px] uppercase tracking-wider text-text-faint px-5 py-3">
                Confidence
              </th>
              <th className="font-mono text-[11px] uppercase tracking-wider text-text-faint px-5 py-3">
                Latitude
              </th>
              <th className="font-mono text-[11px] uppercase tracking-wider text-text-faint px-5 py-3">
                Longitude
              </th>
              <th className="font-mono text-[11px] uppercase tracking-wider text-text-faint px-5 py-3">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-border">
            {loading && (
              <tr>
                <td colSpan={5} className="text-center text-text-muted py-8">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-text-muted py-8">
                  No detections found.
                </td>
              </tr>
            )}
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-base-surface2">
                <td className="px-5 py-3 text-text-primary">{log.hazard_type}</td>
                <td className="px-5 py-3 font-mono text-accent-glow">
                  {(log.confidence * 100).toFixed(1)}%
                </td>
                <td className="px-5 py-3 font-mono text-text-muted">
                  {log.latitude?.toFixed(5) ?? "—"}
                </td>
                <td className="px-5 py-3 font-mono text-text-muted">
                  {log.longitude?.toFixed(5) ?? "—"}
                </td>
                <td className="px-5 py-3 font-mono text-text-muted">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
