"use client";

import React from "react";
import Link from "next/link";
import { Trophy, History, ArrowRight } from "lucide-react";

export default function SuccessWallPage() {
  const topRankings = [
    { rank: "#1", name: "Dawit Yohannes", tier: "Silver Tier", tierColor: "bg-[#d4af37]/15 text-[#b8860b] border-[#d4af37]/30", impact: "12 Units Shared" },
    { rank: "#2", name: "Aster Kebede", tier: "Standard Tier", tierColor: "bg-[#52b788]/15 text-[#2d6a4f] border-[#52b788]/30", impact: "4 Units Shared" },
    { rank: "#3", name: "Tewodros Assefa", tier: "Standard Tier", tierColor: "bg-[#52b788]/15 text-[#2d6a4f] border-[#52b788]/30", impact: "3 Units Shared" },
  ];

  const milestones = [
    {
      emoji: "🌟",
      title: "Dawit Yohannes unlocked Craftsman Rank",
      desc: "Referred over 10 successful sales. 1 day ago.",
    },
    {
      emoji: "🌟",
      title: "Aster Kebede unlocked First Sale badge",
      desc: "Shared first authentic Begena sale to the USA. 4 days ago.",
    },
  ];

  return (
    <div className="w-full flex flex-col bg-[#FAF8F5] text-[#14231b]">
      {/* Hero */}
      <section className="relative w-full py-20 sm:py-24 px-6 sm:px-12 lg:px-20 bg-[#0d1e16] text-[#fbf8f2] text-center overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-4 relative z-10">
          <span className="text-[11px] font-bold tracking-widest text-[#f3be3b] uppercase">
            AMIELE PARTNERS HALL OF FAME
          </span>
          <h1 className="font-benaiah text-3xl sm:text-5xl font-extrabold text-[#fbf8f2]">
            The Success Wall
          </h1>
          <p className="text-xs sm:text-sm text-[#cedad3] max-w-xl mx-auto font-light leading-relaxed">
            Celebrating the incredible individuals spreading the music of Ethiopia to audiences worldwide. Our top-performing cultural ambassadors.
          </p>
        </div>
      </section>

      {/* Hall of Fame Grid */}
      <section className="w-full py-16 px-6 sm:px-12 lg:px-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Ambassador of the Month */}
          <div className="lg:col-span-5 rounded-3xl bg-white border border-[#14231b]/10 p-8 shadow-sm space-y-6 text-center">
            <span className="text-[11px] font-bold tracking-widest text-[#b8860b] uppercase">
              AMBASSADOR OF THE MONTH
            </span>
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-[#f3be3b] text-[#14231b] font-benaiah font-black text-4xl flex items-center justify-center border-4 border-[#14231b] shadow-md">
                D
              </div>
            </div>
            <div>
              <h2 className="font-benaiah text-2xl font-extrabold text-[#14231b]">Dawit Yohannes</h2>
              <p className="text-xs font-bold text-[#737874] uppercase tracking-wider mt-1">
                Traditional Music Teacher (Silver Tier)
              </p>
            </div>
            <p className="text-xs sm:text-sm text-[#5b615e] font-light italic leading-relaxed">
              &quot;Our heritage lives in strings. Teaching the Krar and Begena is a spiritual path for me. Amiele has empowered my community by providing direct access to authentic instruments while rewarding ambassadors for their dedication.&quot;
            </p>
            <div className="pt-4 border-t border-[#14231b]/10 flex justify-around">
              <div>
                <div className="font-bold text-2xl text-[#14231b]">12</div>
                <span className="text-[10px] text-[#737874] uppercase font-bold tracking-wider">Sales Referred</span>
              </div>
              <div className="w-[1px] bg-[#14231b]/10" />
              <div>
                <div className="font-bold text-2xl text-[#14231b]">1,420</div>
                <span className="text-[10px] text-[#737874] uppercase font-bold tracking-wider">Traffic Clicks</span>
              </div>
            </div>
          </div>

          {/* Right: Leaderboard & Milestones */}
          <div className="lg:col-span-7 rounded-3xl bg-white border border-[#14231b]/10 p-8 shadow-sm space-y-8">
            {/* Top Rankings Table */}
            <div>
              <h2 className="font-benaiah text-xl font-bold text-[#14231b] flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-[#f3be3b]" />
                <span>Top Ambassador Rankings</span>
              </h2>

              <div className="rounded-2xl border border-[#14231b]/10 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAF8F5] text-[#737874] uppercase tracking-wider font-bold border-b border-[#14231b]/10 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Ambassador</th>
                      <th className="py-3 px-4">Milestone Tier</th>
                      <th className="py-3 px-4 text-right">Contribution Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#14231b]/8">
                    {topRankings.map((r) => (
                      <tr key={r.rank} className="hover:bg-[#FAF8F5]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#14231b]">{r.rank}</td>
                        <td className="py-3 px-4 font-bold text-[#14231b]">{r.name}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${r.tierColor}`}>
                            {r.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#5b615e]">{r.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Milestones */}
            <div>
              <h2 className="font-benaiah text-xl font-bold text-[#14231b] flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-[#f3be3b]" />
                <span>Recent Ambassador Milestones</span>
              </h2>

              <div className="space-y-3">
                {milestones.map((m, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#14231b]/8 flex items-center gap-3">
                    <span className="text-2xl">{m.emoji}</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#14231b]">{m.title}</h4>
                      <p className="text-[11px] text-[#737874]">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/affiliate"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#14231b] hover:text-[#2d6a4f] transition-colors"
              >
                <span>Learn about the Affiliate Program</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
