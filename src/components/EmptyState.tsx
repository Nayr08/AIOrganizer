import { InboxIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon = <InboxIcon className="w-16 h-16 text-slate-600" />,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      {icon}
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="text-slate-400 max-w-sm text-center">{description}</p>
    </div>
  );
}
