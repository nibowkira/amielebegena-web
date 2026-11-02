"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { submitAffiliateApplication } from "../../../lib/api";
import { CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, X } from "lucide-react";

export default function AffiliateApplyPage() {
  const { user, profile } = useAuth();

  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  // Form inputs
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [insta, setInsta] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [why, setWhy] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (profile?.fullName) setFullName(profile.fullName);
    else if (user?.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
    if (profile?.phone) setPhone(profile.phone);
  }, [user, profile]);

  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !country) {
      setErrorMsg("Please fill in your full name, phone number, and country.");
      return;
    }
    setErrorMsg(null);
    setActiveStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!why.trim()) {
      setErrorMsg("Please share a brief motivation before submitting.");
      return;
    }
    if (!agreedTerms) {
      setErrorMsg("Please accept the Partnership Terms to proceed.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const socialLinks = [insta.trim(), tiktok.trim(), youtube.trim()]
      .filter(Boolean)
      .join(", ");

    const res = await submitAffiliateApplication({
      user_id: user?.id,
      full_name: fullName.trim(),
      email: email.trim() || user?.email || `${fullName.trim().toLowerCase().replace(/\s+/g, "")}@example.com`,
      phone: phone.trim(),
      motivation: why.trim(),
      social_link: socialLinks || country,
      payment_method: "telebirr",
      account_details: country,
    });

    if (res && res.success) {
      setSuccess(true);
    } else {
      setErrorMsg(res?.error || "Failed to submit application. Please check your connection.");
    }
    setSubmitting(false);
  };

  // If user is already an approved affiliate
  if (profile?.role === "affiliate") {
    return (
      <div className="w-full min-h-[75vh] py-16 px-4 sm:px-8 flex items-center justify-center bg-[#FAF8F5]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-md border border-[#14231b]/8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#1b4332] text-[#52b788] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-benaiah text-2xl font-extrabold text-[#14231b]">
            Affiliate Account Active
          </h2>
          <p className="text-xs sm:text-sm text-[#5b615e] font-light leading-relaxed">
            Welcome back! You are already an approved affiliate partner. You can view your referrals, commission balance, and marketing links in your portal.
          </p>
          <div className="pt-2">
            <Link
              href="/affiliate/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-[#f3be3b] hover:bg-[#eab308] text-[#14231b] font-bold text-xs uppercase tracking-wider shadow transition-all"
            >
              <span>Open Affiliate Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[90vh] py-14 sm:py-20 px-4 sm:px-6 bg-[#050e08] flex items-center justify-center overflow-hidden">
      {/* STATIC PROFESSIONAL & PREMIUM ARCHIVAL LUXURY BACKGROUND (ZERO MOVEMENT) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Subtle Authentic Begena Cultural Image (Stationary, Archival Luminescence) */}
        <div
          className="absolute inset-0 opacity-[0.035] bg-center bg-cover mix-blend-luminosity"
          style={{
            backgroundImage: "url('/image/photo_2025-10-01_07-26-53.jpg')",
          }}
        />

        {/* Premium Vignette & Radial Contrast */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#050e08_85%)]" />

        {/* Static Ambient Luxury Lighting 1: Top Soft Champagne Gold Aura */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[360px] rounded-full bg-[#d4af37]/10 blur-[140px]" />

        {/* Static Ambient Luxury Lighting 2: Bottom Deep Sacred Forest Green */}
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[720px] h-[380px] rounded-full bg-[#1b4332]/35 blur-[150px]" />

        {/* Static Ambient Luxury Lighting 3: Centered Subtle Emerald Halo Behind Card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-[#2d6a4f]/12 blur-[110px]" />
      </div>

      {/* COMPACT SINGLE-CARD CONTAINER (max-w-[480px], lightweight, zero vertical scroll) */}
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-[28px] p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.7)_inset] border border-[#14231b]/10 space-y-4 animate-in zoom-in-95 duration-200">
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#1b4332] border border-[#52b788] mx-auto flex items-center justify-center text-[#52b788]">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="font-benaiah text-2xl font-extrabold text-[#14231b]">
              Application Submitted!
            </h2>
            <p className="text-xs text-[#5b615e] max-w-sm mx-auto leading-relaxed font-light">
              Thank you for applying to become an Amiele Partner. Our artisans review all ambassador submissions within 24–48 hours.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-2.5">
              <Link
                href="/account"
                className="px-6 py-2.5 rounded-full bg-[#14231b] hover:bg-[#1a3325] text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Back to Account
              </Link>
              <Link
                href="/affiliate"
                className="px-6 py-2.5 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] border border-[#14231b]/15 text-[#14231b] font-bold text-xs uppercase tracking-wider transition-all"
              >
                Program Overview
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Top Navigation Row: Back Button & Close Button */}
            <div className="flex items-center justify-between pb-1 -mt-1">
              {activeStep === 2 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#14231b] text-xs font-semibold transition-all cursor-pointer group"
                  aria-label="Back to Step 1"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back</span>
                </button>
              ) : (
                <Link
                  href="/affiliate"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#14231b] text-xs font-semibold transition-all cursor-pointer group"
                  aria-label="Back to affiliate overview"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back</span>
                </Link>
              )}

              <Link
                href="/affiliate"
                className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#14231b] hover:bg-[#F4F1EA] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Back to overview"
              >
                <X className="w-4 h-4" />
              </Link>
            </div>

            {/* 2-Step Progress Indicator Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#737874]">
                <span>
                  {activeStep === 1
                    ? "Step 1 of 2: Personal Details"
                    : "Step 2 of 2: Channels & Motivation"}
                </span>
                <span className="text-[#b8860b]">{activeStep === 1 ? "50%" : "100%"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 h-1.5 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
                <div className="h-full bg-[#d4af37] rounded-full transition-all duration-300" />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    activeStep === 2 ? "bg-[#d4af37]" : "bg-transparent"
                  }`}
                />
              </div>
            </div>

            {/* Card Title & Subtitle */}
            <div className="text-center space-y-1 pt-1">
              <h1 className="font-benaiah text-xl sm:text-2xl font-extrabold text-[#14231b]">
                Partnership Application
              </h1>
              <p className="text-[11px] sm:text-xs text-[#5b615e] font-light max-w-xs mx-auto leading-snug">
                {activeStep === 1
                  ? "Fast 3-second application. Start with your contact info."
                  : "Tell us about your audience and cultural promotion."}
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: Full Name, Phone, Country, Email */}
            {activeStep === 1 && (
              <form onSubmit={handleProceedToStep2} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#14231b] uppercase tracking-wider block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dawit Yohannes"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-transparent bg-[#F5F2EB] text-xs text-[#14231b] placeholder:text-[#14231b]/35 focus:outline-none focus:ring-2 focus:ring-[#14231b]/20 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#14231b] uppercase tracking-wider block">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251911223344"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-transparent bg-[#F5F2EB] text-xs text-[#14231b] placeholder:text-[#14231b]/35 focus:outline-none focus:ring-2 focus:ring-[#14231b]/20 focus:bg-white transition-all"
                  />
                </div>

                {!user && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#14231b] uppercase tracking-wider block">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dawit@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-transparent bg-[#F5F2EB] text-xs text-[#14231b] placeholder:text-[#14231b]/35 focus:outline-none focus:ring-2 focus:ring-[#14231b]/20 focus:bg-white transition-all"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#14231b] uppercase tracking-wider block">
                    Country *
                  </label>
                  <select
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-transparent bg-[#F5F2EB] text-xs text-[#14231b] focus:outline-none focus:ring-2 focus:ring-[#14231b]/20 focus:bg-white cursor-pointer transition-all"
                  >
                    <option value="" disabled>Select country</option>
                    <option value="Ethiopia">Ethiopia</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Germany">Germany</option>
                    <option value="Canada">Canada</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center gap-2.5">
                  <Link
                    href="/affiliate"
                    className="px-4 py-3.5 rounded-full border border-[#14231b]/15 bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#14231b] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </Link>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-full bg-[#f3be3b] hover:bg-[#eab308] text-[#14231b] font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Step 2</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Social Channels & Motivation + Submit */}
            {activeStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#14231b] uppercase tracking-wider block">
                    Social Channels (Optional)
                  </label>
                  <div className="space-y-1.5">
                    {/* Instagram */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F2EB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#14231b]/20 transition-all">
                      <svg className="w-3.5 h-3.5 fill-none stroke-[#e1306c] stroke-2 shrink-0" viewBox="0 0 24 24">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                      </svg>
                      <input
                        type="text"
                        value={insta}
                        onChange={(e) => setInsta(e.target.value)}
                        placeholder="Instagram Profile Link"
                        className="w-full bg-transparent text-xs text-[#14231b] placeholder:text-[#14231b]/35 focus:outline-none"
                      />
                    </div>

                    {/* TikTok */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F2EB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#14231b]/20 transition-all">
                      <svg className="w-3.5 h-3.5 fill-[#000000] shrink-0" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                      </svg>
                      <input
                        type="text"
                        value={tiktok}
                        onChange={(e) => setTiktok(e.target.value)}
                        placeholder="TikTok Profile Link"
                        className="w-full bg-transparent text-xs text-[#14231b] placeholder:text-[#14231b]/35 focus:outline-none"
                      />
                    </div>

                    {/* YouTube */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F2EB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#14231b]/20 transition-all">
                      <svg className="w-4 h-4 fill-[#ff0000] shrink-0" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      <input
                        type="text"
                        value={youtube}
                        onChange={(e) => setYoutube(e.target.value)}
                        placeholder="YouTube Channel Link"
                        className="w-full bg-transparent text-xs text-[#14231b] placeholder:text-[#14231b]/35 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#14231b] uppercase tracking-wider block">
                    Why do you want to join our affiliate program? *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    placeholder="Describe your audience or cultural connection..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-transparent bg-[#F5F2EB] text-xs text-[#14231b] placeholder:text-[#14231b]/35 focus:outline-none focus:ring-2 focus:ring-[#14231b]/20 focus:bg-white resize-none transition-all"
                  />
                </div>

                <div className="flex items-start gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="apply-page-terms"
                    required
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-[#14231b] focus:ring-[#14231b] cursor-pointer"
                  />
                  <label htmlFor="apply-page-terms" className="text-[11px] text-[#5b615e] font-light leading-snug cursor-pointer select-none">
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" className="font-semibold text-[#14231b] hover:underline">
                      Partnership Terms
                    </Link>.
                  </label>
                </div>

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-3 rounded-full border border-[#14231b]/15 bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#14231b] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-full bg-[#14231b] hover:bg-[#1a3325] text-white font-benaiah font-bold text-xs uppercase tracking-wider shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
