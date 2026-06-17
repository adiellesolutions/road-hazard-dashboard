"use client";

import { useEffect, useState } from "react";
import { CameraOff, Loader2 } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/lib/supabaseClient";
import { Detection } from "@/types/detection";

const STREAM_URL = process.env.NEXT_PUBLIC_PI_STREAM_URL;

export default function LiveMonitoringPage() {
  const [latest, setLatest] = useState<Detection | null>(null);

  const [streamOk, setStreamOk] = useState(false);
  const [checkingStream, setCheckingStream] = useState(true);

  useEffect(() => {
    supabase
      .from("detections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.length) {
          setLatest(data[0] as Detection);
        }
      });

    const channel = supabase
      .channel("live-detections")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "detections",
        },
        (payload) => {
          setLatest(payload.new as Detection);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!STREAM_URL) {
      setCheckingStream(false);
      setStreamOk(false);
      return;
    }

    const img = new Image();

    const timeout = setTimeout(() => {
      setCheckingStream(false);
      setStreamOk(false);
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      setStreamOk(true);
      setCheckingStream(false);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      setStreamOk(false);
      setCheckingStream(false);
    };

    img.src = `${STREAM_URL}?t=${Date.now()}`;

    return () => clearTimeout(timeout);
  }, []);

  const isLive = streamOk;

  return (
    <div>
      <PageHeader
        eyebrow="Camera"
        title="Camera Monitoring"
        description="Real-time camera feed and road hazard detection powered by YOLOv8."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Camera Feed */}
        <div className="lg:col-span-2">
          <div className="bg-base-surface border border-base-border rounded-lg overflow-hidden aspect-video flex items-center justify-center relative">

            {checkingStream ? (
              <div className="flex flex-col items-center text-center">
                <Loader2 className="h-10 w-10 animate-spin text-accent-cyan mb-3" />
                <p className="text-text-primary font-medium">
                  Checking Camera...
                </p>
              </div>
            ) : isLive ? (
              <img
                src={STREAM_URL}
                alt="Road Hazard Detection Camera"
                className="w-full h-full object-contain"
                onError={() => setStreamOk(false)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center px-6">
                <CameraOff className="h-14 w-14 text-text-faint mb-4" />

                <h3 className="text-lg font-semibold text-text-primary">
                  Camera Offline
                </h3>

                <p className="text-sm text-text-muted mt-2 max-w-sm">
                  No camera feed detected. Waiting for Raspberry Pi camera connection.
                </p>
              </div>
            )}

            <span
              className={`absolute top-3 left-3 flex items-center gap-1.5 backdrop-blur px-3 py-1 rounded-full font-mono text-[10px] font-semibold
                ${
                  checkingStream
                    ? "bg-black/50 text-status-idle"
                    : isLive
                    ? "bg-black/50 text-status-online"
                    : "bg-black/50 text-status-offline"
                }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  checkingStream
                    ? "bg-status-idle animate-pulse"
                    : isLive
                    ? "bg-status-online animate-pulse"
                    : "bg-status-offline"
                }`}
              />

              {checkingStream
                ? "CHECKING"
                : isLive
                ? "LIVE"
                : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Detection Panel */}
        <div className="bg-base-surface border border-base-border rounded-lg p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-faint mb-4">
            Current Detection
          </p>

          {latest ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-text-faint">Hazard Type</p>
                <p className="text-lg text-text-primary mt-1">
                  {latest.hazard_type}
                </p>
              </div>

              <div>
                <p className="text-xs text-text-faint">Confidence Score</p>
                <p className="font-mono text-lg text-accent-cyan mt-1">
                  {(latest.confidence * 100).toFixed(1)}%
                </p>
              </div>

              <div>
                <p className="text-xs text-text-faint">Detection Time</p>
                <p className="font-mono text-sm text-text-primary mt-1">
                  {new Date(latest.created_at).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-text-faint">GPS Coordinates</p>
                <p className="font-mono text-sm text-text-primary mt-1">
                  {latest.latitude?.toFixed(5) ?? "—"},{" "}
                  {latest.longitude?.toFixed(5) ?? "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-text-muted">
                No detections recorded yet.
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-base-border">
            <StatusBadge
              online={!!latest}
              onlineLabel="Receiving detections"
              offlineLabel="Waiting for detections"
            />
          </div>
        </div>
      </div>
    </div>
  );
}