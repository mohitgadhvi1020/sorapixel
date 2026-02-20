/**
 * Central API client for the SoraPixel FastAPI backend.
 * Uses Supabase session tokens for authentication.
 */

import { getSupabaseBrowser } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  noAuth?: boolean;
}

class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const supabase = getSupabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function apiRequest<T = unknown>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, noAuth = false } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (!noAuth) {
    const token = await getAccessToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const resp = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (resp.status === 401 && !noAuth) {
    if (typeof window !== "undefined") {
      const supabase = getSupabaseBrowser();
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      if (refreshed) {
        requestHeaders["Authorization"] = `Bearer ${refreshed.access_token}`;
        const retry = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (retry.ok) return retry.json();
      }
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
    throw new ApiError("Session expired", 401);
  }

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || `Request failed: ${resp.status}`,
      resp.status,
      errorData,
    );
  }

  return resp.json();
}

async function apiUpload<T = unknown>(endpoint: string, formData: FormData): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {};
  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let resp = await fetch(url, { method: "POST", headers, body: formData });

  if (resp.status === 401) {
    const supabase = getSupabaseBrowser();
    const { data: { session } } = await supabase.auth.refreshSession();
    if (session) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
      resp = await fetch(url, { method: "POST", headers, body: formData });
    } else {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError("Session expired", 401);
    }
  }

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new ApiError(errorData.detail || `Upload failed: ${resp.status}`, resp.status, errorData);
  }

  return resp.json();
}

export const api = {
  get: <T = unknown>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T = unknown>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "POST", body }),
  put: <T = unknown>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "PUT", body }),
  patch: <T = unknown>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "PATCH", body }),
  delete: <T = unknown>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),
  upload: <T = unknown>(endpoint: string, formData: FormData) =>
    apiUpload<T>(endpoint, formData),
};

export { ApiError, API_BASE_URL };
