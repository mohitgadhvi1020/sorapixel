"use client";

import { useState, useEffect, useCallback } from "react";
import { api, setTokens, clearTokens, getTokens } from "@/lib/api-client";

interface User {
  id: string;
  phone: string;
  name: string;
  company_name: string;
  is_admin: boolean;
  token_balance: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const { access } = getTokens();
    if (!access) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.get<User>("/users/me");
      setUser(data);
      localStorage.setItem("sp_user", JSON.stringify(data));
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem("sp_user");
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch { /* ignore */ }
    }
    loadUser();
  }, [loadUser]);

  const sendOtp = async (phone: string) => {
    return api.post<{ success: boolean; message: string }>("/auth/send-otp", { phone });
  };

  const verifyOtp = async (phone: string, otp: string) => {
    const data = await api.post<{
      success: boolean;
      access_token: string;
      refresh_token: string;
      user: User;
    }>("/auth/verify-otp", { phone, otp });

    setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    localStorage.setItem("sp_user", JSON.stringify(data.user));
    document.cookie = "sp_logged_in=1; path=/; max-age=2592000"; // 30 days, for middleware
    return data;
  };

  const logout = () => {
    api.post("/auth/logout").catch(() => {});
    clearTokens();
    document.cookie = "sp_logged_in=; path=/; max-age=0";
    setUser(null);
    window.location.href = "/login";
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    sendOtp,
    verifyOtp,
    logout,
    refreshUser: loadUser,
  };
}
