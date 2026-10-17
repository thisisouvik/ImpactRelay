type StatusTone = "signal" | "field" | "amber" | "alert" | "muted";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  dot?: boolean;
};

export function StatusBadge({
  label,
  tone = "muted",
  dot = true,
}: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      {dot ? <span className="status-badge__dot" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  );
}
