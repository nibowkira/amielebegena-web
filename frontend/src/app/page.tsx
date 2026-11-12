"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { fetchProducts } from "../lib/api";
import { Product } from "../lib/types";

export default function HomePage() {
  const { openDirectOrder } = useCart();
  const { formatPrice, currency } = useCurrency();

  // Testimonials matching the exact screenshot
  const testimonials = [
    {
      stars: 5,
      initial: "Y",
      amharicText: "ከበሮው በጣም ጥሩ ነው። ድምፁ ትክክለኛ እና ጠንካራ ነው።",
      englishText:
        '"The Kebero I received was beautifully crafted with genuine hide. Perfect for our cultural celebrations. I will definitely order again from Amiele Begena!"',
      author: "ዮናስ ታደሰ (Yonas Tadesse)",
      role: "ከበሮ (Kebero)",
    },
    {
      stars: 5,
      initial: "D",
      amharicText: "በገናው በጣም ጥራት ያለውና ድምጹ ልዩ ነው። ለቤተ ክርስቲያናችን ትልቅ በረከት ሆኗል። እግዚአብሔር ይባርካቸው!",
      englishText:
        '"The Begena has exceptional quality and a unique sound. It has been a great blessing for our church. God bless them!"',
      author: "ዳዊት ተክለ ወልድ (Dawit Tekle)",
      role: "በገና (Begena)",
    },
    {
      stars: 5,
      initial: "S",
      amharicText: "ክራሩን ስገዛ ትክክለኛ ምርጫ ማድረጌን ተረድቻለሁ። ድምጹ ንጹሕና ለስላሳ ነው፣ ማድረስም ነጻ ነበር!",
      englishText:
        '"I knew I made the right choice when I got the Krar. The sound is pure and smooth — and delivery was free!"',
      author: "ሰላማዊት አበበ (Selamawit Abebe)",
      role: "ክራር (Krar)",
    },
    {
      stars: 5,
      initial: "D",
      amharicText: "መሰንቆውን ለትምህርት ቤት ፕሮግራም ገዛሁ። ልጆቹ ባሕላቸውን እንዲማሩ ትልቅ እገዛ ሆኗል። አመሰግናለሁ!",
      englishText:
        '"Bought the Masinko for a school program. It has been a great help for kids to learn their culture. Thank you!"',
      author: "ዳንኤል ገብረ ማሪያም (Daniel Gebre)",
      role: "ማሲንቆ (Masinko)",
    },
    {
      stars: 5,
      initial: "H",
      amharicText: "ለልጄ ባህላዊ ሙዚቃ እንዲማር ክራር አዝዤለት ነበር። ጥራቱ እጅግ በጣም ጥሩ ነው - ገመዶቹ ለስላሳ ናቸው ድምጹም ጥልቅ እና እውነተኛ።",
      englishText:
        '"I ordered a Krar for my son. The quality is exceptional — the strings are smooth and the sound is rich and authentic. Highly recommend!"',
      author: "ዳዊት ኃይሌ (Dawit Haile)",
      role: "ክራር (Krar)",
    },
  ];

  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // Mobile touch swipe handling
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const minSwipeDistance = 45;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > minSwipeDistance) {
      nextTestimonial();
    } else if (distance < -minSwipeDistance) {
      prevTestimonial();
    }
  };



  // Review submission state
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewInstrument, setReviewInstrument] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewMessage.trim()) return;
    const starEmoji = "★".repeat(reviewRating) + "☆".repeat(5 - reviewRating);
    const text = `⭐ New Review from Amiele Begena Website!\n\nName: ${reviewName}\nInstrument: ${reviewInstrument || "Not specified"}\nRating: [${starEmoji}]\n\nReview: ${reviewMessage}`;
    const whatsappUrl = `https://wa.me/251969189470?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  const prevTestimonial = () => {
    setTestimonialIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const nextTestimonial = () => {
    setTestimonialIndex((prev) => (prev >= testimonials.length - 1 ? 0 : prev + 1));
  };



  const [liveProducts, setLiveProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts().then((data) => {
      if (data && data.length > 0) {
        setLiveProducts(data);
      }
    }).catch((e) => console.warn("Failed to fetch home products:", e));
  }, []);

  // Products matching exact Screenshot 4, backed by real Supabase products
  const defaultFavoriteProducts = [
    {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "በገና (Begena)",
      slug: "begena",
      category: "strings",
      subtitle: "Ten-Stringed Harp of David",
      priceETB: 8500,
      priceUSD: 85,
      image: "/image/photo_2025-10-01_07-26-53.jpg",
    },
    {
      id: "a0000000-0000-0000-0000-000000000002",
      name: "ክራር (Kirar)",
      slug: "kirar",
      category: "strings",
      subtitle: "Traditional 6-String Lyre",
      priceETB: 8500,
      priceUSD: 85,
      image: "/image/photo_2025-02-27_17-33-38.jpg",
    },
    {
      id: "a0000000-0000-0000-0000-000000000003",
      name: "Mesenko — Wood",
      slug: "mesenko-wood",
      category: "strings",
      subtitle: "One-Stringed Fiddle & Bow",
      priceETB: 4500,
      priceUSD: 45,
      image: "/image/photo_2025-02-24_22-03-09.jpg",
    },
  ];

  const favoriteProducts = defaultFavoriteProducts.map((def) => {
    const live = liveProducts.find((p) => p.slug === def.slug || p.id === def.id);
    if (!live) return def;
    const cover = live.images?.find((img) => img.isCover)?.storagePath || live.images?.[0]?.storagePath || def.image;
    const priceNum = typeof live.price === "string" ? parseFloat(live.price) : Number(live.price);
    return {
      id: live.id,
      name: live.name,
      slug: live.slug,
      category: live.category,
      subtitle: live.shortDescription || def.subtitle,
      priceETB: def.priceETB,
      priceUSD: !isNaN(priceNum) && priceNum > 0 ? priceNum : def.priceUSD,
      image: cover,
      _realProduct: live,
    };
  });

  const handleOrderWhatsApp = (product: (typeof favoriteProducts)[0]) => {
    const targetProduct: Product = (product as any)._realProduct || {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: product.priceUSD,
      currency: "USD",
      stock: 50,
      featured: true,
      status: "active",
      images: [{ id: "cover", productId: product.id, storagePath: product.image, isCover: true, sortOrder: 0 }],
    };
    openDirectOrder(targetProduct);
  };

  // Visible testimonials (3 cards in view)
  const visibleTestimonials = [
    testimonials[testimonialIndex % testimonials.length],
    testimonials[(testimonialIndex + 1) % testimonials.length],
    testimonials[(testimonialIndex + 2) % testimonials.length],
  ];

  const renderTestimonialCard = (item: (typeof testimonials)[0], key?: string | number) => (
    <div
      key={key}
      className="h-full rounded-2xl sm:rounded-3xl bg-[#13271d]/90 border border-white/5 px-8 py-7 sm:p-8 space-y-5 shadow-xl text-left flex flex-col justify-between transition-all duration-300 hover:border-[#2d6a4f]"
    >
      <div className="space-y-4">
        {/* Quotation Marks Icon matching Screenshot */}
        <div className="text-[#3b5e4c] flex items-center text-3xl font-serif select-none">
          <span>““</span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1 text-[#eab308] text-xs">
          {[...Array(5)].map((_, s) => (
            <Star
              key={s}
              className={`w-3.5 h-3.5 ${
                s < Math.floor(item.stars)
                  ? "fill-current"
                  : item.stars % 1 !== 0 && s === Math.floor(item.stars)
                  ? "fill-current opacity-70"
                  : "text-white/20"
              }`}
            />
          ))}
        </div>

        {/* Amharic Text */}
        <p className="font-benaiah font-bold text-sm sm:text-[15px] text-[#fbf8f2] leading-relaxed">
          {item.amharicText}
        </p>

        {/* English Text */}
        <p className="text-xs text-[#cedad3]/85 italic leading-relaxed font-light">
          {item.englishText}
        </p>
      </div>

      {/* Author line with circular gold avatar badge matching Screenshot */}
      <div className="pt-4 border-t border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#d4af37] text-[#0d1e16] font-bold text-xs flex items-center justify-center shrink-0 shadow">
          {item.initial}
        </div>
        <div className="flex flex-col text-left">
          <strong className="font-benaiah text-xs sm:text-sm font-bold text-white">
            {item.author}
          </strong>
          <span className="text-[11px] text-[#52b788] font-medium">
            {item.role}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION (Deep Forest Green with Subtle Watermark) */}
      <section className="relative w-full min-h-[82vh] flex items-center px-6 sm:px-12 lg:px-20 py-20 bg-[#0d1e16] overflow-hidden">
        {/* Subtle authentic instrument background watermark */}
        <div
          className="absolute inset-0 opacity-[0.06] bg-center bg-cover pointer-events-none"
          style={{ backgroundImage: "url('/image/photo_2025-10-01_07-26-53.jpg')" }}
        />
        {/* Ambient lighting blur */}
        <div className="absolute top-10 right-10 w-[450px] h-[450px] bg-[#1a382a]/40 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-[#234b38]/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto w-full z-10 space-y-6 text-left">
          {/* Top Subtitle Tag */}
          <div className="reveal">
            <span className="text-sm sm:text-[15px] font-bold tracking-widest text-[#d4af37] uppercase font-benaiah">
              ከሺህ ዓመታት ጥበብ የተቀዳ የዛሬው ብርሃን
            </span>
          </div>

          {/* Main Headline in Benaiah Font */}
          <h1 className="reveal font-benaiah text-3xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#fbf8f2] leading-[1.25] tracking-tight">
            ለጸሎት፣ ለምስጋናና ለንስሐ የሚሆኑ <br className="hidden sm:inline" />
            ጥራት ያላቸው በገናዎች፣ ክራሮችና <br className="hidden sm:inline" />
            መሰንቆዎችን ከእኛ ዘንድ ያገኛሉ ።
          </h1>

          {/* Body Description (Increased to 16-18px with high contrast) */}
          <p className="reveal font-benaiah text-base sm:text-lg text-[#f4f7f5] leading-relaxed max-w-2xl font-normal">
            እውነተኛ ባህላዊ የሙዚቃ መሣሪያዎች በእጅ የተዘጋጁ፤ ለጸሎትና ለዝማሬ የሚያገለግሉ የተመረጡ በገናዎች፣ ክራሮችና መሰንቆዎችን እንድናዘጋጅልዎ የእጅ ጥበብ ውጤት ናቸው።
            ጥራታቸው የተረጋገጠ እና ለረጅም ጊዜ የሚያገለግሉ፤ ጥንቃቄ የተሞላበት ማሸጊያ እና ፈጣን አገልግሎት።
          </p>

          {/* Call to Action Pill Button */}
          <div className="reveal pt-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full border border-[#345c47] bg-[#152e22]/90 hover:bg-[#1f4232] text-white font-benaiah text-sm font-bold tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all group"
            >
              <span>መሣሪያዎቹን ይመልከቱ</span>
              <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. CUSTOMER FAVORITES SECTION (Warm Cream / Ivory Background - Screenshot 4) */}
      <section id="favorites" className="w-full py-24 px-6 sm:px-12 lg:px-20 bg-[#F4F1EA] text-[#14231b]">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-2 reveal">
            <span className="text-[11px] font-bold tracking-widest text-[#737874] uppercase">
              CULTURALLY HANDPICKED FAVORITES
            </span>
            <h2 className="font-benaiah text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#14231b]">
              ምንጊዜም ተመራጭ መሣሪያዎች
            </h2>
            <p className="text-xs sm:text-sm text-[#5b615e] italic max-w-xl mx-auto font-light leading-relaxed">
              The most loved instruments in our collection, curated based on depth of sound and artisan quality.
            </p>
          </div>

          {/* 3 Product Cards Grid matching Screenshot 4 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {favoriteProducts.map((p, idx) => (
              <div
                key={p.id}
                className="reveal rounded-3xl bg-white p-6 shadow-md hover:shadow-xl border border-[#14231b]/5 flex flex-col justify-between group transition-all duration-300"
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                {/* White Image Box */}
                <div className="relative aspect-square w-full rounded-2xl bg-[#faf9f6] p-4 flex items-center justify-center overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="pt-5 pb-2 text-center space-y-2 flex flex-col items-center">
                  {/* 5 Stars */}
                  <div className="flex items-center gap-1 text-[#eab308] text-sm">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="font-benaiah text-xl sm:text-2xl font-extrabold text-[#14231b] group-hover:text-[#2d6a4f] transition-colors">
                    {p.name}
                  </h3>

                  {/* Subtitle */}
                  <p className="text-xs text-[#5b615e] font-light">{p.subtitle}</p>

                  {/* Price in ETB / USD */}
                  <p className="font-bold text-base text-[#14231b] pt-1 tracking-tight">
                    {currency === "ETB"
                      ? `ETB ${p.priceETB.toLocaleString()}`
                      : formatPrice(p.priceUSD, "USD")}
                  </p>

                  {/* Action Button: Refined Luxury Emerald Order via WhatsApp */}
                  <div className="w-full pt-3">
                    <button
                      onClick={() => handleOrderWhatsApp(p)}
                      className="w-full py-2.5 sm:py-3 px-5 rounded-full bg-gradient-to-r from-[#1eb656] via-[#22c55e] to-[#25D366] hover:from-[#18a84e] hover:via-[#1eb656] hover:to-[#22c35e] text-white font-bold text-xs sm:text-[13px] tracking-wide flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(37,211,102,0.32)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.42)] hover:scale-[1.01] active:scale-95 transition-all cursor-pointer border border-white/25 min-h-[44px]"
                    >
                      {/* WhatsApp Icon with translucent circular badge */}
                      <span className="w-5.5 h-5.5 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-2xs">
                        <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 6.84C8.95 6.84 8.7 6.9 8.5 7.12C8.28 7.34 7.69 7.9 7.69 9.03C7.69 10.17 8.52 11.27 8.64 11.43C8.75 11.59 10.27 13.93 12.61 14.93C14.55 15.77 14.95 15.6 15.38 15.56C15.81 15.52 16.78 15 16.98 14.41C17.18 13.82 17.18 13.33 17.12 13.22C17.06 13.11 16.9 13.06 16.66 12.94C16.41 12.82 15.2 12.23 14.97 12.15C14.75 12.07 14.59 12.03 14.43 12.27C14.26 12.51 13.8 13.06 13.66 13.22C13.52 13.38 13.38 13.4 13.13 13.28C12.89 13.16 12.11 12.9 11.18 12.07C10.46 11.43 9.97 10.63 9.83 10.39C9.69 10.15 9.82 10.02 9.94 9.9C10.05 9.79 10.19 9.61 10.31 9.47C10.43 9.33 10.47 9.23 10.55 9.07C10.63 8.91 10.59 8.77 10.53 8.65C10.47 8.53 9.99 7.35 9.79 6.88C9.6 6.42 9.4 6.48 9.25 6.47C9.11 6.46 8.95 6.46 8.79 6.46L9.11 6.84Z" />
                        </svg>
                      </span>
                      <span>Order via WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TESTIMONIALS SECTION (Deep Dark Green - Matching Full Screenshot) */}
      <section id="reviews" className="w-full pt-20 pb-24 px-4 sm:px-10 lg:px-16 bg-[#0d1e16] text-[#fbf8f2]">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header matching Screenshot */}
          <div className="text-center space-y-2 reveal active">
            <span className="text-[11px] font-bold tracking-widest text-[#52b788] uppercase">
              WHAT OUR CUSTOMERS SAY
            </span>
            <h2 className="font-benaiah text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#fbf8f2]">
              ደንበኞቻችን ምን ይላሉ?
            </h2>
            <p className="text-xs sm:text-sm text-[#a2b5ab] font-light max-w-xl mx-auto">
              Trusted by musicians, churches, and cultural institutions across Ethiopia.
            </p>
          </div>

          {/* ================================================================
              MOBILE CAROUSEL (< md): ONE REVIEW AT A TIME WITH SMOOTH SLIDE & SWIPE
          ================================================================ */}
          <div className="md:hidden space-y-4">
            {/* Relative Viewport with Side Gutters so Centered Buttons Never Touch or Overlay the Card */}
            <div className="relative px-10 min-[380px]:px-12">
              {/* Viewport for Single-Card Track */}
              <div
                className="w-full overflow-hidden touch-pan-y"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <div
                  className="flex transition-transform duration-500 ease-out will-change-transform"
                  style={{ transform: `translateX(-${testimonialIndex * 100}%)` }}
                >
                  {testimonials.map((item, idx) => (
                    <div
                      key={idx}
                      className="w-full shrink-0 px-1 py-1"
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`Review ${idx + 1} of ${testimonials.length}`}
                    >
                      {renderTestimonialCard(item, idx)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertically Centered Scroll Buttons Outside the Card in the Side Gutters */}
              {/* Previous Button (Far Left Gutter) */}
              <button
                type="button"
                onClick={prevTestimonial}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 min-[380px]:w-10 min-[380px]:h-10 rounded-full bg-[#13271d]/90 backdrop-blur-md border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] hover:border-[#d4af37] hover:bg-[#1a3325] active:scale-90 transition-all cursor-pointer shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                aria-label="Previous review"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Next Button (Far Right Gutter) */}
              <button
                type="button"
                onClick={nextTestimonial}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 min-[380px]:w-10 min-[380px]:h-10 rounded-full bg-[#13271d]/90 backdrop-blur-md border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] hover:border-[#d4af37] hover:bg-[#1a3325] active:scale-90 transition-all cursor-pointer shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                aria-label="Next review"
              >
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Mobile Dots at the Bottom */}
            <div className="flex justify-center pt-1.5">
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Review pagination">
                {testimonials.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    role="tab"
                    aria-selected={testimonialIndex === dotIdx}
                    onClick={() => setTestimonialIndex(dotIdx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      testimonialIndex === dotIdx
                        ? "bg-[#d4af37] w-6"
                        : "bg-[#213b2c] w-2 hover:bg-[#52b788]"
                    }`}
                    aria-label={`Go to review ${dotIdx + 1} of ${testimonials.length}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ================================================================
              DESKTOP CAROUSEL (md: and above): 3 CARDS SIDE BY SIDE
          ================================================================ */}
          <div className="hidden md:block space-y-6">
            <div className="relative flex items-center justify-between gap-4 lg:gap-6">
              {/* Left Chevron Button */}
              <button
                type="button"
                onClick={prevTestimonial}
                className="w-11 h-11 rounded-full bg-[#13271d] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] hover:border-[#d4af37] hover:bg-[#1a3325] active:scale-95 transition-all cursor-pointer shrink-0 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* 3 Testimonials Side by Side */}
              <div className="grid grid-cols-3 gap-6 w-full">
                {visibleTestimonials.map((item, i) => (
                  <div
                    key={`${testimonialIndex}-${i}`}
                    className="animate-in fade-in duration-300 h-full"
                  >
                    {renderTestimonialCard(item, `${testimonialIndex}-${i}`)}
                  </div>
                ))}
              </div>

              {/* Right Chevron Button */}
              <button
                type="button"
                onClick={nextTestimonial}
                className="w-11 h-11 rounded-full bg-[#13271d] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] hover:border-[#d4af37] hover:bg-[#1a3325] active:scale-95 transition-all cursor-pointer shrink-0 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Desktop Dots Indicator */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {testimonials.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setTestimonialIndex(dotIdx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    testimonialIndex === dotIdx
                      ? "bg-[#d4af37] w-6"
                      : "bg-[#213b2c] w-2 hover:bg-[#52b788]"
                  }`}
                  aria-label={`Go to slide ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. CUSTOMER REVIEW SUBMISSION FORM (Parchment Card with Rounded Bottom - Screenshot 1 & 2) */}
      <section id="leave-review" className="w-full pb-20 px-4 sm:px-8 bg-[#0d1e16] text-[#14231b]">
        <div className="max-w-4xl mx-auto rounded-[32px] sm:rounded-[44px] bg-[#FBF9F5] p-8 sm:p-14 shadow-2xl space-y-8 reveal border border-[#14231b]/5">
          {/* Card Title & Subtitle */}
          <div className="text-center space-y-2">
            <h2 className="font-benaiah text-2xl sm:text-3xl font-extrabold text-[#14231b]">
              Share Your Experience / ልምድዎን ያጋሩ
            </h2>
            <p className="text-xs sm:text-sm text-[#5b615e] font-light max-w-lg mx-auto">
              Your feedback helps us preserve Ethiopian musical heritage. Submit via WhatsApp.
            </p>
          </div>

          {/* 2-Column Form matching Screenshot 1 & 2 */}
          <form onSubmit={handleReviewSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Left Column: Full Name & Instrument */}
              <div className="space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14231b] block uppercase tracking-wider font-benaiah">
                    FULL NAME / ሙሉ ስም *
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 rounded-xl border border-[#14231b]/15 bg-white text-xs sm:text-sm text-[#14231b] placeholder:text-[#14231b]/35 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition-all"
                  />
                </div>

                {/* What instrument did you buy? */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14231b] block uppercase tracking-wider font-benaiah">
                    WHAT INSTRUMENT DID YOU BUY? / የትኛውን መሳሪያ ገዙ? *
                  </label>
                  <select
                    value={reviewInstrument}
                    onChange={(e) => setReviewInstrument(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#14231b]/15 bg-white text-xs sm:text-sm text-[#14231b] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] cursor-pointer transition-all"
                  >
                    <option value="">Select an instrument</option>
                    <option value="በገና (Begena)">በገና (Begena)</option>
                    <option value="ክራር (Kirar)">ክራር (Kirar)</option>
                    <option value="መሰንቆ (Mesenko)">መሰንቆ (Mesenko)</option>
                    <option value="ከበሮ (Kebero)">ከበሮ (Kebero)</option>
                    <option value="ዋሽንት (Washint)">ዋሽንት (Washint)</option>
                    <option value="ጸናጽል (Sanasel)">ጸናጽል (Sanasel)</option>
                    <option value="መለከት (Meleket)">መለከት (Meleket)</option>
                    <option value="Other">ሌላ (Other)</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Rating & Review message */}
              <div className="space-y-5">
                {/* Your Rating */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14231b] block uppercase tracking-wider font-benaiah">
                    YOUR RATING / የእርስዎ ደረጃ *
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setReviewHoverRating(star)}
                        onMouseLeave={() => setReviewHoverRating(0)}
                        className="text-2xl cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                      >
                        <span
                          className={`transition-colors ${
                            star <= (reviewHoverRating || reviewRating)
                              ? "text-[#eab308]"
                              : "text-[#dcd8ce]"
                          }`}
                        >
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Your Review */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14231b] block uppercase tracking-wider font-benaiah">
                    YOUR REVIEW / የእርስዎ አስተያየት *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reviewMessage}
                    onChange={(e) => setReviewMessage(e.target.value)}
                    placeholder="Tell us about your experience..."
                    className="w-full px-4 py-3 rounded-xl border border-[#14231b]/15 bg-white text-xs sm:text-sm text-[#14231b] placeholder:text-[#14231b]/35 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] resize-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Dark Pill Submit Button matching Screenshot 1 */}
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                className="w-full sm:w-auto min-w-[280px] sm:min-w-[340px] py-4 px-10 rounded-full bg-[#14231b] hover:bg-[#1a3325] text-white font-benaiah font-bold text-sm tracking-wide shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>Send Review</span>
                {/* Green WhatsApp Icon inside button */}
                <svg
                  className="w-4 h-4 fill-[#25D366]"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 6.84C8.95 6.84 8.7 6.9 8.5 7.12C8.28 7.34 7.69 7.9 7.69 9.03C7.69 10.17 8.52 11.27 8.64 11.43C8.75 11.59 10.27 13.93 12.61 14.93C14.55 15.77 14.95 15.6 15.38 15.56C15.81 15.52 16.78 15 16.98 14.41C17.18 13.82 17.18 13.33 17.12 13.22C17.06 13.11 16.9 13.06 16.66 12.94C16.41 12.82 15.2 12.23 14.97 12.15C14.75 12.07 14.59 12.03 14.43 12.27C14.26 12.51 13.8 13.06 13.66 13.22C13.52 13.38 13.38 13.4 13.13 13.28C12.89 13.16 12.11 12.9 11.18 12.07C10.46 11.43 9.97 10.63 9.83 10.39C9.69 10.15 9.82 10.02 9.94 9.9C10.05 9.79 10.19 9.61 10.31 9.47C10.43 9.33 10.47 9.23 10.55 9.07C10.63 8.91 10.59 8.77 10.53 8.65C10.47 8.53 9.99 7.35 9.79 6.88C9.6 6.42 9.4 6.48 9.25 6.47C9.11 6.46 8.95 6.46 8.79 6.46L9.11 6.84Z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
