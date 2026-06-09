"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/dashboard/analytics", icon: "📈", label: "Analytics" },
  { href: "/dashboard/calendar", icon: "📅", label: "Calendar" },
  { href: "/dashboard/brand", icon: "🎨", label: "Brand Kit" },
  { href: "/connect", icon: "📱", label: "Connect" },
  { href: "/pricing", icon: "💎", label: "Upgrade" },
];

export function Sidebar({ user }: { user?: { phone?: string; name?: string; subscriptionTier?: string } }) {
  const pathname = usePathname();
  const router = useRouter();

  function signOut() {
    localStorage.removeItem("myna_token");
    router.push("/onboarding");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 glass border-r border-white/10 z-40">
        <div className="p-4 border-b border-white/10">
          <span className="font-bold text-lg gradient-text">Myna</span>
          <p className="text-gray-500 text-xs mt-0.5">AI Content Studio</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-green-500/20 text-green-400 font-medium"
                    : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {label === "Upgrade" && user?.subscriptionTier === "FREE" && (
                  <span className="ml-auto text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                    FREE
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-gray-500 truncate mb-2">{user?.name || user?.phone}</div>
          <button onClick={signOut} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/10 flex items-center justify-around px-2 py-2">
        {NAV.slice(0, 5).map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors ${
                active ? "text-green-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
