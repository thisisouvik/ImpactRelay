import Image from "next/image";

export function ImpactRelayLogo({
  compact = false,
  size = 34,
  className = "",
}: {
  compact?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`impactrelay-logo ${className}`.trim()}>
      <Image
        src="/logo.png"
        alt="ImpactRelay mark"
        width={size}
        height={size}
        className="impactrelay-logo__img"
        priority
      />
      {!compact ? (
        <span className="impactrelay-logo__type">
          <strong>ImpactRelay</strong>
          <small>evidence desk</small>
        </span>
      ) : null}
    </span>
  );
}

