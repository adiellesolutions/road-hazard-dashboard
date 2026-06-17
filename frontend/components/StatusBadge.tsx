export default function StatusBadge({
  online,
  onlineLabel = "Online",
  offlineLabel = "Offline",
}: {
  online: boolean;
  onlineLabel?: string;
  offlineLabel?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-online opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? "bg-status-online" : "bg-status-offline"
          }`}
        />
      </span>
      <span className={online ? "text-status-online" : "text-status-offline"}>
        {online ? onlineLabel : offlineLabel}
      </span>
    </span>
  );
}
