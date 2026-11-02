"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCurrency, Currency } from "../context/CurrencyContext";
import { ChevronDown, Globe } from "lucide-react";

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currencies: { code: Currency; label: string; symbol: string }[] = [
    { code: "USD", label: "USD ($)", symbol: "$" },
    { code: "ETB", label: "ETB (ብር)", symbol: "ETB" },
    { code: "EUR", label: "EUR (€)", symbol: "€" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#14231b]/60 text-xs font-medium text-[#f3e5ab] hover:border-[#d4af37] hover:bg-[#1b4332]/80 transition-all cursor-pointer"
        aria-label="Select currency"
      >
        <Globe className="w-3.5 h-3.5 text-[#d4af37]" />
        <span>{currency}</span>
        <ChevronDown className={`w-3 h-3 text-[#d4af37]/80 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 py-1.5 rounded-xl border border-[#d4af37]/30 bg-[#0c140f]/95 backdrop-blur-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {currencies.map((item) => (
            <button
              key={item.code}
              onClick={() => {
                setCurrency(item.code);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                currency === item.code
                  ? "bg-[#2d6a4f]/50 text-[#f3e5ab] font-bold"
                  : "text-[#fbf8f2]/70 hover:bg-[#1b4332]/40 hover:text-white"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[#d4af37] font-semibold">{item.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
