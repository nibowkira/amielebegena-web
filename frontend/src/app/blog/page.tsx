"use client";

import React from "react";
import Link from "next/link";
import { blogPosts } from "../../data/blogPosts";
import { Calendar, ArrowRight } from "lucide-react";

export default function BlogIndexPage() {
  return (
    <div className="w-full min-h-screen bg-[#F4F1EA] flex flex-col justify-between">
      <div>
        {/* 1. HERO BANNER (Deep Forest Green with Gold Heading matching Screenshot 4) */}
        <section className="relative w-full py-20 px-6 sm:px-12 bg-[#0d1e16] text-[#fbf8f2] text-center overflow-hidden">
          <div className="max-w-4xl mx-auto space-y-4 z-10 relative">
            <h1 className="reveal font-benaiah text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#f5d77f] tracking-tight leading-tight">
              Ethiopian Heritage &amp; Instrument Knowledge Center
            </h1>
            <p className="reveal font-benaiah text-xs sm:text-sm text-[#cbd5cf] leading-relaxed max-w-2xl mx-auto font-light">
              Explore expert guides, historical accounts, and artisan insights on the sacred Begena, Kirar, and traditional music of Ethiopia.
            </p>
          </div>
        </section>

        {/* 2. ARTICLES GRID (Warm Cream Background with Pure White Cards) */}
        <section className="py-16 px-4 sm:px-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {blogPosts.map((post, idx) => (
              <article
                key={post.slug}
                className="reveal bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-[#14231b]/5 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1"
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                {/* Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EDE8DE]">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Category Tag */}
                    <div className="inline-block px-3 py-1 rounded-full border border-[#d4af37]/40 bg-[#fef9ee] text-[10px] font-extrabold text-[#b8860b] uppercase tracking-wider">
                      {post.category}
                    </div>

                    {/* Title in Benaiah Font */}
                    <h2 className="font-benaiah text-lg sm:text-xl font-bold text-[#14231b] group-hover:text-[#2d6a4f] transition-colors leading-snug">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>

                    {/* Excerpt */}
                    <p className="text-xs text-[#5b615e] line-clamp-3 leading-relaxed font-light">
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Card Bottom: Date and Read Article Link */}
                  <div className="pt-4 border-t border-[#14231b]/10 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#737874] font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#737874]" />
                      <span>{post.date}</span>
                    </span>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="font-benaiah font-bold text-xs text-[#14231b] group-hover:text-[#2d6a4f] inline-flex items-center gap-1 transition-colors min-h-[44px]"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* 3. BLOG FOOTER BANNER matching Screenshot 4 */}
      <footer className="w-full bg-[#0b1a13] text-[#fbf8f2] py-8 px-6 text-center text-xs space-y-2 border-t border-[#14231b]">
        <p className="text-[#a3b8ad] font-light">
          © 2026 Amiele Begena. All rights reserved. Preserving ancient Ethiopian musical heritage.
        </p>
        <div className="flex items-center justify-center gap-3 text-[#f5d77f] font-bold text-xs">
          <Link href="/products" className="hover:underline">Browse Instruments</Link>
          <span>|</span>
          <Link href="/blog" className="hover:underline">Knowledge Center</Link>
          <span>|</span>
          <Link href="/affiliate" className="hover:underline">Affiliate Program</Link>
        </div>
      </footer>
    </div>
  );
}
