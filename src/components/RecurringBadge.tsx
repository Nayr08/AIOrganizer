"use client";

import { RotateCcw } from "lucide-react";

type RecurringBadgeProps = {
  isRecurring?: boolean;
  frequency?: string | null;
  recurringDay?: string | null;
};

export function RecurringBadge({
  isRecurring,
  frequency,
  recurringDay,
}: RecurringBadgeProps) {
  if (!isRecurring) {
    return null;
  }

  const label =
    frequency === "daily"
      ? "Every day"
      : recurringDay
        ? `Every ${recurringDay}`
        : frequency === "monthly"
          ? "Monthly"
          : "Weekly";

  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400">
      <RotateCcw size={9} />
      {label}
    </span>
  );
}
