import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  children: ReactNode;
};

export function Button({ variant = "primary", size = "md", asChild = false, className = "", children, ...props }: ButtonProps) {
  const classes = `ui-button ui-button--${variant} ui-button--${size} ${className}`;
  if (asChild && isValidElement<{ className?: string }>(children)) {
    return cloneElement(children, { className: `${classes} ${children.props.className ?? ""}` });
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
