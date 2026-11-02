"use client";

import React from "react";
import Link from "next/link";
import { Phone, Truck, MapPin, Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="w-full min-h-screen bg-[#F4F1EA]">
      {/* 1. HERO SECTION (Deep Forest Green) */}
      <section className="relative w-full py-20 px-6 sm:px-12 bg-[#0d1e16] text-[#fbf8f2] text-center overflow-hidden">
        {/* Subtle ambient blur */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#1a382a]/30 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-3xl mx-auto space-y-4 z-10 relative">
          <h1 className="reveal font-benaiah text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#fbf8f2] tracking-tight">
            እኛ ማን ነን?
          </h1>
          <p className="reveal font-benaiah text-xs sm:text-sm text-[#cbd5cf] leading-relaxed max-w-xl mx-auto font-light">
            ጥበቡን ከትውልድ ወደ ትውልድ የምናስተላልፍበት የዓሚኤል በገና ታሪክ
          </p>
        </div>
      </section>

      {/* 2. MAIN STORY CARD (Elevated White Container) */}
      <section className="px-4 sm:px-8 max-w-4xl mx-auto -mt-10 sm:-mt-12 mb-24 relative z-20">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-14 border border-[#14231b]/5 text-[#14231b] space-y-12">
          {/* Section 1: ታሪካችን (The Story) */}
          <div className="reveal space-y-4 pb-8 border-b border-[#14231b]/10">
            <h2 className="font-benaiah text-2xl sm:text-3xl font-extrabold text-[#14231b]">
              ታሪካችን (The Story)
            </h2>
            <p className="font-benaiah text-sm sm:text-base text-[#243329] leading-relaxed">
              እኛ የብዙ ዓመታት ዕድሜ ያለውን የኢትዮጵያን የዜማ ጥበብ በ ዘመናዊው ማህበረሰብ ጋር እያዋደድን የምናቀርብ ባለሙያዎች ነን።
              ዓላማችንም ለባህላዊ መሣሪያዎችና ለእውነተኛው ቅርስ ፍቅር ላላቸው በሙሉ ጥራት ያላቸውን እውነተኛ ባህላዊ መሣሪያዎችና
              የባህል ቁሳቁስ በሙሉ በፍቅርና በቅንነት ማድረስ ነው።
            </p>
          </div>

          {/* Section 2: ጥራታችንና አሠራራችን (Our Quality & Craftsmanship) */}
          <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-8 items-center pb-8 border-b border-[#14231b]/10">
            <div className="space-y-4">
              <h2 className="font-benaiah text-2xl sm:text-3xl font-extrabold text-[#14231b]">
                ጥራታችንና አሠራራችን
              </h2>
              <p className="font-benaiah text-sm sm:text-base text-[#243329] leading-relaxed">
                እያንዳንዷ በገና፣ ክራርና መሰንቆ በጥንቃቄ በተመረጠ ዋና እንጨት በሰለጠኑ የእጅ ባለሙያዎች እጅ ተመርተው የወጡ ናቸው።
                ጥንታዊውን የባሕል ጥበብ (Authentic Craftsmanship) በመጠበቅ፣ ለእያንዳንዱ ደንበኛ ልዩ ዋጋ ያላቸውንና የማይበላሹ
                መሣሪያዎችን እናቀርባለን።
              </p>
            </div>

            {/* Workshop / Handcrafted Instruments Photo */}
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md border border-[#14231b]/10">
              <img
                src="/image/photo_2025-10-01_07-26-53.jpg"
                alt="Amiele Begena Craftsmanship Workshop"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Section 3: ራዕያችን (Our Vision) */}
          <div className="reveal space-y-4 pb-8 border-b border-[#14231b]/10">
            <h2 className="font-benaiah text-2xl sm:text-3xl font-extrabold text-[#14231b]">
              ዓላማችን (Our Vision)
            </h2>
            <p className="font-benaiah text-sm sm:text-base text-[#243329] leading-relaxed">
              የእኛ ትልቅ ራዕይ የባህል መሣሪያዎችን መሸጥ ብቻ ሳይሆን፣ ጥንታዊው ጥበብ ወደ ዘመናዊው ትውልድ እንዲተላለፍ ድልድይ መሆን ነው።
              እያንዳንዱ መሣሪያ የአገር ኩራትና የነፍስ መንፈሳዊ እርካታ መሆኑን እናምናለን።
            </p>
          </div>

          {/* Section 4: ደውሉልን (Our Contact) & Free Delivery Box */}
          <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-8 items-center pb-8 border-b border-[#14231b]/10">
            <div className="space-y-3">
              <h2 className="font-benaiah text-2xl sm:text-3xl font-extrabold text-[#14231b]">
                ደውሉልን (Our Contact)
              </h2>
              <div className="space-y-2 pt-2">
                <a
                  href="tel:0964261817"
                  className="flex items-center gap-3 text-sm font-bold text-[#14231b] hover:text-[#2d6a4f] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#14231b]/5 flex items-center justify-center text-[#e63946]">
                    <Phone className="w-4 h-4 fill-current" />
                  </div>
                  <span className="font-mono text-base">0964261817</span>
                </a>
                <a
                  href="tel:0969189470"
                  className="flex items-center gap-3 text-sm font-bold text-[#14231b] hover:text-[#2d6a4f] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#14231b]/5 flex items-center justify-center text-[#e63946]">
                    <Phone className="w-4 h-4 fill-current" />
                  </div>
                  <span className="font-mono text-base">0969189470</span>
                </a>
              </div>
            </div>

            {/* Free Delivery Card matching Screenshot 3 */}
            <div className="p-5 rounded-2xl border border-[#14231b]/10 bg-[#FAF8F5] space-y-2 shadow-sm">
              <span className="text-[10px] font-extrabold tracking-widest text-[#737874] uppercase block">
                EXCLUSIVES & SERVICES
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚚</span>
                <div>
                  <h4 className="font-bold text-sm text-[#14231b]">Free Delivery Everywhere</h4>
                  <p className="text-[11px] text-[#5b615e] font-benaiah">
                    በአዲስ አበባ እና በክልሎች ፈጣን ነጻ ማድረስ
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: አድራሻችን (Our Location) */}
          <div className="reveal space-y-4">
            <h2 className="font-benaiah text-2xl sm:text-3xl font-extrabold text-[#14231b]">
              አድራሻችን (Our Location)
            </h2>
            <div className="space-y-1 font-benaiah text-sm sm:text-base text-[#243329]">
              <p className="font-bold">ሜክሲኮ አደባባይ (Mexico Square)</p>
              <p className="text-[#5b615e]">አዲስ አበባ፣ ኢትዮጵያ (Addis Ababa, Ethiopia)</p>
            </div>

            <div className="p-4 rounded-xl bg-[#EDE8DE]/60 border border-[#14231b]/10 font-benaiah text-xs text-[#5b615e] leading-relaxed">
              ወደ አውደ ጥናታችን መጥተው መሣሪያዎቹን በዓይነ ሥጋ ማየትና መሞከር ይቻላል! You are welcome to visit our workshop to see and try the instruments in person!
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
