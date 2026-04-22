declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
const DEBUG = process.env.NEXT_PUBLIC_GA_DEBUG === "true";

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

export function trackPageView(url?: string) {
  if (!GA_MEASUREMENT_ID) return;
  gtag("event", "page_view", {
    page_path: url ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined),
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
  });
  if (DEBUG) console.log("[GA4] page_view", url);
}

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (!GA_MEASUREMENT_ID) return;
  gtag("event", eventName, params ?? {});
  if (DEBUG) console.log(`[GA4] ${eventName}`, params);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!GA_MEASUREMENT_ID) return;
  gtag("set", "user_properties", traits ?? {});
  gtag("config", GA_MEASUREMENT_ID, { user_id: userId });
  if (DEBUG) console.log("[GA4] identify", userId, traits);
}

export function trackPurchase(value: number, currency: string, transactionId?: string) {
  trackEvent("purchase", {
    value,
    currency,
    transaction_id: transactionId ?? crypto.randomUUID(),
  });
}

export function trackSignup(method?: string) {
  trackEvent("sign_up", { method: method ?? "email" });
}

export function trackLogin(method?: string) {
  trackEvent("login", { method: method ?? "email" });
}

export { GA_MEASUREMENT_ID };
