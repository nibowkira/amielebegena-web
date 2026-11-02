import { Router, Request, Response } from "express";

const router = Router();

// In-memory cache for exchange rates (1 hour TTL)
let ratesCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

router.get("/", async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (ratesCache && now - ratesCache.timestamp < CACHE_TTL_MS) {
      return res.json({ success: true, rates: ratesCache.data, cached: true });
    }

    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!response.ok) {
      throw new Error(`Exchange rate provider responded with status ${response.status}`);
    }

    const json = (await response.json()) as any;
    const rates = {
      USD: 1.0,
      ETB: json?.rates?.ETB || 105.8871,
      EUR: json?.rates?.EUR || 0.92,
    };

    ratesCache = { data: rates, timestamp: now };
    return res.json({ success: true, rates, cached: false });
  } catch (error: any) {
    console.error("Rates fetch error:", error);
    // Return fallback rates
    return res.json({
      success: true,
      rates: { USD: 1.0, ETB: 105.8871, EUR: 0.92 },
      fallback: true,
    });
  }
});

export default router;
