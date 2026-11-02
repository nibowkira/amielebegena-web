"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { submitAffiliateApplication } from "../../lib/api";
import { Plus, Minus, X, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";

export default function AffiliateLandingPage() {
  const { user, profile } = useAuth();
  const isAffiliate = profile?.role === "affiliate";

  // Accordion open/close state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Application Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  // Form inputs state
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
  const [applySuccess, setApplySuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (profile?.fullName) setFullName(profile.fullName);
    else if (user?.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
    if (profile?.phone) setPhone(profile.phone);
  }, [user, profile]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleOpenModal = () => {
    setIsApplyModalOpen(true);
    setActiveStep(1);
    setApplySuccess(false);
    setErrorMsg(null);
  };

  const handleCloseModal = () => {
    setIsApplyModalOpen(false);
  };

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
      setApplySuccess(true);
    } else {
      setErrorMsg(res?.error || "Failed to submit application. Please check your connection.");
    }
    setSubmitting(false);
  };

  const partnerBenefits = [
    {
      emoji: "💵",
      title: "Flat 8% Commission",
      desc: "Earn a flat 8% commission on every approved referred sale — no tiers, no caps, no complexity.",
    },
    {
      emoji: "🎨",
      title: "Marketing Resources",
      desc: "Access high-quality studio photos, workshop videos, ready-to-use captions, posters, and story templates.",
    },
    {
      emoji: "📈",
      title: "Monthly Challenges",
      desc: "Boost your earnings with active bonus campaigns. E.g., Sell 5 Krars to win an extra +1,500 ETB reward.",
    },
    {
      emoji: "🛡️",
      title: "Trusted Heritage",
      desc: "Promote genuine instruments built with traditional wanza/cedar wood, highland beeswax, and authentic bull hides.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Submit Application",
      desc: "Register an account and fill out our quick affiliate application form detailing your platform and background.",
    },
    {
      num: "02",
      title: "Share Referral Link",
      desc: "Get approved and grab your unique referral link, custom coupon code, and marketing assets from your dashboard.",
    },
    {
      num: "03",
      title: "Receive Commissions",
      desc: "Track your conversions, request Telebirr or CBE payouts, and earn recognition on the Success Wall.",
    },
  ];

  const faqs = [
    {
      question: "How are my referral sales tracked?",
      answer:
        "Sales are tracked using cookie technology when customers click your custom link, or when they apply your unique coupon code at checkout.",
    },
    {
      question: "What payment methods do you support?",
      answer:
        "We pay out local commissions using Telebirr or Commercial Bank of Ethiopia (CBE) wire. International payout structures can be custom arranged via bank transfer or PayPal.",
    },
    {
      question: "Is there a minimum withdrawal amount?",
      answer:
        "Yes, the minimum withdrawal amount for commission requests is 1,000 ETB or equivalent USD.",
    },
    {
      question: "Can I apply if I live outside of Ethiopia?",
      answer:
        "Absolutely! We ship our musical instruments worldwide from Addis Ababa. We welcome affiliates in Europe, North America, and globally who want to share Ethiopian heritage.",
    },
  ];

  return (
    <div className="w-full flex flex-col bg-[#FAF8F5] text-[#14231b]">
      {/* 1. HERO SECTION (Deep Forest Green - Matching Screenshot 1) */}
      <section className="relative w-full py-24 sm:py-28 px-6 sm:px-12 lg:px-20 bg-[#0d1e16] text-[#fbf8f2] text-center overflow-hidden">
        {/* Subtle authentic instrument background watermark */}
        <div
          className="absolute inset-0 opacity-[0.05] bg-center bg-cover pointer-events-none"
          style={{ backgroundImage: "url('/image/photo_2025-10-01_07-26-53.jpg')" }}
        />
        {/* Ambient lighting blurs */}
        <div className="absolute top-10 right-10 w-[420px] h-[420px] bg-[#1a382a]/40 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-[#234b38]/25 rounded-full blur-[110px] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          {/* Top Subtitle Tag */}
          <div className="reveal">
            <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] text-[#f59e0b] sm:text-[#f3be3b] uppercase">
              AMIELE AFFILIATE PROGRAM
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="reveal font-benaiah text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#fbf8f2] leading-[1.2] tracking-tight">
            Earn by Sharing Ethiopian Musical Heritage
          </h1>

          {/* Description */}
          <p className="reveal text-xs sm:text-sm md:text-base text-[#cedad3] max-w-2xl mx-auto font-light leading-relaxed opacity-95">
            Join the Amiele Affiliate Program. Promote our handcrafted, premium Begenas, Krars, and
            percussion instruments, and earn 8% commission on every approved referred sale.
          </p>

          {/* Golden Yellow Pill Button */}
          <div className="reveal pt-4">
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#f3be3b] hover:bg-[#eab308] text-[#14231b] font-bold text-xs sm:text-sm tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            >
              <span>{isAffiliate ? "Go to Affiliate Dashboard" : "Apply For Affiliate Program"}</span>
              <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. WHY PARTNER WITH AMIELE? (Warm Cream Background - Matching Screenshot 2) */}
      <section className="w-full py-20 sm:py-24 px-6 sm:px-12 lg:px-20 bg-[#FAF8F5]">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-2 reveal">
            <h2 className="font-benaiah text-2xl sm:text-4xl font-extrabold text-[#14231b]">
              Why Partner with Amiele?
            </h2>
            <p className="text-xs sm:text-sm text-[#5b615e] font-light max-w-xl mx-auto">
              Discover the benefits of the industry&apos;s most dedicated cultural instruments partner program.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {partnerBenefits.map((item, idx) => (
              <div
                key={idx}
                className="reveal rounded-3xl bg-white p-7 border border-[#14231b]/6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="space-y-3">
                  <div className="text-3xl sm:text-4xl select-none">{item.emoji}</div>
                  <h3 className="font-benaiah text-base sm:text-lg font-extrabold text-[#14231b]">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#5b615e] leading-relaxed font-light">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (Deep Forest Green - Matching Screenshot 3) */}
      <section className="w-full py-20 sm:py-24 px-6 sm:px-12 lg:px-20 bg-[#0d1e16] text-[#fbf8f2]">
        <div className="max-w-5xl mx-auto space-y-14">
          {/* Header */}
          <div className="text-center space-y-2 reveal">
            <h2 className="font-benaiah text-2xl sm:text-4xl font-extrabold text-[#fbf8f2]">
              How It Works
            </h2>
            <p className="text-xs sm:text-sm text-[#cedad3] font-light max-w-xl mx-auto">
              Launch your cultural brand affiliate stream in three simple steps.
            </p>
          </div>

          {/* 3 Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
            {steps.map((s, idx) => (
              <div
                key={s.num}
                className="reveal space-y-3 p-4 rounded-2xl transition-all"
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <div className="font-benaiah text-3xl sm:text-4xl font-extrabold text-[#52b788]">
                  {s.num}
                </div>
                <h3 className="font-benaiah text-lg sm:text-xl font-bold text-white">
                  {s.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#cedad3] font-light leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FLAT 8% COMMISSION TABLE & FAQS (Warm Cream Background - Matching Screenshot 4 & 5) */}
      <section className="w-full py-20 sm:py-24 px-6 sm:px-12 lg:px-20 bg-[#FAF8F5]">
        <div className="max-w-4xl mx-auto space-y-20">
          {/* Commission Details Table */}
          <div className="space-y-8 reveal">
            <div className="text-center space-y-2">
              <h2 className="font-benaiah text-2xl sm:text-4xl font-extrabold text-[#14231b]">
                Flat 8% Commission
              </h2>
              <p className="text-xs sm:text-sm text-[#5b615e] font-light max-w-xl mx-auto">
                Every approved referred sale earns you 8% — simple, transparent, and equal for every partner.
              </p>
            </div>

            {/* Table Card */}
            <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#14231b]/10 shadow-xs overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 bg-[#faf9f5] px-6 py-4 border-b border-[#14231b]/10 text-[11px] font-bold text-[#737874] uppercase tracking-wider">
                <span>COMMISSION PROGRAM</span>
                <span className="hidden sm:inline">DETAILS</span>
              </div>
              <div className="divide-y divide-[#14231b]/8">
                <div className="grid grid-cols-1 sm:grid-cols-2 px-6 py-4 gap-1 sm:gap-4 items-center">
                  <span className="font-bold text-xs sm:text-sm text-[#14231b]">Commission Rate</span>
                  <span className="text-xs sm:text-sm text-[#5b615e]">8% on every approved referred sale</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 px-6 py-4 gap-1 sm:gap-4 items-center">
                  <span className="font-bold text-xs sm:text-sm text-[#14231b]">No Performance Tiers</span>
                  <span className="text-xs sm:text-sm text-[#5b615e]">
                    The same 8% rate for all partners, from your first sale onward
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 px-6 py-4 gap-1 sm:gap-4 items-center">
                  <span className="font-bold text-xs sm:text-sm text-[#14231b]">Transparent Payouts</span>
                  <span className="text-xs sm:text-sm text-[#5b615e]">
                    Track commissions in your dashboard and withdraw via Telebirr or CBE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQs Accordion matching Screenshot 1 */}
          <div className="space-y-8 reveal">
            <div className="text-center space-y-2">
              <h2 className="font-benaiah text-2xl sm:text-4xl font-extrabold text-[#14231b]">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-[#5b615e] font-light max-w-xl mx-auto">
                Everything you need to know about the Amiele Affiliate Program.
              </p>
            </div>

            <div className="max-w-3xl mx-auto border-t border-[#14231b]/15">
              {faqs.map((faq, fIdx) => {
                const isOpen = openFaq === fIdx;
                return (
                  <div
                    key={fIdx}
                    className="border-b border-[#14231b]/15 transition-colors"
                  >
                    <button
                      onClick={() => toggleFaq(fIdx)}
                      className="w-full flex items-center justify-between py-5 sm:py-6 text-left cursor-pointer transition-colors group"
                      aria-expanded={isOpen}
                    >
                      <span className="font-semibold text-sm sm:text-[15px] text-[#14231b] pr-4 group-hover:text-[#2d6a4f] transition-colors">
                        {faq.question}
                      </span>
                      <span className="text-xl font-light text-[#14231b] shrink-0 pl-2 select-none">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pb-5 pt-0 text-xs sm:text-sm text-[#5b615e] font-light leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 5. READY TO BECOME AN AMIELE PARTNER? (Deep Forest Green CTA - Exact Match to Screenshot 1) */}
      <section className="w-full py-24 sm:py-28 px-6 sm:px-12 lg:px-20 bg-[#0d1e16] text-[#fbf8f2] text-center">
        <div className="max-w-3xl mx-auto space-y-6 reveal">
          <h2 className="font-benaiah text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-white tracking-tight">
            Ready to become an Amiele Partner?
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-[#cedad3] font-light max-w-xl mx-auto leading-relaxed">
            Join us in preserving the resonance of spiritual strings while earning rewards.
          </p>
          <div className="pt-4">
            <button
              onClick={handleOpenModal}
              className="inline-block px-10 py-4 rounded-full bg-[#f3be3b] hover:bg-[#eab308] text-[#14231b] font-bold text-xs sm:text-sm tracking-wide shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      {/* 6. COMPACT 2-STEP APPLICATION MODAL (PROFESSIONAL & PREMIUM STATIC BACKDROP) */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050e08]/85 backdrop-blur-xl overflow-hidden animate-in fade-in duration-300">
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
            {/* Top Navigation Row: Back Button & Close Button */}
            <div className="flex items-center justify-between pb-1 -mt-1">
              <button
                type="button"
                onClick={activeStep === 2 ? () => setActiveStep(1) : handleCloseModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#14231b] text-xs font-semibold transition-all cursor-pointer group"
                aria-label="Go back"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#14231b] hover:bg-[#F4F1EA] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {applySuccess ? (
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
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleCloseModal}
                    className="px-8 py-3 rounded-full bg-[#14231b] hover:bg-[#1a3325] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                  <h2 className="font-benaiah text-xl sm:text-2xl font-extrabold text-[#14231b]">
                    Partnership Application
                  </h2>
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
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-4 py-3.5 rounded-full border border-[#14231b]/15 bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#14231b] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
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
                          <svg className="w-3.5 h-3.5 fill-[#ff0000] shrink-0" viewBox="0 0 24 24">
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
                        id="compact-modal-app-terms"
                        required
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-[#14231b] focus:ring-[#14231b] cursor-pointer"
                      />
                      <label htmlFor="compact-modal-app-terms" className="text-[11px] text-[#5b615e] font-light leading-snug cursor-pointer select-none">
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
      )}
    </div>
  );
}
