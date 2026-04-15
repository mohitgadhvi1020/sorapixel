declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const DEBUG = process.env.NEXT_PUBLIC_META_PIXEL_DEBUG === "true";

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
}

export function trackPageView() {
  fbq("track", "PageView");
  if (DEBUG) console.log("[MetaPixel] PageView");
}

/**
 * Track a custom Meta Pixel event.
 * Returns the event_id for server-side CAPI deduplication.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): string {
  const eventId = crypto.randomUUID();
  fbq("track", eventName, params ?? {}, { eventID: eventId });
  if (DEBUG) console.log(`[MetaPixel] ${eventName}`, params, { eventId });
  return eventId;
}

export function trackPurchase(value: number, currency: string): string {
  return trackEvent("Purchase", { value, currency });
}

export function trackLead(): string {
  return trackEvent("Lead");
}

export function trackAddToCart(value?: number, currency?: string): string {
  const params: Record<string, unknown> = {};
  if (value !== undefined) params.value = value;
  if (currency) params.currency = currency;
  return trackEvent("AddToCart", params);
}

export { META_PIXEL_ID };
