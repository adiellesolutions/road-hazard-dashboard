"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/PageHeader";
import { getDetections } from "@/lib/api";
import { Detection } from "@/types/detection";

const HazardMap = dynamic(() => import("@/components/HazardMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-text-faint font-mono text-sm">
      Loading map…
    </div>
  ),
});

export default function MapPage() {
  const [detections, setDetections] = useState<Detection[]>([]);

  useEffect(() => {
    getDetections(300).then(setDetections);
  }, []);

  const located = detections.filter((d) => d.latitude != null && d.longitude != null);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <PageHeader
        eyebrow="Geography"
        title="Hazard Map"
        description={`${located.length} detection${located.length === 1 ? "" : "s"} with GPS coordinates. Click a marker for details.`}
      />
      <div className="flex-1 bg-base-surface border border-base-border rounded-lg overflow-hidden min-h-[400px]">
        <HazardMap detections={detections} />
      </div>
    </div>
  );
}
