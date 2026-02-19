/**
 * Central API client for the SoraPixel FastAPI backend.
 * All frontend pages use this instead of calling Next.js API routes.
 */

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

function getTokens(): { access: string | null; refresh: string | null } {
  if (typeof window === "undefined") return { access: null, refresh: null };
  return {
    access: localStorage.getItem("sp_access_token"),
    refresh: localStorage.getItem("sp_refresh_token"),
  };
}

function setTokens(access: string, refresh?: string): void {
  localStorage.setItem("sp_access_token", access);
  if (refresh) localStorage.setItem("sp_refresh_token", refresh);
}

function clearTokens(): void {
  localStorage.removeItem("sp_access_token");
  localStorage.removeItem("sp_refresh_token");
  localStorage.removeItem("sp_user");
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;

  try {
    const resp = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!resp.ok) {
      clearTokens();
      return null;
    }

    const data = await resp.json();
    setTokens(data.access_token);
    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

async function apiRequest<T = unknown>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, noAuth = false } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (!noAuth) {
    const { access } = getTokens();
    if (access) {
      requestHeaders["Authorization"] = `Bearer ${access}`;
    }
  }

  let resp = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (resp.status === 401 && !noAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      requestHeaders["Authorization"] = `Bearer ${newToken}`;
      resp = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    } else {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError("Session expired", 401);
    }
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
};

export { ApiError, getTokens, setTokens, clearTokens, API_BASE_URL };
