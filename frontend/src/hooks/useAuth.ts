"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { api } from "@/lib/api-client";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface User {
  id: string;
  phone: string;
  name: string;
  contact_name: string;
  company_name: string;
  is_admin: boolean;
  token_balance: number;
  category_id: string | null;
  category_slug: string | null;
  email: string | null;
  business_logo_url: string | null;
  business_website: string | null;
  business_address: string | null;
  apply_branding: boolean;
  [key: string]: unknown;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const syncingRef = useRef(false);

  const supabase = getSupabaseBrowser();

  const syncUser = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const data = await api.get<User>("/users/me");
      setUser(data);
      localStorage.setItem("sp_user", JSON.stringify(data));
    } catch {
      setUser(null);
      localStorage.removeItem("sp_user");
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    const cached = localStorage.getItem("sp_user");
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        /* corrupted */
      }
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession: Session | null) => {
      setSession(newSession);

      if (newSession && (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        syncUser().finally(() => setLoading(false));
      } else if (!newSession || event === "SIGNED_OUT") {
        setUser(null);
        localStorage.removeItem("sp_user");
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, syncUser]);

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${phone}`,
    });
    if (error) throw new Error(error.message);
  };

  const verifyPhoneOtp = async (phone: string, otp: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${phone}`,
      token: otp,
      type: "sms",
    });
    if (error) throw new Error(error.message);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    localStorage.removeItem("sp_user");
    window.location.href = "/login";
  };

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    isAdmin: user?.is_admin || false,
    signInWithPhone,
    verifyPhoneOtp,
    signInWithGoogle,
    logout,
    refreshUser: syncUser,
  };
}
