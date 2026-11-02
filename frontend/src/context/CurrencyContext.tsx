"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchExchangeRates } from "../lib/api";

export type Currency = "USD" | "ETB" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<string, number>;
  formatPrice: (amount: number | string, baseCurrency?: string) => string;
  convertPrice: (amount: number | string, baseCurrency?: string) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [rates, setRates] = useState<Record<string, number>>({
    USD: 1.0,
    ETB: 105.8871,
    EUR: 0.92,
  });

  useEffect(() => {
    // Load persisted currency
    const saved = localStorage.getItem("amiele_currency");
    if (saved === "USD" || saved === "ETB" || saved === "EUR") {
      setCurrencyState(saved);
    }

    // Fetch latest exchange rates from backend
    fetchExchangeRates().then((latestRates) => {
      if (latestRates) {
        setRates(latestRates);
      }
    });
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("amiele_currency", c);
  };

  const convertPrice = (amount: number | string, baseCurrency: string = "USD"): number => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return 0;

    // Convert base currency to USD first
    let inUSD = num;
    if (baseCurrency === "ETB") {
      inUSD = num / (rates.ETB || 105.8871);
    } else if (baseCurrency === "EUR") {
      inUSD = num / (rates.EUR || 0.92);
    }

    // Convert from USD to target currency
    if (currency === "USD") return inUSD;
    if (currency === "ETB") return inUSD * (rates.ETB || 105.8871);
    if (currency === "EUR") return inUSD * (rates.EUR || 0.92);
    return inUSD;
  };

  const formatPrice = (amount: number | string, baseCurrency: string = "USD"): string => {
    const converted = convertPrice(amount, baseCurrency);
    if (currency === "USD") {
      return `$${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === "ETB") {
      return `ETB ${Math.round(converted).toLocaleString()}`;
    }
    if (currency === "EUR") {
      return `€${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, formatPrice, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
