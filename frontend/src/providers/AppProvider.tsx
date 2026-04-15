"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { api } from "@/lib/api-client";
import { cacheGet, cacheSet } from "@/lib/cache";
import { trackLead } from "@/lib/meta-pixel";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ─── Types ───

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

interface CreditBalance {
  token_balance: number;
  studio_free_used: number;
  free_limit: number;
  tokens_per_image: number;
  is_free_tier: boolean;
  daily_reward_available: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;
  signInWithGoogle: (redirectAfterLogin?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface CreditsContextValue {
  credits: CreditBalance | null;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  claimDailyReward: () => Promise<{
    success: boolean;
    tokens_added: number;
    new_balance: number;
    message: string;
  }>;
}

// ─── Contexts ───

const AuthContext = createContext<AuthContextValue | null>(null);
const CreditsContext = createContext<CreditsContextValue | null>(null);

// ─── Provider ───

const CREDITS_CACHE_KEY = "credits_balance";

export function AppProvider({ children }: { children: ReactNode }) {
  // ── Auth state ──
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
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

  // Hydrate from localStorage before paint
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
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);

        if (
          newSession &&
          (event === "INITIAL_SESSION" ||
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED")
        ) {
          // Fire Lead event once per session on genuine sign-in
          if (event === "SIGNED_IN" && !sessionStorage.getItem("sp_lead_tracked")) {
            trackLead();
            sessionStorage.setItem("sp_lead_tracked", "1");
          }
          syncUser().finally(() => setAuthLoading(false));
        } else if (!newSession || event === "SIGNED_OUT") {
          setUser(null);
          localStorage.removeItem("sp_user");
          setAuthLoading(false);
        } else {
          setAuthLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, syncUser]);

  const signInWithPhone = useCallback(
    async (phone: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${phone}`,
      });
      if (error) throw new Error(error.message);
    },
    [supabase]
  );

  const verifyPhoneOtp = useCallback(
    async (phone: string, otp: string) => {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: "sms",
      });
      if (error) throw new Error(error.message);
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(
    async (redirectAfterLogin?: string) => {
      const next = redirectAfterLogin || "/jewelry";
      localStorage.setItem("sp_auth_redirect", next);
      const callbackUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      if (error) throw new Error(error.message);
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    localStorage.removeItem("sp_user");
    window.location.href = "/login";
  }, [supabase]);

  // ── Credits state ──
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

  // Hydrate credits from cache before paint
  useIsomorphicLayoutEffect(() => {
    const cached = cacheGet<CreditBalance>(CREDITS_CACHE_KEY);
    if (cached) {
      setCredits(cached);
      setCreditsLoading(false);
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      const data = await api.get<CreditBalance>("/credits/balance");
      setCredits(data);
      cacheSet(CREDITS_CACHE_KEY, data);
    } catch {
      setCredits(null);
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  // Fetch credits once after auth resolves (only if signed in)
  useEffect(() => {
    if (!authLoading && session) {
      fetchCredits();
    } else if (!authLoading && !session) {
      setCreditsLoading(false);
    }
  }, [authLoading, session, fetchCredits]);

  const claimDailyReward = useCallback(async () => {
    const result = await api.post<{
      success: boolean;
      tokens_added: number;
      new_balance: number;
      message: string;
    }>("/credits/claim-daily");
    if (result.success) {
      await fetchCredits();
    }
    return result;
  }, [fetchCredits]);

  // ── Context values (stable references) ──
  const authValue: AuthContextValue = {
    user,
    session,
    loading: authLoading,
    isAuthenticated: !!session,
    isAdmin: user?.is_admin || false,
    signInWithPhone,
    verifyPhoneOtp,
    signInWithGoogle,
    logout,
    refreshUser: syncUser,
  };

  const creditsValue: CreditsContextValue = {
    credits,
    loading: creditsLoading,
    refreshCredits: fetchCredits,
    claimDailyReward,
  };

  return (
    <AuthContext.Provider value={authValue}>
      <CreditsContext.Provider value={creditsValue}>
        {children}
      </CreditsContext.Provider>
    </AuthContext.Provider>
  );
}

// ─── Hooks (drop-in replacements) ───

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AppProvider>");
  return ctx;
}

export function useCredits(): CreditsContextValue {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within <AppProvider>");
  return ctx;
}
