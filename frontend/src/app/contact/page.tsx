"use client";

import React, { useState } from "react";
import { Phone, Mail, MapPin, MessageSquare, CheckCircle2, ArrowRight } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="w-full min-h-screen py-16 px-4 sm:px-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#fbf8f2]">
          Connect with Our Addis Ababa Workshop
        </h1>
        <p className="text-sm sm:text-base text-[#fbf8f2]/90 leading-relaxed font-normal max-w-lg mx-auto">
          Inquire about custom instrument commissions, workshop visits, or direct bulk shipping inquiries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Contact Info */}
        <div className="md:col-span-5 space-y-6">
          <div className="rounded-3xl border border-[#d4af37]/25 bg-[#0f1a14] p-6 space-y-6">
            <h3 className="font-serif text-xl font-bold text-[#f3e5ab]">Workshop & Concierge</h3>

            <div className="space-y-4 text-xs text-[#fbf8f2]/80">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Addis Ababa Workshop</strong>
                  <span>Bole Sub-City, Addis Ababa, Ethiopia</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Verified WhatsApp Concierge</strong>
                  <a
                    href="https://wa.me/251969189470"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#52b788] hover:underline"
                  >
                    +251 969 189 470
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Official Inquiries</strong>
                  <span>contact@amielebegena.com</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#d4af37]/15">
              <a
                href="https://wa.me/251969189470"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Start Direct WhatsApp Chat</span>
              </a>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="md:col-span-7">
          <div className="rounded-3xl border border-[#d4af37]/25 bg-[#0f1a14]/90 p-6 sm:p-8 shadow-xl">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-[#52b788] mx-auto" />
                <h3 className="font-serif text-2xl font-bold text-[#fbf8f2]">Message Received</h3>
                <p className="text-xs text-[#fbf8f2]/70 max-w-sm mx-auto">
                  Our workshop concierge will respond within 24 hours via email or WhatsApp.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[#fbf8f2]/80">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Dawit Haile"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#d4af37]/35 bg-[#080b09] text-sm text-white placeholder-white/65 focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[#fbf8f2]/90">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="dawit@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#d4af37]/35 bg-[#080b09] text-sm text-white placeholder-white/65 focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#fbf8f2]/90">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Custom 10-String Begena Commission"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d4af37]/35 bg-[#080b09] text-sm text-white placeholder-white/65 focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-[#fbf8f2]/90">Message *</label>
                  <textarea
                    rows={4}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Inquire about custom tuning, shipping quotes, or heritage questions..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d4af37]/35 bg-[#080b09] text-sm text-white placeholder-white/65 focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl gold-gradient-bg text-[#080b09] font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Send Message to Workshop</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
