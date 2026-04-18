"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Home, MessageSquarePlus } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/organize", label: "Organize", icon: MessageSquarePlus },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
  ];

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-[70] border-t border-[#3e404b] bg-[#212121]/95 px-3 py-3 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2.5 text-xs transition-colors ${
                active
                  ? "bg-[#2f2f2f] text-white"
                  : "text-[#9fa1ad] hover:bg-[#2a2b32] hover:text-white"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-[#10a37f]" : ""}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
