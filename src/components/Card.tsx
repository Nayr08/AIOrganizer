import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export function Card({
  children,
  hover = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-3xl border border-[#444654] bg-[#2f2f2f] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.01)] ${
        hover
          ? "transition-colors duration-200 hover:bg-[#343541] hover:border-[#565869]"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
