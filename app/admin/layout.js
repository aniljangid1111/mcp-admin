import { Suspense } from "react";
import AdminHeader from "./AdminHeader";

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Suspense
        fallback={
          <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white" />
        }
      >
        <AdminHeader />
      </Suspense>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          © 2026 Cleanergy Battery. All rights reserved. Developed by{" "}
          <a
            href="https://shapebytes.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            ShapeBytes
          </a>
        </p>
      </footer>
    </div>
  );
}
