import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-[#d1d5db]">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-2xl border border-[#4a4b57] bg-[#40414f] px-4 py-3 text-[#ececf1] placeholder:text-[#8e8ea0] transition-colors duration-200 focus:border-[#10a37f] focus:ring-2 focus:ring-[#10a37f]/20 ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-[#d1d5db]">
          {label}
        </label>
      )}
      <textarea
        className={`w-full resize-none rounded-3xl border border-[#4a4b57] bg-[#40414f] px-4 py-4 text-[#ececf1] placeholder:text-[#8e8ea0] transition-colors duration-200 focus:border-[#10a37f] focus:ring-2 focus:ring-[#10a37f]/20 ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
