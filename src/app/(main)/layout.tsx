"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  Wallet,
  CheckSquare,
  BarChart2,
  User,
  LogOut,
} from "lucide-react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/finance", label: "Finance", icon: Wallet },
    { href: "/todos", label: "Tasks", icon: CheckSquare },
    { href: "/deadlines", label: "Deadline", icon: BarChart2 },
    { href: "/calories", label: "Calories", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1C1C1A] flex flex-col items-center antialiased">
      {/* Topbar Minimalis Cream */}
      <header className="sticky top-0 z-40 w-full border-b border-[#EAEAE8] bg-[#FBFBFA]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1C3627] font-bold text-white text-xs shadow-sm">
              V
            </div>
            <span className="font-semibold tracking-tight text-sm text-[#1C1C1A]">
              Ventra OS
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Keluar"
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-500 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
          >
            <LogOut size={13} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-md px-5 pt-4 pb-28">{children}</main>

      {/* Floating Pill Bottom Bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-[340px] px-3">
        <nav className="flex items-center justify-between rounded-full bg-white/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-neutral-200/80 backdrop-blur-md">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center transition-all ${
                  isActive
                    ? "rounded-full bg-[#1C3627] text-white px-3.5 py-1.5"
                    : "text-neutral-400 hover:text-neutral-700 px-2 py-1"
                }`}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[9px] font-medium tracking-tight mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
