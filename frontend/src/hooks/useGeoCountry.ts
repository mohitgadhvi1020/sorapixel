"use client";

import { useState, useEffect } from "react";

type Currency = "INR" | "USD" | "EUR";

interface GeoInfo {
  country: string;
  currency: Currency;
  isIndia: boolean;
}

const EUROPE_CODES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
  "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","GB",
  "NO","CH","IS",
]);

function currencyFromCountry(code: string): Currency {
  if (code === "IN") return "INR";
  if (EUROPE_CODES.has(code)) return "EUR";
  return "USD";
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`;
}

const DEFAULT: GeoInfo = { country: "", currency: "INR", isIndia: true };

export function useGeoCountry(): GeoInfo {
  const [geo, setGeo] = useState<GeoInfo>(DEFAULT);

  useEffect(() => {
    const country = getCookie("geo_country");
    if (country) {
      const currency = (getCookie("geo_currency") as Currency) || currencyFromCountry(country);
      setGeo({ country, currency, isIndia: country === "IN" });
      return;
    }

    let cancelled = false;

    async function detect() {
      let code = "";

      // Primary: Cloudflare trace (free, no rate limits, very reliable)
      try {
        const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const text = await res.text();
          const match = text.match(/loc=([A-Z]{2})/);
          if (match) code = match[1];
        }
      } catch {
        // try fallback
      }

      // Fallback: ipapi.co
      if (!code) {
        try {
          const res = await fetch("https://ipapi.co/json/", {
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            const data = await res.json();
            code = data.country_code || "";
          }
        } catch {
          // stay at default
        }
      }

      if (!code || cancelled) return;

      const currency = currencyFromCountry(code);
      setCookie("geo_country", code);
      setCookie("geo_currency", currency);
      setGeo({ country: code, currency, isIndia: code === "IN" });
    }

    detect();
    return () => { cancelled = true; };
  }, []);

  return geo;
}
