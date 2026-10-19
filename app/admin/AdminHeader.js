/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminHeader() {
  const pathname = usePathname() || "";
  const [loggingOut, setLoggingOut] = useState(false);

  // Always reset loggingOut state when route or component renders
  useEffect(() => {
    setLoggingOut(false);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    // Hard navigate to /login to completely reset client state and cookies
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Cleanergy Battery"
              className="h-9 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = document.getElementById("admin-logo-fallback");
                if (fallback) fallback.style.display = "block";
              }}
            />
            <span
              id="admin-logo-fallback"
              style={{ display: "none" }}
              className="text-lg font-black tracking-wider text-emerald-600"
            >
              CLEANERGY
            </span>
          </Link>

          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
            Admin Portal
          </span>
        </div>

        <div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50 cursor-pointer"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
