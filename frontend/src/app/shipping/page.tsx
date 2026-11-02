import React from "react";
import Link from "next/link";
import { Truck, ShieldCheck, Globe2, Package, CheckCircle2 } from "lucide-react";

export default function ShippingPage() {
  return (
    <div className="w-full min-h-screen py-16 px-4 sm:px-8 max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#d4af37]/35 bg-[#14231b] text-xs text-[#d4af37] font-semibold tracking-wider uppercase">
          <Truck className="w-3.5 h-3.5" />
          <span>Addis Ababa Express Dispatch</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#fbf8f2]">
          Worldwide Shipping & Export Assurance
        </h1>
        <p className="text-xs sm:text-sm text-[#fbf8f2]/70 leading-relaxed font-light">
          Delivering sacred acoustic treasures safely to over 35 countries across North America, Europe, Africa, and Australasia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-[#d4af37]/20 bg-[#0f1a14] space-y-3">
          <Package className="w-6 h-6 text-[#d4af37]" />
          <h3 className="font-serif text-base font-bold text-[#f3e5ab]">Flight-Rigid Casing</h3>
          <p className="text-xs text-[#fbf8f2]/65">
            Every Begena and Kirar is encased in custom double-corrugated shock-absorbing foam with protective bridge dampers to survive international transit.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-[#d4af37]/20 bg-[#0f1a14] space-y-3">
          <Globe2 className="w-6 h-6 text-[#d4af37]" />
          <h3 className="font-serif text-base font-bold text-[#f3e5ab]">DHL & Ethiopian Cargo</h3>
          <p className="text-xs text-[#fbf8f2]/65">
            Partnered directly with Ethiopian Airlines Cargo and DHL Express from Bole International Airport with full door-to-door tracking.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-[#d4af37]/20 bg-[#0f1a14] space-y-3">
          <ShieldCheck className="w-6 h-6 text-[#d4af37]" />
          <h3 className="font-serif text-base font-bold text-[#f3e5ab]">100% Insured Delivery</h3>
          <p className="text-xs text-[#fbf8f2]/65">
            Full replacement coverage against transit damage or delay. In the rare event of transit damage, an artisan replacement is dispatched at zero cost.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0a100c] p-8 space-y-4 text-xs sm:text-sm text-[#fbf8f2]/80 leading-relaxed">
        <h2 className="font-serif text-xl font-bold text-[#f3e5ab]">Estimated Transit Timelines</h2>
        <ul className="space-y-2 list-disc list-inside text-xs">
          <li><strong>Domestic Ethiopia (Addis Ababa & Regions):</strong> 1–3 business days.</li>
          <li><strong>North America (USA & Canada):</strong> 5–9 business days via express air cargo.</li>
          <li><strong>Europe & UK:</strong> 4–7 business days.</li>
          <li><strong>Rest of World:</strong> 7–12 business days.</li>
        </ul>
      </div>
    </div>
  );
}
