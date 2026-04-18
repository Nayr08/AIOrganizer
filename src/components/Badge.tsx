import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
}

export function Badge({
  variant = "default",
  size = "sm",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "border border-[#51525c] bg-[#40414f] text-[#d7d7df]",
    success: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    warning: "border border-amber-500/20 bg-amber-500/10 text-amber-300",
    error: "border border-red-500/20 bg-red-500/10 text-red-300",
    info: "border border-[#10a37f]/20 bg-[#10a37f]/10 text-[#7ce3ca]",
  };

  const sizeStyles = {
    sm: "rounded-full px-2.5 py-1 text-[11px] font-medium",
    md: "rounded-full px-3 py-1.5 text-sm font-medium",
  };

  return (
    <span
      className={`inline-block ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
