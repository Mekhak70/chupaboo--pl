"use client";

import { useEffect, useState } from "react";

export function usePolandExchangeRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [rateError, setRateError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("https://api.frankfurter.dev/v2/rates?base=AMD&quotes=PLN", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Exchange rate unavailable");
        const data: { base: string; quote: string; rate: number }[] = await response.json();
        const conversion = data.find((item) => item.base === "AMD" && item.quote === "PLN")?.rate;
        if (conversion === undefined || !Number.isFinite(conversion) || conversion <= 0) {
          throw new Error("Invalid PLN exchange rate");
        }
        if (!controller.signal.aborted) setRate(conversion);
      } catch {
        if (!controller.signal.aborted) setRateError(true);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  return { rate, rateError };
}
