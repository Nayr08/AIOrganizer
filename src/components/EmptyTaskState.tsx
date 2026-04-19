"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";

interface EmptyTaskStateProps {
  filter?: "all" | "pending" | "active" | "completed";
}

const messages = {
  all: {
    sub: "Speak or type your plans and the AI will organize them into tasks for you.",
    showCta: true,
  },
  pending: { sub: "No pending tasks - you're clear.", showCta: false },
  active: { sub: "Nothing active right now.", showCta: false },
  completed: { sub: "No completed tasks yet.", showCta: false },
};

export function EmptyTaskState({ filter = "all" }: EmptyTaskStateProps) {
  const { sub, showCta } = messages[filter];

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
      <ClipboardList
        size={56}
        className="mb-5 text-white/10"
        strokeWidth={1.2}
      />
      <h3 className="mb-2 font-['Fraunces'] text-2xl text-white/90">
        No tasks yet
      </h3>
      <p className="mb-6 max-w-[280px] text-sm leading-relaxed text-white/40">
        {sub}
      </p>
      {showCta && (
        <Link
          href="/organize"
          className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-medium text-[#0A1628] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
        >
          Organize your day -&gt;
        </Link>
      )}
    </div>
  );
}
