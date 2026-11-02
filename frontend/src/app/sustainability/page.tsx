import React from "react";
import Link from "next/link";
import { TreePine, Heart, ShieldCheck, Sparkles } from "lucide-react";

export default function SustainabilityPage() {
  return (
    <div className="w-full min-h-screen py-16 px-4 sm:px-8 max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#d4af37]/35 bg-[#14231b] text-xs text-[#d4af37] font-semibold tracking-wider uppercase">
          <TreePine className="w-3.5 h-3.5" />
          <span>Ecological & Artisan Ethics</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#fbf8f2]">
          Sustainable Craftsmanship & Ethical Heritage
        </h1>
        <p className="text-xs sm:text-sm text-[#fbf8f2]/70 leading-relaxed font-light">
          Balancing ancient organic materials with regenerative forestry and fair artisan compensation in Ethiopia.
        </p>
      </div>

      <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0f1a14]/80 p-8 sm:p-12 space-y-6 text-xs sm:text-sm text-[#fbf8f2]/80 leading-relaxed">
        <h2 className="font-serif text-xl font-bold text-[#f3e5ab]">Responsible Highland Wood Sourcing</h2>
        <p>
          We strictly source native highland timber from certified, managed plots in Ethiopia. Trees are harvested at the end of their natural life cycle, and for every mature tree harvested for our soundboxes, our artisan cooperative supports replanting indigenous saplings across the central highlands.
        </p>

        <h2 className="font-serif text-xl font-bold text-[#f3e5ab] pt-4">Zero Chemical Tanning</h2>
        <p>
          Unlike modern industrial drums that use toxic synthetic chemical dyes or chrome tanning, our goatskin parchment is cured using century-old organic methods: natural highland spring water, salt, and sun exposure. This ensures an environmentally pure soundbox free of synthetic volatile organic compounds.
        </p>

        <h2 className="font-serif text-xl font-bold text-[#f3e5ab] pt-4">Generational Artisan Dignity</h2>
        <p>
          Our master craftsmen set their own fair compensation. In addition to base prices, 8% of all platform revenues directly sustain apprenticeships for young Ethiopian builders, ensuring the art form thrives for the next millennium.
        </p>
      </div>
    </div>
  );
}
