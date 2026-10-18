import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

export function Card({ className = "", children, ...props }: CardProps) {
  return <div className={`ui-card ${className}`} {...props}>{children}</div>;
}

export function CardHeader({ className = "", children, ...props }: CardProps) {
  return <div className={`ui-card__header ${className}`} {...props}>{children}</div>;
}

export function CardContent({ className = "", children, ...props }: CardProps) {
  return <div className={`ui-card__content ${className}`} {...props}>{children}</div>;
}

export function CardFooter({ className = "", children, ...props }: CardProps) {
  return <div className={`ui-card__footer ${className}`} {...props}>{children}</div>;
}
