"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/lib/mockSession";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/studio/workouts", label: "Workout Studio" },
];

export function StudioShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const { session, signOut } = useSession();

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">
          <span className="brand-kicker">Oli Professional Studio</span>
          <span className="brand-title">Living Health Systems</span>
        </div>
        <nav className="nav-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname.startsWith(item.href) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="row-between">
          <span className="pill">{session?.trainerName ?? "Guest"}</span>
          {session ? (
            <button type="button" className="button button-ghost" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <Link href="/login" className="button">
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className={wide ? "page-wide" : "page"}>{children}</main>
    </div>
  );
}
