"use client";
import clsx from "clsx";
import { buttonClass, type ButtonVariant } from "./ui";

export function Button({
  variant = "primary",
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={clsx(buttonClass(variant), disabled && "pointer-events-none opacity-50", className)}
      disabled={disabled}
      {...props}
    />
  );
}
