"use client";

/**
 * Simple module-level cache that persists across component remounts/navigations.
 * Data survives navigations within the same session but refreshes on full page reload.
 */

type CacheEntry<T> = {
    data: T;
    timestamp: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/** Default staleness: 2 minutes */
const DEFAULT_MAX_AGE_MS = 2 * 60 * 1000;

/**
 * Get cached data. Returns undefined if no cache or cache is stale.
 */
export function cacheGet<T>(key: string, maxAgeMs = DEFAULT_MAX_AGE_MS): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > maxAgeMs) {
        store.delete(key);
        return undefined;
    }
    return entry.data as T;
}

/**
 * Set cached data.
 */
export function cacheSet<T>(key: string, data: T): void {
    store.set(key, { data, timestamp: Date.now() });
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 */
export function cacheInvalidate(keyOrPrefix: string): void {
    if (store.has(keyOrPrefix)) {
        store.delete(keyOrPrefix);
    } else {
        // Prefix-based invalidation
        for (const key of store.keys()) {
            if (key.startsWith(keyOrPrefix)) {
                store.delete(key);
            }
        }
    }
}
