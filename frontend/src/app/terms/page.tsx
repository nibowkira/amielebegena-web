import React from "react";

export default function TermsPage() {
  return (
    <div className="w-full min-h-screen py-16 px-4 sm:px-8 max-w-4xl mx-auto space-y-8 text-[#fbf8f2]/80 leading-relaxed text-xs sm:text-sm">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#fbf8f2]">Terms of Heritage Archive</h1>
      <p className="text-[11px] text-[#d4af37]">Effective Date: October 2026 • Amiele Begena</p>

      <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0f1a14]/80 p-8 space-y-6">
        <h2 className="font-serif text-lg font-bold text-[#f3e5ab]">1. Authentic Artisan Craftsmanship</h2>
        <p>
          Because our instruments are handcrafted from natural highland timber and sun-cured parchment skins, minor grain variations and organic parchment marbling are intrinsic marks of authentic handmade craftsmanship.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#f3e5ab]">2. Export & Delivery Guarantee</h2>
        <p>
          All exported instruments undergo international air-freight packaging and customs certification from Bole Cargo in Addis Ababa. In the rare event of transit damage, an insured artisan replacement is provided.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#f3e5ab]">3. Affiliate Terms</h2>
        <p>
          Affiliates earn an 8% commission upon payment verification of attributed guest orders. Minimum withdrawal threshold is 1,000 ETB. Duplicate submissions or fraudulent self-attribution are strictly prevented by database integrity checks.
        </p>
      </div>
    </div>
  );
}
