"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { getStatus, getDetections } from "@/lib/api";
import { SystemStatus, Detection } from "@/types/detection";

export default function DashboardPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [recent, setRecent] = useState<Detection[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [s, d] = await Promise.all([getStatus(), getDetections(5)]);
        setStatus(s);
        setRecent(d);
        setError(false);
      } catch {
        setError(true);
      }
    }
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="System Dashboard"
        description="Live status of the road hazard detection prototype."
      />

      {error && (
        <div className="mb-6 border border-status-offline/30 bg-status-offline/10 text-status-offline text-sm rounded-lg px-4 py-3 font-mono">
          Can&apos;t reach the backend API. Check NEXT_PUBLIC_API_URL and that FastAPI is running.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-base-surface border border-base-border rounded-lg p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-faint mb-3">
            System Status
          </p>
          <StatusBadge online={status?.system_online ?? false} />
        </div>

        <StatCard
          label="Total Hazards Detected"
          value={status?.total_hazards ?? "—"}
          accent
        />

        <div className="bg-base-surface border border-base-border rounded-lg p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-faint mb-3">
            Camera Status
          </p>
          <StatusBadge online={status?.camera_online ?? false} />
        </div>

        <div className="bg-base-surface border border-base-border rounded-lg p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-faint mb-3">
            GPS Status
          </p>
          <StatusBadge online={status?.gps_online ?? false} />
        </div>
      </div>

      <div className="mt-8">
        <p className="font-mono text-[11px] uppercase tracking-wider text-text-faint mb-3">
          Recent Detections
        </p>
        <div className="bg-base-surface border border-base-border rounded-lg divide-y divide-base-border">
          {recent.length === 0 && (
            <p className="text-sm text-text-muted px-5 py-6 text-center">
              No detections yet. They&apos;ll show up here as soon as the Pi reports one.
            </p>
          )}
          {recent.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm text-text-primary">{d.hazard_type}</p>
                <p className="font-mono text-[11px] text-text-faint">
                  {new Date(d.created_at).toLocaleString()}
                </p>
              </div>
              <span className="font-mono text-sm text-accent-glow">
                {(d.confidence * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
