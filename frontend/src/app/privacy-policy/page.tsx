import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="w-full min-h-screen py-16 px-4 sm:px-8 max-w-4xl mx-auto space-y-8 text-[#fbf8f2]/80 leading-relaxed text-xs sm:text-sm">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#fbf8f2]">Privacy Policy</h1>
      <p className="text-[11px] text-[#d4af37]">Effective Date: October 2026 • Amiele Begena</p>

      <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0f1a14]/80 p-8 space-y-6">
        <h2 className="font-serif text-lg font-bold text-[#f3e5ab]">1. Information We Collect</h2>
        <p>
          When you place a guest order or register as an affiliate on Amiele Begena, we collect your name, phone number (for WhatsApp fulfillment), email address, and destination delivery address.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#f3e5ab]">2. Referral & Telemetry Tracking</h2>
        <p>
          We log anonymous referral click telemetry (referral code, user-agent, landing page) exclusively to attribute commissions to our cultural ambassadors. We never sell your personal information to third-party advertisers.
        </p>

        <h2 className="font-serif text-lg font-bold text-[#f3e5ab]">3. Data Security & Row Level Security</h2>
        <p>
          Our databases enforce PostgreSQL Row Level Security (RLS) standards. Authentication is secured using cryptographic JWT sessions.
        </p>
      </div>
    </div>
  );
}
