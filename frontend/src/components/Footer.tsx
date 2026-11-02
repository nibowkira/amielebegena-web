"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, Check, ArrowRight } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Fullscreen Portal views suppress the public storefront footer
  if (
    pathname?.startsWith("/affiliate/dashboard") ||
    pathname?.startsWith("/affiliate-dashboard") ||
    pathname === "/affiliate/portal" ||
    pathname?.startsWith("/admin")
  ) {
    return null;
  }

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail("");
      setSubscribed(false);
    }, 3000);
  };

  return (
    <footer className="w-full bg-[#0d1e16] text-[#fbf8f2] pt-12 pb-10 px-6 sm:px-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* 6-Column Layout matching the full-page screenshot */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 text-xs">
          {/* 1. Brand Col */}
          <div className="space-y-3 col-span-2 sm:col-span-1">
            <h3 className="font-benaiah text-2xl font-extrabold text-[#fbf8f2] tracking-wide">
              ዓሚኤል በገና
            </h3>
            <p className="text-[11px] text-[#fbf8f2]/70 leading-relaxed font-light">
              Preserving the soulful resonance and historical craftsmanship of traditional Ethiopian instruments through a meticulously curated archive.
            </p>
          </div>

          {/* 2. Discovery */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-widest text-[#fbf8f2]/50 uppercase">
              DISCOVERY
            </h4>
            <ul className="space-y-2 font-medium">
              <li><Link href="/" className="text-[#fbf8f2]/80 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/products" className="text-[#fbf8f2]/80 hover:text-white transition-colors">Products</Link></li>
              <li><Link href="/about" className="text-[#fbf8f2]/80 hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/blog" className="text-[#fbf8f2]/80 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="text-[#fbf8f2]/80 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* 3. Social */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-widest text-[#fbf8f2]/50 uppercase">
              SOCIAL
            </h4>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/amielebegena"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#12241b] border border-[#213b2c] flex items-center justify-center text-[#fbf8f2]/80 hover:text-white hover:border-[#52b788] transition-all"
                aria-label="Instagram"
              >
                <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@amielebegena"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#12241b] border border-[#213b2c] flex items-center justify-center text-[#fbf8f2]/80 hover:text-white hover:border-[#52b788] transition-all"
                aria-label="TikTok"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
              {/* YouTube */}
              <a
                href="https://www.youtube.com/@amielebegena"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#12241b] border border-[#213b2c] flex items-center justify-center text-[#fbf8f2]/80 hover:text-white hover:border-[#52b788] transition-all"
                aria-label="YouTube"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              {/* Telegram */}
              <a
                href="https://t.me/orttodooxtewahdoo"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#12241b] border border-[#213b2c] flex items-center justify-center text-[#fbf8f2]/80 hover:text-white hover:border-[#52b788] transition-all"
                aria-label="Telegram"
              >
                <Send className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 4. Partners & Services */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-widest text-[#fbf8f2]/50 uppercase">
              PARTNERS & SERVICES
            </h4>
            <ul className="space-y-2 font-medium">
              <li><Link href="/affiliate" className="text-[#fbf8f2]/80 hover:text-white transition-colors">Affiliate Program</Link></li>
              <li><Link href="/track-order" className="text-[#fbf8f2]/80 hover:text-white transition-colors">Track Order</Link></li>
              <li><Link href="/shipping" className="text-[#fbf8f2]/80 hover:text-white transition-colors">Shipping</Link></li>
              <li><Link href="/sustainability" className="text-[#fbf8f2]/80 hover:text-white transition-colors">Sustainability</Link></li>
              <li><Link href="/success-wall" className="text-[#fbf8f2]/80 hover:text-white transition-colors">Success Wall</Link></li>
            </ul>
          </div>

          {/* 5. Contact */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-widest text-[#fbf8f2]/50 uppercase">
              CONTACT
            </h4>
            <div className="space-y-1.5 font-medium text-xs">
              <p><a href="tel:0964261817" className="text-[#fbf8f2]/80 hover:text-[#52b788]">0964261817</a></p>
              <p><a href="tel:0969189470" className="text-[#fbf8f2]/80 hover:text-[#52b788]">0969189470</a></p>
              <p><a href="mailto:amielebegena@gmail.com" className="text-[#fbf8f2]/80 hover:text-[#52b788] break-all">amielebegena@gmail.com</a></p>
              <p className="text-[11px] text-[#fbf8f2]/50 pt-1 leading-snug">
                Mexico Square,<br />Addis Ababa, Ethiopia
              </p>
            </div>
          </div>

          {/* 6. The Registry */}
          <div className="space-y-3 col-span-2 sm:col-span-1">
            <h4 className="text-[11px] font-bold tracking-widest text-[#fbf8f2]/50 uppercase">
              THE REGISTRY
            </h4>
            <p className="text-[11px] text-[#fbf8f2]/70 font-light leading-relaxed">
              Subscribe for seasonal archive drops and cultural history studies.
            </p>
            <form onSubmit={handleSubscribe} className="relative flex items-center border-b border-[#fbf8f2]/30 pb-1.5 pt-1">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full bg-transparent text-[11px] text-white placeholder:text-[#fbf8f2]/40 focus:outline-none pr-12"
              />
              <button
                type="submit"
                className="absolute right-0 text-xs font-bold tracking-wider text-white hover:text-[#52b788] transition-colors cursor-pointer uppercase"
                aria-label="Subscribe"
              >
                {subscribed ? <Check className="w-3.5 h-3.5 text-[#52b788]" /> : "JOIN"}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#fbf8f2]/40 gap-4 font-light">
          <p>© 2026 AMIELEBEGENA. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6 font-medium">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">PRIVACY POLICY</Link>
            <Link href="/terms" className="hover:text-white transition-colors">TERMS OF ARCHIVE</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
