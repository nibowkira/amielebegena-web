"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const STATIC_FAQS: FAQItem[] = [
  {
    question: "How is each traditional instrument tuned and acoustically voiced?",
    answer:
      "Every Amiele Begena and traditional instrument is individually voiced by master musicians in our Addis Ababa atelier. Using authentic modal tuning pegs (chire) and horn or wood bridges, instruments are tuned to the four traditional Ethiopian modal scales: Tizita, Bati, Ambassel, and Anchihoye, ensuring deep harmonic resonance.",
  },
  {
    question: "What woods and traditional hides are chosen for construction?",
    answer:
      "We strictly source ethically harvested highland woods, primarily Cordia africana (Wanza) for its resonant acoustic warmth and lightweight strength, alongside seasoned Juniperus procera (Tid). Soundboards are stretched with hand-scraped, naturally sun-cured ox or goat parchment, treated with traditional organic oils.",
  },
  {
    question: "How should I care for the parchment soundboard and gut strings in varying climates?",
    answer:
      "Keep the instrument away from direct heating vents, extreme air conditioning, or humid basements. In dry climates, the parchment soundboard retains tension naturally, while in high humidity it relaxes. We supply natural beeswax to condition the wood seams and advise slackening strings slightly if stored unplayed for extended periods.",
  },
  {
    question: "How do you protect and pack instruments for safe international shipping?",
    answer:
      "All export instruments are padded with high-density shock-absorbing foam, secured with bridge protectors to prevent parchment puncture, and housed in reinforced cultural flight cases or double-walled corrugated shipping crates. We handle international customs certification and provide full door-to-door tracking via DHL Express.",
  },
  {
    question: "Can I request custom carvings, string configurations, or left-handed orientation?",
    answer:
      "Yes. Our master woodcarvers can incorporate custom Orthodox cross motifs, traditional Ge'ez geometric engravings, dedication plaques, or reversed string layouts for left-handed instrumentalists. Contact our atelier directly via WhatsApp or inquiry form to arrange bespoke commissions.",
  },
];

export default function CraftsmanshipFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-3">
      {STATIC_FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className="border border-[#E7E3D8] rounded-2xl bg-white/90 overflow-hidden transition-all duration-200 shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="w-full p-3.5 min-[360px]:p-4 sm:p-5 text-left flex items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:bg-[#FAF8F5]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] min-h-[48px]"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${idx}`}
            >
              <span className="font-benaiah text-sm sm:text-base md:text-lg text-[#14231b] font-bold leading-snug">
                {faq.question}
              </span>
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#E7E3D8] flex items-center justify-center shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 bg-[#14231b] text-[#FAF8F5] border-[#14231b]" : "text-[#737874] bg-[#FAF8F5]"
                }`}
              >
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </button>

            {isOpen && (
              <div
                id={`faq-answer-${idx}`}
                role="region"
                aria-label={faq.question}
                className="px-3.5 pb-4 pt-1 sm:px-5 sm:pb-5 text-xs sm:text-sm text-[#5b615e] leading-relaxed border-t border-[#E7E3D8]/60 animate-in fade-in duration-200"
              >
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

