import Clock from "./Clock";

export default function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between border-b border-base-border pb-5 mb-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
        <h1 className="font-display text-2xl text-text-primary mt-1">{title}</h1>
        {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
      </div>
      <Clock />
    </div>
  );
}
