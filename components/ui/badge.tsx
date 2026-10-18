import type { HTMLAttributes, ReactNode } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "signal" | "field" | "amber" | "alert" | "muted";
  children: ReactNode;
};

export function Badge({ tone = "muted", className = "", children, ...props }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`} {...props}>{children}</span>;
}
