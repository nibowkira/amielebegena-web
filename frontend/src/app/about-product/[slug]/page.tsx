import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { ProductImage, ProductCraftsmanshipDetails } from "../../../lib/types";
import CraftsmanshipFAQ from "../../../components/about-product/CraftsmanshipFAQ";
import ProductAudioSample from "../../../components/about-product/ProductAudioSample";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safeImageUrl(path?: string | null): string {
  if (!path) return "/image/photo_2025-10-01_07-26-53.jpg";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
    return path;
  }
  return `/${path}`;
}

// ---------------------------------------------------------------------------
// Dynamic Metadata Generator
// ---------------------------------------------------------------------------
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data: product } = await supabase
      .from("products")
      .select("name, short_description, description, meta_title, meta_description, product_images(*)")
      .eq("slug", slug)
      .is("deleted_at", null)
      .eq("status", "active")
      .single();

    if (!product) {
      return {
        title: "Product Not Found | Amiele Begena",
        description: "The requested instrument craftsmanship page could not be located.",
      };
    }

    const title =
      product.meta_title ||
      `${product.name} — Sacred Heritage & Craftsmanship | Amiele Begena`;
    const description =
      product.meta_description ||
      product.short_description ||
      product.description ||
      `Discover the sacred craftsmanship, traditional highland materials, and artisan heritage of the ${product.name}.`;

    const coverImg =
      product.product_images?.find((img: any) => img.is_cover)?.storage_path ||
      product.product_images?.[0]?.storage_path ||
      "/image/photo_2025-10-01_07-26-53.jpg";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: safeImageUrl(coverImg), width: 1200, height: 630, alt: product.name }],
        siteName: "Amiele Begena",
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [safeImageUrl(coverImg)],
      },
    };
  } catch (e) {
    return {
      title: "About Product | Amiele Begena",
      description: "Sacred acoustic craftsmanship and cultural heritage of Ethiopian traditional instruments.",
    };
  }
}

// ---------------------------------------------------------------------------
// Page Component (Server Component)
// ---------------------------------------------------------------------------
export default async function AboutProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Fetch current product
  const { data: rawProduct } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("slug", slug)
    .is("deleted_at", null)
    .eq("status", "active")
    .single();

  if (!rawProduct || rawProduct.deleted_at || rawProduct.status !== "active") {
    notFound();
  }

  // 2. Map images with cover first
  const images: ProductImage[] = (rawProduct.product_images || []).map((img: any) => ({
    id: img.id,
    productId: img.product_id,
    storagePath: img.storage_path,
    isCover: Boolean(img.is_cover),
    altText: img.alt_text || rawProduct.name,
    sortOrder: img.display_order ?? img.sort_order ?? 0,
  }));
  images.sort(
    (a, b) =>
      (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0) ||
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  const coverImage = images[0]?.storagePath || "/image/photo_2025-10-01_07-26-53.jpg";

  // 3. Extract craftsmanship details safely
  const details: ProductCraftsmanshipDetails =
    rawProduct.details && typeof rawProduct.details === "object"
      ? (rawProduct.details as ProductCraftsmanshipDetails)
      : {};

  const hasStory = Boolean(details.story && details.story.trim().length > 0);
  const hasMaterials = Boolean(details.materials && details.materials.trim().length > 0);
  const validComponents = (details.components || []).filter(
    (c) => c.name?.trim() || c.description?.trim()
  );
  const hasComponents = validComponents.length > 0;

  const validHighlights = (details.highlights || []).filter(
    (h) => h.title?.trim() || h.text?.trim()
  );
  const hasHighlights = validHighlights.length > 0;

  // 4. Fetch all active products for the Instrument Switcher
  const { data: activeInstruments } = await supabase
    .from("products")
    .select("id, name, slug, badge, category")
    .is("deleted_at", null)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "251969189470";
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    `Hello Amiele Begena! I am inquiring about the ${rawProduct.name} craftsmanship details and availability.`
  )}`;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#14231b] pb-28 sm:pb-24 md:pb-16 selection:bg-[#d4af37]/30">
      {/* ====================================================================
          1. BREADCRUMBS & INSTRUMENT SWITCHER PILL BAR
      ==================================================================== */}
      <section className="border-b border-[#E7E3D8] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-[72px] md:top-20 z-30">
        <div className="max-w-7xl mx-auto px-3 min-[360px]:px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            {/* Breadcrumb path */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-[#737874] font-medium shrink-0 overflow-hidden"
            >
              <Link
                href="/"
                className="hover:text-[#14231b] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37] rounded px-0.5"
              >
                Home
              </Link>
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#d4af37] shrink-0" />
              <Link
                href="/about-product"
                className="hover:text-[#14231b] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37] rounded px-0.5 shrink-0"
              >
                About Product
              </Link>
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#d4af37] shrink-0" />
              <span className="text-[#14231b] font-bold truncate max-w-[120px] min-[360px]:max-w-[160px] sm:max-w-xs">
                {rawProduct.name}
              </span>
            </nav>

            {/* Instrument Switcher Horizontal Carousel */}
            {activeInstruments && activeInstruments.length > 1 && (
              <div
                role="tablist"
                aria-label="Available traditional instruments"
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 touch-pan-x"
              >
                <span className="text-[10px] font-extrabold text-[#737874] uppercase tracking-wider shrink-0 mr-1 hidden lg:inline">
                  Select Instrument:
                </span>
                {activeInstruments.map((item) => {
                  const isActive = item.slug === rawProduct.slug;
                  return (
                    <Link
                      key={item.id}
                      href={`/about-product/${item.slug}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer min-h-[36px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                        isActive
                          ? "bg-[#14231b] text-[#FAF8F5] shadow-sm border border-[#d4af37]"
                          : "bg-white/90 hover:bg-white text-[#5b615e] hover:text-[#14231b] border border-[#E7E3D8]"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ====================================================================
          2. EDITORIAL HERO SECTION
      ==================================================================== */}
      <section className="relative overflow-hidden pt-6 pb-10 min-[360px]:pt-8 min-[360px]:pb-12 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-24 border-b border-[#E7E3D8]">
        {/* Subtle decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-3 min-[360px]:px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-12 items-center">
            {/* Left: Editorial Header Content */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
              {/* Category / Badge Tags */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#14231b] text-[#FAF8F5] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-[#d4af37]" />
                  <span>Artisan Masterpiece</span>
                </span>
                {rawProduct.badge && (
                  <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#d4af37]/20 border border-[#d4af37] text-[#14231b] text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">
                    {rawProduct.badge}
                  </span>
                )}
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white border border-[#E7E3D8] text-[#737874] text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
                  {rawProduct.category}
                </span>
              </div>

              {/* Static Amharic Heading */}
              <div>
                <h1 className="font-benaiah text-2xl min-[360px]:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#14231b] tracking-tight leading-[1.15] break-words">
                  የጥበቡ ታሪክና አሠራር
                </h1>
                <p className="mt-1.5 sm:mt-2 text-xs min-[360px]:text-sm sm:text-base md:text-lg lg:text-xl font-medium text-[#737874] italic">
                  The Sacred Acoustic Heritage &amp; Craftsmanship of{" "}
                  <span className="text-[#14231b] font-bold not-italic">{rawProduct.name}</span>
                </p>
              </div>

              {/* Short summary description */}
              {rawProduct.short_description && (
                <p className="text-xs min-[360px]:text-sm sm:text-base text-[#5b615e] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  {rawProduct.short_description}
                </p>
              )}

              {/* Sound audition widget (if available) */}
              {rawProduct.audio_url && rawProduct.audio_enabled && (
                <div className="pt-1 sm:pt-2 flex justify-center lg:justify-start">
                  <ProductAudioSample
                    audioUrl={rawProduct.audio_url}
                    productName={rawProduct.name}
                  />
                </div>
              )}

              {/* Hero Action Buttons */}
              <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center lg:justify-start gap-2.5 sm:gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[46px] rounded-full bg-[#14231b] hover:bg-[#0f2418] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                >
                  <span>Explore In Storefront</span>
                  <ArrowRight className="w-4 h-4 text-[#d4af37]" />
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[46px] rounded-full bg-white hover:bg-[#FAF8F5] text-[#14231b] border border-[#E7E3D8] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>Inquire with Atelier</span>
                </a>
              </div>
            </div>

            {/* Right: Cover Image Feature */}
            <div className="lg:col-span-5 w-full">
              <div className="relative mx-auto max-w-xs min-[360px]:max-w-sm sm:max-w-md lg:max-w-none">
                <div className="relative aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[#d4af37]/40 shadow-xl sm:shadow-2xl bg-white">
                  <Image
                    src={safeImageUrl(coverImage)}
                    alt={`Handcrafted Ethiopian traditional instrument: ${rawProduct.name}`}
                    fill
                    priority
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 40vw"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                  {/* Corner Badge */}
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md border border-[#E7E3D8] text-center shadow-lg">
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-[#d4af37] tracking-widest uppercase block">
                      Authentic Masterpiece
                    </span>
                    <span className="font-benaiah font-bold text-xs sm:text-sm text-[#14231b] block truncate">
                      {rawProduct.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. PRODUCT STORY & HERITAGE SECTION (Hidden if empty)
      ==================================================================== */}
      {hasStory && (
        <section className="py-10 min-[360px]:py-12 sm:py-16 lg:py-24 border-b border-[#E7E3D8] bg-white/60">
          <div className="max-w-4xl mx-auto px-3 min-[360px]:px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-2 sm:space-y-3 mb-6 sm:mb-10">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-[#d4af37] uppercase tracking-widest block">
                Lineage &amp; Sacred History
              </span>
              <h2 className="font-benaiah text-2xl min-[360px]:text-3xl sm:text-4xl font-bold text-[#14231b]">
                የታሪኩ ምንጭና ቅርስ
              </h2>
              <p className="text-[10px] min-[360px]:text-xs sm:text-sm text-[#737874] font-medium uppercase tracking-wider">
                The Sacred Heritage &amp; Cultural Lineage
              </p>
            </div>

            <div className="prose prose-stone max-w-none">
              <div className="p-4 min-[360px]:p-6 sm:p-8 lg:p-12 rounded-2xl sm:rounded-3xl bg-[#FAF8F5] border border-[#E7E3D8] shadow-sm relative overflow-hidden">
                <span className="text-4xl min-[360px]:text-5xl sm:text-7xl font-serif text-[#d4af37]/25 absolute -top-1 -left-1 sm:-top-2 sm:-left-2 select-none leading-none">
                  &ldquo;
                </span>
                <div className="relative text-xs min-[360px]:text-sm sm:text-base text-[#14231b]/90 leading-relaxed sm:leading-loose whitespace-pre-line font-normal space-y-3 sm:space-y-4">
                  {details.story}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ====================================================================
          4. MATERIALS & CONSTRUCTION (Hidden if empty)
      ==================================================================== */}
      {hasMaterials && (
        <section className="py-10 min-[360px]:py-12 sm:py-16 lg:py-24 border-b border-[#E7E3D8]">
          <div className="max-w-5xl mx-auto px-3 min-[360px]:px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-2 sm:space-y-3 mb-8 sm:mb-12">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-[#d4af37] uppercase tracking-widest block">
                Natural Highland Elements
              </span>
              <h2 className="font-benaiah text-2xl min-[360px]:text-3xl sm:text-4xl font-bold text-[#14231b]">
                ቁሳቁሶችና አሠራር
              </h2>
              <p className="text-[10px] min-[360px]:text-xs sm:text-sm text-[#737874] font-medium uppercase tracking-wider">
                Honoring Ancient Materials &amp; Master Joinery
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start sm:items-center">
              {/* Materials Content Card */}
              <div className="md:col-span-8 p-4 min-[360px]:p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl bg-white border border-[#E7E3D8] shadow-sm space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#d4af37] uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4 text-[#d4af37] shrink-0" />
                  <span>Artisan Specification</span>
                </div>
                <div className="text-xs min-[360px]:text-sm sm:text-base text-[#5b615e] leading-relaxed whitespace-pre-line space-y-2.5 sm:space-y-3">
                  {details.materials}
                </div>
              </div>

              {/* Highlights callout cards (side-by-side on tablet, stacked on mobile) */}
              <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4 w-full">
                <div className="p-4 sm:p-6 rounded-2xl bg-[#14231b] text-[#FAF8F5] space-y-1.5 sm:space-y-2 border border-[#d4af37]/40 shadow-sm">
                  <span className="text-[10px] font-extrabold text-[#d4af37] uppercase tracking-wider block">
                    Highland Cordia &amp; Tid
                  </span>
                  <h3 className="font-benaiah text-base sm:text-lg font-bold text-white">
                    Acoustically Seasoned
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Naturally air-dried timbers hand-selected for optimal resonance and dimensional stability.
                  </p>
                </div>

                <div className="p-4 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-[#E7E3D8] space-y-1.5 sm:space-y-2 shadow-sm">
                  <span className="text-[10px] font-extrabold text-[#737874] uppercase tracking-wider block">
                    Sun-Cured Parchment
                  </span>
                  <h3 className="font-benaiah text-base sm:text-lg font-bold text-[#14231b]">
                    Traditional Soundboard
                  </h3>
                  <p className="text-xs text-[#5b615e] leading-relaxed">
                    Hand-scraped natural hides producing warm acoustic low-frequency warmth and authentic modal buzz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ====================================================================
          5. KEY COMPONENTS / ANATOMY (Hidden if empty)
      ==================================================================== */}
      {hasComponents && (
        <section className="py-10 min-[360px]:py-12 sm:py-16 lg:py-24 border-b border-[#E7E3D8] bg-white/70">
          <div className="max-w-7xl mx-auto px-3 min-[360px]:px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-2 sm:space-y-3 mb-8 sm:mb-12">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-[#d4af37] uppercase tracking-widest block">
                Instrument Anatomy
              </span>
              <h2 className="font-benaiah text-2xl min-[360px]:text-3xl sm:text-4xl font-bold text-[#14231b]">
                ዋና ዋና ክፍሎች
              </h2>
              <p className="text-[10px] min-[360px]:text-xs sm:text-sm text-[#737874] font-medium uppercase tracking-wider">
                Anatomy of a Sacred Masterpiece
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {validComponents.map((comp, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl sm:rounded-3xl bg-[#FAF8F5] border border-[#E7E3D8] overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group"
                >
                  {comp.image && (
                    <div className="relative aspect-[16/10] sm:aspect-video w-full bg-[#E7E3D8] overflow-hidden">
                      <Image
                        src={safeImageUrl(comp.image)}
                        alt={`Component part ${idx + 1}: ${comp.name || "Instrument component"}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}

                  <div className="p-4 sm:p-6 space-y-1.5 sm:space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-[#d4af37] tracking-wider uppercase block mb-1">
                        Part {idx + 1}
                      </span>
                      <h3 className="font-benaiah text-lg sm:text-xl font-bold text-[#14231b]">
                        {comp.name}
                      </h3>
                      {comp.description && (
                        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#5b615e] leading-relaxed">
                          {comp.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ====================================================================
          6. DISTINCTIVE HIGHLIGHTS (Consistent vertical stacking on phones)
      ==================================================================== */}
      {hasHighlights && (
        <section className="py-10 min-[360px]:py-12 sm:py-16 lg:py-24 border-b border-[#E7E3D8]">
          <div className="max-w-6xl mx-auto px-3 min-[360px]:px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14 lg:space-y-20">
            <div className="text-center space-y-2 sm:space-y-3">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-[#d4af37] uppercase tracking-widest block">
                Artisan Distinctions
              </span>
              <h2 className="font-benaiah text-2xl min-[360px]:text-3xl sm:text-4xl font-bold text-[#14231b]">
                ልዩ መለያዎች
              </h2>
              <p className="text-[10px] min-[360px]:text-xs sm:text-sm text-[#737874] font-medium uppercase tracking-wider">
                What Sets This Instrument Apart
              </p>
            </div>

            <div className="space-y-10 sm:space-y-14 lg:space-y-20">
              {validHighlights.map((hl, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-12 items-center ${
                      !isEven ? "lg:flex-row-reverse" : ""
                    }`}
                  >
                    {/* Visual Card (Always on top at phone widths) */}
                    <div className={`lg:col-span-5 w-full ${!isEven ? "lg:order-2" : "lg:order-1"}`}>
                      {hl.image ? (
                        <div className="relative aspect-[16/10] sm:aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E7E3D8] shadow-md bg-white max-w-lg mx-auto lg:max-w-none">
                          <Image
                            src={safeImageUrl(hl.image)}
                            alt={`Distinctive highlight: ${hl.title || "Instrument detail"}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
                            className="object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[16/10] sm:aspect-[4/3] rounded-2xl sm:rounded-3xl bg-[#14231b] border border-[#d4af37]/40 flex flex-col items-center justify-center p-6 sm:p-8 text-center text-[#FAF8F5] space-y-2 sm:space-y-3 max-w-lg mx-auto lg:max-w-none shadow-md">
                          <span className="text-2xl sm:text-3xl font-serif text-[#d4af37]">§</span>
                          <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-stone-300">
                            Distinctive Feature #{idx + 1}
                          </span>
                          <h3 className="font-benaiah text-xl sm:text-2xl font-bold text-white">
                            {hl.title}
                          </h3>
                        </div>
                      )}
                    </div>

                    {/* Text Card (Always below image at phone widths) */}
                    <div className={`lg:col-span-7 space-y-2.5 sm:space-y-4 ${!isEven ? "lg:order-1" : "lg:order-2"}`}>
                      <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#d4af37]/15 text-[#14231b] text-[10px] font-extrabold uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                        <span>Craft Distinction</span>
                      </div>
                      <h3 className="font-benaiah text-xl min-[360px]:text-2xl sm:text-3xl font-bold text-[#14231b]">
                        {hl.title}
                      </h3>
                      {hl.text && (
                        <p className="text-xs min-[360px]:text-sm sm:text-base text-[#5b615e] leading-relaxed whitespace-pre-line">
                          {hl.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ====================================================================
          7. SHARED STATIC CRAFTSMANSHIP FAQ SECTION
      ==================================================================== */}
      <section className="py-10 min-[360px]:py-12 sm:py-16 lg:py-24 border-b border-[#E7E3D8] bg-white/60">
        <div className="max-w-4xl mx-auto px-3 min-[360px]:px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 sm:space-y-3 mb-8 sm:mb-12">
            <span className="text-[10px] sm:text-[11px] font-extrabold text-[#d4af37] uppercase tracking-widest block">
              Knowledge &amp; Stewardship
            </span>
            <h2 className="font-benaiah text-2xl min-[360px]:text-3xl sm:text-4xl font-bold text-[#14231b]">
              ተደጋግመው የሚነሱ ጥያቄዎች
            </h2>
            <p className="text-[10px] min-[360px]:text-xs sm:text-sm text-[#737874] font-medium uppercase tracking-wider">
              Artisan Inquiries &amp; Instrument Care
            </p>
          </div>

          <CraftsmanshipFAQ />
        </div>
      </section>

      {/* ====================================================================
          8. CALL TO ACTION: STOREFRONT & ATELIER
      ==================================================================== */}
      <section className="py-10 min-[360px]:py-14 sm:py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-3 min-[360px]:px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl sm:rounded-3xl bg-[#14231b] text-[#FAF8F5] p-5 min-[360px]:p-7 sm:p-10 lg:p-14 text-center space-y-4 sm:space-y-6 relative overflow-hidden border border-[#d4af37]/30 shadow-2xl">
            {/* Background decorative glow */}
            <div className="absolute top-0 right-0 w-48 sm:w-80 h-48 sm:h-80 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative space-y-2 sm:space-y-3 max-w-2xl mx-auto">
              <span className="text-[10px] sm:text-xs font-extrabold text-[#d4af37] uppercase tracking-widest block">
                Acquire Authentic Heritage
              </span>
              <h2 className="font-benaiah text-2xl min-[360px]:text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Experience the Resonant Heritage of {rawProduct.name}
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xl mx-auto">
                Hand-voiced in Addis Ababa, blessed with ancient Ethiopian craftsmanship, and shipped securely worldwide with full courier protection.
              </p>
            </div>

            <div className="relative flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center gap-2.5 sm:gap-4 pt-1 sm:pt-2">
              <Link
                href="/products"
                className="w-full sm:w-auto justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#d4af37] hover:bg-[#b8972e] text-[#14231b] text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-xl cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF8F5] min-h-[48px] flex items-center"
              >
                Shop {rawProduct.name} in Catalog
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto justify-center px-5 sm:px-6 py-3.5 sm:py-4 rounded-full bg-white/10 hover:bg-white/20 text-[#FAF8F5] border border-white/20 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] min-h-[48px]"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                <span>Speak with Our Luthier</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          9. STICKY MOBILE WHATSAPP BUTTON (Small screens only, non-intrusive)
      ==================================================================== */}
      <div className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-40 md:hidden">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Inquire about ${rawProduct.name} on WhatsApp`}
          className="w-full py-3 px-3.5 sm:px-4 rounded-2xl bg-[#14231b]/95 backdrop-blur-md text-[#FAF8F5] border border-[#d4af37] shadow-2xl flex items-center justify-between text-xs font-bold active:scale-[0.98] transition-all cursor-pointer min-h-[50px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white shrink-0 shadow">
              <MessageCircle className="w-4 h-4 fill-white" />
            </div>
            <div className="text-left truncate">
              <span className="block text-[11px] font-extrabold text-[#FAF8F5] leading-tight truncate">
                Inquire on WhatsApp
              </span>
              <span className="block text-[9px] text-stone-300 truncate">
                About {rawProduct.name}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-[#d4af37] uppercase tracking-wider shrink-0 ml-2">
            Chat Now →
          </span>
        </a>
      </div>
    </div>
  );
}
