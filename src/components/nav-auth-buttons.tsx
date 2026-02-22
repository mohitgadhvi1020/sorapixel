"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/lib/safe-fetch";

export default function NavAuthButtons() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    safeFetch<{ authenticated: boolean; user?: { isAdmin: boolean } }>("/api/auth/me")
      .then((d) => {
        setAuthed(d.authenticated);
        if (d.user?.isAdmin) setIsAdmin(true);
      })
      .catch(() => setAuthed(false));
  }, []);

  const handleLogout = async () => {
    try {
      await safeFetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    sessionStorage.removeItem("sorapixel_auth");
    setAuthed(false);
    setIsAdmin(false);
    router.replace("/login");
  };

  if (authed === null) return null;

  if (authed) {
    return (
      <>
        {isAdmin && (
          <Link
            href="/admin"
            className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#8b7355] bg-[#f5f0e8] rounded-lg hover:bg-[#ece3d3] transition-all duration-200 hidden md:block"
          >
            Admin
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="ml-0.5 sm:ml-1 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
        >
          Logout
        </button>
      </>
    );
  }

  return (
    <Link
      href="/login"
      className="ml-0.5 sm:ml-1 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-semibold text-white bg-[#0a0a0a] rounded-lg hover:bg-[#1a1a1a] transition-all duration-200"
    >
      Login
    </Link>
  );
}
