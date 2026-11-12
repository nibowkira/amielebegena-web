"use client";

import React, { useState, useEffect, useRef } from "react";
import { useCart } from "../../context/CartContext";
import { useCurrency } from "../../context/CurrencyContext";
import { initialProducts } from "../../data/products";
import { Product } from "../../lib/types";
import { fetchProducts } from "../../lib/api";
import { useScrollLock } from "../../lib/useScrollLock";
import { Heart, Play, Pause, ChevronDown, Check, Volume2, X, Info, ShoppingBag } from "lucide-react";

interface CuratedProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  image: string;
  priceETB: number;
  priceUSD: number;
  audioUrl: string | null;
  description?: string;
}

export default function ProductsPage() {
  const { addItem, openDirectOrder } = useCart();
  const { formatPrice, currency } = useCurrency();

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>("በገና እና ክራር");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [audioModalProduct, setAudioModalProduct] = useState<CuratedProduct | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [detailsModalProduct, setDetailsModalProduct] = useState<CuratedProduct | null>(null);

  // Lock background scrolling while details modal is open
  useScrollLock(!!detailsModalProduct);

  // Support Escape key to close details modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailsModalProduct) {
        setDetailsModalProduct(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailsModalProduct]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const collections = [
    { id: "በገና እና ክራር", label: "በገና እና ክራር", icon: "🎻" },
    { id: "ከበሮ እና ሌሎች", label: "ከበሮ እና ሌሎች", icon: "🥁" },
    { id: "የበገና እና የክራር እቃዎች", label: "የበገና እና የክራር እቃዎች", icon: "⚙️" },
    { id: "መጻሕፍት", label: "መጻሕፍት", icon: "📚" },
    { id: "ቦርሳዎች", label: "ቦርሳዎች", icon: "👜" },
  ];

  // Specific products precisely matching the live site screenshots and ETB pricing
  const curatedProducts: CuratedProduct[] = [
    {
      id: "prod-kirar-1",
      name: "ክራር (Kirar)",
      slug: "kirar",
      category: "በገና እና ክራር",
      image: "/image/photo_2025-02-27_17-33-38.jpg",
      priceETB: 8500,
      priceUSD: 70.83,
      audioUrl: "/audio/kirar.mp3",
      description: "The Kirar is the vibrant, melodious traditional 5 or 6 string bowl lyre of Ethiopia. Handcrafted by master artisans with authentic highland wood, resonant parchment soundbox, and tuned for traditional Ethiopian pentatonic scales.",
    },
    {
      id: "prod-begena-1",
      name: "በገና (Begena)",
      slug: "begena",
      category: "በገና እና ክራር",
      image: "/image/photo_2025-10-01_07-26-53.jpg",
      priceETB: 8500,
      priceUSD: 100.0,
      audioUrl: "/audio/begena.mp3",
      description: "The Begena (Harp of David) is a sacred 10-string box lyre used in Ethiopian Orthodox liturgical chanting and prayer hymns. Meticulously handcrafted in Addis Ababa with cured highland wood and genuine resonant animal parchment.",
    },
    {
      id: "prod-masenqo-steel",
      name: "Mesenko — Steel",
      slug: "masenqo-steel",
      category: "በገና እና ክራር",
      image: "/image/photo_2025-02-24_22-03-09.jpg",
      priceETB: 5500,
      priceUSD: 65.0,
      audioUrl: "/audio/masinko.mp3",
      description: "A diamond-shaped, single-stringed bowed lute crafted with parchment membrane, durable steel reinforced tuning peg, highland wood, and a genuine horsehair bow. Produces an iconic resonant, evocative tone.",
    },
    {
      id: "prod-masenqo-wood",
      name: "Mesenko — Wood",
      slug: "masenqo-wood",
      category: "በገና እና ክራር",
      image: "/image/photo_2025-02-24_22-03-09.jpg",
      priceETB: 4500,
      priceUSD: 55.0,
      audioUrl: "/audio/masinko.mp3",
      description: "Carved with all-natural highland Ethiopian hardwood, parchment soundbox, and traditional wood friction tuning peg. Pure organic acoustic timbre.",
    },
    {
      id: "prod-electric-kirar",
      name: "Electric Kirar",
      slug: "electric-kirar",
      category: "በገና እና ክራር",
      image: "/image/kirar.jpg",
      priceETB: 9000,
      priceUSD: 83.33,
      audioUrl: "/audio/kirar.mp3",
      description: "Modern acoustic-electric Kirar equipped with high-fidelity magnetic pickup and 1/4 inch output jack for amplifiers, audio interfaces, and studio recording.",
    },
    {
      id: "prod-begena-portable",
      name: "በገና መለስተኛ (Compact Begena)",
      slug: "compact-begena",
      category: "በገና እና ክራር",
      image: "/image/photo_2025-10-01_07-26-53.jpg",
      priceETB: 7800,
      priceUSD: 85.0,
      audioUrl: "/audio/begena.mp3",
      description: "Ergonomic portable Begena suited for travelers, beginners, and home prayer devotion with rich acoustic resonance.",
    },
    // Category: ከበሮ እና ሌሎች
    {
      id: "prod-kebero-1",
      name: "ከበሮ (Kebero)",
      slug: "kebero",
      category: "ከበሮ እና ሌሎች",
      image: "/image/photo_2026-05-07_13-41-48.jpg",
      priceETB: 18575,
      priceUSD: 175.0,
      audioUrl: "/audio/masinko.mp3",
      description: "Double-headed ceremonial liturgical drum carved from a hollowed tree trunk with dual raw animal-skin diaphragms and traditional ornamental bindings.",
    },
    {
      id: "prod-washint-1",
      name: "ዋሽንት (Washint)",
      slug: "washint",
      category: "ከበሮ እና ሌሎች",
      image: "/image/photo_2025-02-27_17-33-38.jpg",
      priceETB: 1800,
      priceUSD: 45.0,
      audioUrl: null,
      description: "Authentic highland bamboo end-blown flute tuned to traditional Ethiopian pentatonic scales.",
    },
    {
      id: "prod-sanasel-1",
      name: "ጸናጽል (Sanasel)",
      slug: "sanasel",
      category: "ከበሮ እና ሌሎች",
      image: "/image/photo_2026-05-08_11-10-17.jpg",
      priceETB: 3500,
      priceUSD: 75.0,
      audioUrl: null,
      description: "Hand-forged brass and copper rattle sistrum used by cantors (Debteras) during sacred Ethiopian Tewahedo hymns.",
    },
    // Category: የበገና እና የክራር እቃዎች
    {
      id: "prod-awtar-1",
      name: "Awtar (አውታር)",
      slug: "awtar",
      category: "የበገና እና የክራር እቃዎች",
      image: "/image/image copy.png",
      priceETB: 336,
      priceUSD: 3.17,
      audioUrl: null,
      description: "Authentic replacement string prepared with artisan tension resilience for Begena and Kirar instruments.",
    },
    {
      id: "prod-strings-pack",
      name: "የበገና አውታሮች (Begena Strings Set)",
      slug: "begena-strings",
      category: "የበገና እና የክራር እቃዎች",
      image: "/image/image copy.png",
      priceETB: 1200,
      priceUSD: 20.0,
      audioUrl: null,
      description: "High-grade resilient replacement strings engineered for traditional 10-string Begena tension.",
    },
    {
      id: "prod-sheep-gut-strings",
      name: "የበግ አንጀት አውታር (Sheep-Gut Strings)",
      slug: "sheep-gut-strings",
      category: "የበገና እና የክራር እቃዎች",
      image: "/image/image copy.png",
      priceETB: 1500,
      priceUSD: 35.0,
      audioUrl: null,
      description: "Organic sheep-gut resonance strings treated with highland oils for warm, vintage harmonic bass depth.",
    },
    {
      id: "prod-wax-conditioner",
      name: "ሰም (Conditioning Beeswax)",
      slug: "conditioning-wax",
      category: "የበገና እና የክራር እቃዎች",
      image: "/image/bag-begena.jpg",
      priceETB: 650,
      priceUSD: 18.0,
      audioUrl: null,
      description: "Pure Ethiopian highland beeswax and organic resin formulation to nourish and protect acoustic parchment soundboxes.",
    },
    // Category: መጻሕፍት
    {
      id: "prod-begena-book",
      name: "የበገና መማሪያ መጽሐፍ (The Begena Lesson Book)",
      slug: "begena-book",
      category: "መጻሕፍት",
      image: "/image/begena_lesson_book.png",
      priceETB: 1500,
      priceUSD: 14.17,
      audioUrl: null,
      description: "Comprehensive instructional manual covering Begena history, stringing methods, tuning modes, and sacred hymn notations.",
    },
    {
      id: "prod-heritage-book",
      name: "የኢትዮጵያ ሙዚቃ ቅርስ (Ethiopian Musical Heritage)",
      slug: "heritage-book",
      category: "መጻሕፍት",
      image: "/image/ethiopian_music_heritage_book.png",
      priceETB: 2000,
      priceUSD: 19.58,
      audioUrl: null,
      description: "Scholarly anthology documenting ancient Ethiopian organology, liturgical traditions, and acoustic heritage.",
    },
    // Category: ቦርሳዎች
    {
      id: "prod-kirar-bag-leather",
      name: "Traditional Leather Bag (የክራር ቦርሳ)",
      slug: "traditional-leather-bag",
      category: "ቦርሳዎች",
      image: "/image/kirar-bag-sehera.jpg",
      priceETB: 8884,
      priceUSD: 84.0,
      audioUrl: null,
      description: "Full-grain Ethiopian highland cowhide bag crafted by master leatherworkers with brass fixtures for Kirar carry.",
    },
    {
      id: "prod-begena-bag-canvas",
      name: "የበገና ቦርሳ (ሸራ)",
      slug: "begena-bag-canvas",
      category: "ቦርሳዎች",
      image: "/image/bag-begena.jpg",
      priceETB: 2500,
      priceUSD: 23.6,
      audioUrl: null,
      description: "Heavy-duty padded black canvas gig bag tailored specifically for Begena protection with reinforced carrying straps.",
    },
    {
      id: "prod-begena-bag-leather",
      name: "የበገና ቦርሳ (begena bag) ቆዳ",
      slug: "begena-bag-leather",
      category: "ቦርሳዎች",
      image: "/image/bag-begena.jpg",
      priceETB: 3000,
      priceUSD: 28.3,
      audioUrl: null,
      description: "Premium handcrafted black leather protective carrier bag custom-fitted for full-size 10-string Begena.",
    },
    {
      id: "prod-kirar-bags-set",
      name: "ባህላዊ የክራር ቦርሳዎች (Kirar Gig Bags)",
      slug: "kirar-gig-bags",
      category: "ቦርሳዎች",
      image: "/image/bag-begena-kirar.jpg",
      priceETB: 2500,
      priceUSD: 23.6,
      audioUrl: null,
      description: "Ergonomic protective carrier bag set with dual shoulder straps and accessory pockets for 6-string acoustic or electric Kirars.",
    },
    {
      id: "prod-tote-bag",
      name: "የጥበብ ቦርሳ (Tibeb Cotton Tote)",
      slug: "cotton-tote",
      category: "ቦርሳዎች",
      image: "/image/kirar-bag-koda.jpg",
      priceETB: 1100,
      priceUSD: 30.0,
      audioUrl: null,
      description: "Hand-woven Ethiopian cotton tote adorned with colorful authentic Tibeb geometric patterns.",
    },
  ];

  // Fetch live products to synchronize with Supabase (B1, B4)
  useEffect(() => {
    setIsLoading(true);
    fetchProducts()
      .then((data) => {
        if (data && data.length > 0) {
          setDbProducts(data);
        }
      })
      .catch((e) => console.warn("Failed to fetch live products in catalog:", e))
      .finally(() => setIsLoading(false));
  }, []);

  // Merge curated catalogue with authoritative Supabase database records
  const displayProducts = curatedProducts.map((cp) => {
    const live = dbProducts.find((p) => p.slug === cp.slug || p.id === cp.id);
    if (!live) return cp;
    const priceNum = typeof live.price === "string" ? parseFloat(live.price) : Number(live.price);
    const cover = live.images?.find((img) => img.isCover)?.storagePath || live.images?.[0]?.storagePath || cp.image;
    return {
      ...cp,
      id: live.id,
      name: live.name,
      priceUSD: !isNaN(priceNum) && priceNum > 0 ? priceNum : cp.priceUSD,
      image: cover,
      description: live.description || live.shortDescription || cp.description,
    };
  });

  // Filtering based on collection
  const filteredProducts = displayProducts.filter((p) => {
    return p.category === activeCategory;
  });

  // Sorting logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-low") return a.priceETB - b.priceETB;
    if (sortBy === "price-high") return b.priceETB - a.priceETB;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0; // default newest/curated order
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("amiele_wishlist");
        if (saved) setWishlist(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("amiele_wishlist", JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  };

  const handleAddToCart = (p: CuratedProduct) => {
    const realDb = dbProducts.find((db) => db.slug === p.slug || db.id === p.id);
    const targetProduct: Product = realDb || {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      price: p.priceUSD,
      currency: "USD",
      stock: 50,
      featured: true,
      status: "active",
      images: [{ id: "cover", productId: p.id, storagePath: p.image, isCover: true, sortOrder: 0 }],
    };
    addItem(targetProduct);
    setAddedItems((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [p.id]: false }));
    }, 1500);
  };

  const handleOrderWhatsApp = (p: CuratedProduct) => {
    const realDb = dbProducts.find((db) => db.slug === p.slug || db.id === p.id);
    const targetProduct: Product = realDb || {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      price: p.priceUSD,
      currency: "USD",
      stock: 50,
      featured: true,
      status: "active",
      images: [{ id: "cover", productId: p.id, storagePath: p.image, isCover: true, sortOrder: 0 }],
    };
    openDirectOrder(targetProduct);
  };

  const handlePlayAudio = (p: CuratedProduct) => {
    if (audioModalProduct?.id === p.id && isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      }
    } else {
      setAudioModalProduct(p);
      setIsPlayingAudio(true);
      if (audioRef.current) {
        audioRef.current.src = p.audioUrl || "";
        audioRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#FAF8F5] text-[#14231b] pb-24">
      {/* Mobile Sticky Top Area (< md): Pinned at top-[72px] below the 72px fixed navbar */}
      <div className="md:hidden sticky top-[72px] z-30 w-full bg-[#FAF8F5]/98 backdrop-blur-md border-b border-[#14231b]/10 shadow-[0_4px_16px_rgba(20,39,29,0.06)] px-4 py-3 space-y-2.5">
        {/* Title + Sort Row */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#737874] uppercase block leading-none">
              ALL ITEMS
            </span>
            <h1 className="text-xl min-[360px]:text-2xl font-black text-[#14231b] tracking-tight leading-tight">
              Our Products
            </h1>
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl bg-[#EAE5DB] text-xs font-bold text-[#14231b] cursor-pointer focus:outline-none border border-black/5 hover:bg-[#ded9ce] transition-colors min-h-[38px]"
              aria-label="Sort products"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low</option>
              <option value="price-high">Price: High</option>
              <option value="name">Name (A-Z)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#14231b] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Category Pills Row with Horizontal Scroll and Right Fade */}
        <div className="relative w-full">
          <div className="flex items-center gap-2 overflow-x-auto touch-pan-x overscroll-contain no-scrollbar pb-0.5">
            {collections.map((col) => {
              const isSelected = activeCategory === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveCategory(col.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
                    isSelected
                      ? "bg-[#14231b] text-white shadow-xs"
                      : "bg-[#EDE8DF] text-[#14231b] hover:bg-[#EAE5DB]"
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className="text-sm">{col.icon}</span>
                  <span className="tracking-wide">{col.label}</span>
                </button>
              );
            })}
          </div>
          {/* Right-edge fade gradient */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#FAF8F5] via-[#FAF8F5]/80 to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Header Section (hidden on mobile, visible md: and above) */}
        <div className="hidden md:block">
          <div className="text-center pt-8 pb-3">
            <span className="text-xs font-bold tracking-[0.25em] text-[#737874] uppercase">
              ALL ITEMS
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4 pb-6 border-b border-[#14231b]/10">
            <h1 className="text-4xl lg:text-5xl font-black text-[#14231b] tracking-tight">
              Our Products
            </h1>

            <div className="flex items-center gap-2 text-xs text-[#5b615e]">
              <span className="font-semibold text-neutral-700">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[#EAE5DB] text-xs font-bold text-[#14231b] cursor-pointer focus:outline-none border border-black/5 hover:bg-[#ded9ce] transition-colors min-h-[38px]"
                  aria-label="Sort products desktop"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name (A-Z)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#14231b] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col md:flex-row items-start gap-6 lg:gap-10 pt-4 md:pt-8">
          {/* Desktop Left Sidebar (hidden on mobile, visible md:) */}
          <aside className="hidden md:block w-60 lg:w-64 shrink-0 sticky top-28 space-y-4">
            <div>
              <h3 className="text-xs font-black tracking-widest text-[#14231b] uppercase">
                COLLECTIONS
              </h3>
              <p className="text-xs text-[#737874] mt-1 mb-3">Filter by Category</p>
            </div>

            <div className="flex flex-col gap-1.5">
              {collections.map((col) => {
                const isSelected = activeCategory === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setActiveCategory(col.id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left w-full min-h-[44px] ${
                      isSelected
                        ? "bg-[#14231b] text-white shadow-xs"
                        : "bg-transparent text-[#14231b] hover:bg-[#EDE8DF]"
                    }`}
                  >
                    <span className="text-base">{col.icon}</span>
                    <span className="tracking-wide">{col.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Product Grid Container */}
          <main className="flex-1 w-full min-w-0">
            {/* Loading Skeleton State */}
            {isLoading ? (
              <div className="grid grid-cols-1 min-[481px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-full flex flex-col justify-between rounded-2xl bg-white/70 p-3 sm:p-4 border border-[#14231b]/10 shadow-2xs space-y-3"
                  >
                    <div className="aspect-[4/5] w-full rounded-xl bg-neutral-200/60 animate-pulse" />
                    <div className="space-y-2 pt-1">
                      <div className="h-4 w-3/4 bg-neutral-200/70 rounded animate-pulse" />
                      <div className="h-3 w-1/3 bg-neutral-200/70 rounded animate-pulse" />
                    </div>
                    <div className="pt-2 mt-auto">
                      <div className="h-10 w-full bg-neutral-200/70 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedProducts.length === 0 ? (
              /* Empty State */
              <div className="w-full py-16 px-4 text-center rounded-3xl bg-white/70 border border-[#14231b]/10 shadow-xs flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#EDE8DF] flex items-center justify-center text-2xl">
                  🎻
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-[#14231b]">
                    በዚህ ክፍል ውስጥ ምንም ምርት አልተገኘም
                  </h3>
                  <p className="text-xs text-[#737874]">
                    No instruments currently listed under &ldquo;{activeCategory}&rdquo;.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory(collections[0].id)}
                  className="px-5 py-2.5 rounded-full bg-[#14231b] hover:bg-[#2d4d3c] text-white text-xs font-bold transition-all min-h-[44px] cursor-pointer"
                >
                  View All Instruments / ሁሉንም ይመልከቱ
                </button>
              </div>
            ) : (
              /* Product Grid */
              <div className="grid grid-cols-1 min-[481px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {sortedProducts.map((product) => {
                  const isWishlisted = !!wishlist[product.id];
                  const isAdded = !!addedItems[product.id];
                  const isThisPlaying = audioModalProduct?.id === product.id && isPlayingAudio;

                  return (
                    <div
                      key={product.id}
                      className="h-full flex flex-col justify-between group rounded-2xl bg-white/60 hover:bg-white p-3 sm:p-4 border border-[#14231b]/10 hover:border-[#D4AF37]/50 shadow-2xs hover:shadow-md transition-all duration-300"
                    >
                      {/* Framed Image Container */}
                      <div className="relative aspect-[4/5] w-full rounded-xl bg-[#EDE8DF] p-3 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        <svg
                          className="absolute inset-0 w-full h-full text-[#DFDAD0]/50 pointer-events-none stroke-current"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          <line x1="100" y1="0" x2="0" y2="100" strokeWidth="0.75" />
                        </svg>

                        <div
                          onClick={() => setDetailsModalProduct(product)}
                          className="relative w-[88%] h-[88%] rounded-lg overflow-hidden shadow-xs cursor-pointer"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        {/* Circular 44x44px Heart Wishlist Button */}
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className="absolute top-2.5 right-2.5 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white/90 backdrop-blur-xs shadow-xs border border-black/5 flex items-center justify-center text-[#737874] hover:text-[#e63946] active:scale-95 transition-all cursor-pointer z-10"
                          aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${
                              isWishlisted ? "fill-[#e63946] text-[#e63946]" : "text-[#737874]"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Card Content & Details */}
                      <div className="pt-3 flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h2
                              onClick={() => setDetailsModalProduct(product)}
                              className="font-extrabold text-[#14231b] text-sm sm:text-base leading-tight cursor-pointer hover:underline line-clamp-2"
                            >
                              {product.name}
                            </h2>

                            {product.audioUrl && (
                              <button
                                onClick={() => handlePlayAudio(product)}
                                className="min-w-[32px] min-h-[32px] w-8 h-8 rounded-full bg-[#14231b] hover:bg-[#2d4d3c] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                                title="Play Audio Sample"
                                aria-label={`Play audio sample for ${product.name}`}
                              >
                                {isThisPlaying ? (
                                  <Pause className="w-3 h-3 fill-white text-white" />
                                ) : (
                                  <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => setDetailsModalProduct(product)}
                              className="text-[10px] font-bold text-[#737874] hover:text-[#14231b] tracking-wider uppercase transition-colors cursor-pointer"
                            >
                              DETAILS
                            </button>
                          </div>
                        </div>

                        {/* Bottom Row: Price & Actions Pinned at Bottom */}
                        <div className="mt-auto pt-3 space-y-2 border-t border-[#14231b]/5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] uppercase font-bold text-[#737874] tracking-wider">
                              Price
                            </span>
                            <div className="font-extrabold text-sm sm:text-base text-[#14231b] leading-tight">
                              {currency === "ETB" ? (
                                <span>ETB {product.priceETB.toLocaleString()}</span>
                              ) : (
                                formatPrice(product.priceUSD, "USD")
                              )}
                            </div>
                          </div>

                          {/* Full-width ORDER VIA WHATSAPP Button + Add to Cart option */}
                          <div className="flex flex-col gap-1.5 w-full">
                            <button
                              onClick={() => handleOrderWhatsApp(product)}
                              className="w-full py-2.5 px-3 rounded-full bg-gradient-to-r from-[#1eb656] via-[#22c55e] to-[#25D366] hover:from-[#18a84e] hover:via-[#1eb656] hover:to-[#22c35e] text-white text-xs font-bold leading-tight flex items-center justify-center gap-2 shadow-[0_3px_12px_rgba(37,211,102,0.28)] hover:shadow-[0_5px_18px_rgba(37,211,102,0.38)] active:scale-95 transition-all cursor-pointer min-h-[44px] border border-white/20"
                            >
                              <span className="w-4 h-4 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                                <svg className="w-2.5 h-2.5 fill-white shrink-0" viewBox="0 0 24 24">
                                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 6.84C8.95 6.84 8.7 6.9 8.5 7.12C8.28 7.34 7.69 7.9 7.69 9.03C7.69 10.17 8.52 11.27 8.64 11.43C8.75 11.59 10.27 13.93 12.61 14.93C14.55 15.77 14.95 15.6 15.38 15.56C15.81 15.52 16.78 15 16.98 14.41C17.18 13.82 17.18 13.33 17.12 13.22C17.06 13.11 16.9 13.06 16.66 12.94C16.41 12.82 15.2 12.23 14.97 12.15C14.75 12.07 14.59 12.03 14.43 12.27C14.26 12.51 13.8 13.06 13.66 13.22C13.52 13.38 13.38 13.4 13.13 13.28C12.89 13.16 12.11 12.9 11.18 12.07C10.46 11.43 9.97 10.63 9.83 10.39C9.69 10.15 9.82 10.02 9.94 9.9C10.05 9.79 10.19 9.61 10.31 9.47C10.43 9.33 10.47 9.23 10.55 9.07C10.63 8.91 10.59 8.77 10.53 8.65C10.47 8.53 9.99 7.35 9.79 6.88C9.6 6.42 9.4 6.48 9.25 6.47C9.11 6.46 8.95 6.46 8.79 6.46L9.11 6.84Z" />
                                </svg>
                              </span>
                              <span>ORDER VIA WHATSAPP</span>
                            </button>

                            <button
                              onClick={() => handleAddToCart(product)}
                              className={`w-full py-1.5 px-3 rounded-full font-bold text-[10px] sm:text-xs tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 border min-h-[36px] cursor-pointer ${
                                isAdded
                                  ? "bg-[#2d6a4f] text-white border-[#2d6a4f]"
                                  : "bg-[#FAF8F5] hover:bg-[#EDE8DF] text-[#14231b] border-[#14231b]/20"
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                  <span>ADDED TO CART</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-3.5 h-3.5 text-[#14231b] shrink-0" />
                                  <span>ADD TO CART</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Hidden audio element for reliable audio sample playback */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlayingAudio(false)}
        onPause={() => setIsPlayingAudio(false)}
        onPlay={() => setIsPlayingAudio(true)}
      />

      {/* Floating Audio Sample Player */}
      {audioModalProduct && audioModalProduct.audioUrl && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-4 rounded-3xl bg-[#14231b] border border-[#2d4d3c] shadow-2xl text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => handlePlayAudio(audioModalProduct)}
              className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              {isPlayingAudio ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>
            <div className="truncate">
              <h4 className="font-bold text-sm text-white truncate">
                {audioModalProduct.name}
              </h4>
              <p className="text-[11px] text-[#52b788]">Acoustic Pentatonic Sample</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              setIsPlayingAudio(false);
              setAudioModalProduct(null);
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Close audio player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Product Details Modal */}
      {detailsModalProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
          style={{ overscrollBehavior: "none" }}
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDetailsModalProduct(null)}
            style={{ touchAction: "none" }}
          />
          <div
            className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl shadow-2xl overflow-y-auto max-h-[calc(100vh-2rem)] border border-[#14231b]/10 p-6 sm:p-8 space-y-6 z-10"
            style={{
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
            <button
              onClick={() => setDetailsModalProduct(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#EDE8DF] flex items-center justify-center text-[#14231b] hover:bg-[#DFDAD0] transition-colors cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="aspect-[4/3] w-full rounded-2xl bg-[#EDE8DF] p-4 flex items-center justify-center overflow-hidden">
              <img
                src={detailsModalProduct.image}
                alt={detailsModalProduct.name}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-2xl font-black text-[#14231b]">
                  {detailsModalProduct.name}
                </h3>
                <span className="text-lg font-black text-[#14231b]">
                  {currency === "ETB"
                    ? `ETB ${detailsModalProduct.priceETB.toLocaleString()}`
                    : formatPrice(detailsModalProduct.priceUSD, "USD")}
                </span>
              </div>
              <p className="text-xs text-[#737874] tracking-wide uppercase font-bold">
                {detailsModalProduct.category}
              </p>
              <p className="text-sm text-[#3b433e] leading-relaxed pt-2">
                {detailsModalProduct.description}
              </p>
            </div>

            {detailsModalProduct.audioUrl && (
              <div className="p-3 rounded-2xl bg-[#EDE8DF] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-[#14231b]" />
                  <span className="text-xs font-bold text-[#14231b]">
                    Listen to Acoustic Tone
                  </span>
                </div>
                <button
                  onClick={() => handlePlayAudio(detailsModalProduct)}
                  className="px-3 py-1.5 rounded-full bg-[#14231b] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#2d4d3c] transition-colors cursor-pointer"
                >
                  {audioModalProduct?.id === detailsModalProduct.id && isPlayingAudio ? (
                    <>
                      <Pause className="w-3 h-3 fill-white" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-white ml-0.5" />
                      <span>Play Sample</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleAddToCart(detailsModalProduct);
                  setDetailsModalProduct(null);
                }}
                className="px-5 py-3 rounded-full bg-[#0d1e16] hover:bg-[#07130d] text-white font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm border border-white/10"
              >
                <ShoppingBag className="w-4 h-4 text-[#f5c518] shrink-0 stroke-[2.2]" />
                <span>Add to Cart</span>
              </button>
              <button
                onClick={() => {
                  handleOrderWhatsApp(detailsModalProduct);
                  setDetailsModalProduct(null);
                }}
                className="flex-1 py-3 px-5 rounded-full bg-gradient-to-r from-[#1eb656] via-[#22c55e] to-[#25D366] hover:from-[#18a84e] hover:via-[#1eb656] hover:to-[#22c35e] text-white text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_4px_14px_rgba(37,211,102,0.32)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.42)] border border-white/20 active:scale-95 min-h-[46px]"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 6.84C8.95 6.84 8.7 6.9 8.5 7.12C8.28 7.34 7.69 7.9 7.69 9.03C7.69 10.17 8.52 11.27 8.64 11.43C8.75 11.59 10.27 13.93 12.61 14.93C14.55 15.77 14.95 15.6 15.38 15.56C15.81 15.52 16.78 15 16.98 14.41C17.18 13.82 17.18 13.33 17.12 13.22C17.06 13.11 16.9 13.06 16.66 12.94C16.41 12.82 15.2 12.23 14.97 12.15C14.75 12.07 14.59 12.03 14.43 12.27C14.26 12.51 13.8 13.06 13.66 13.22C13.52 13.38 13.38 13.4 13.13 13.28C12.89 13.16 12.11 12.9 11.18 12.07C10.46 11.43 9.97 10.63 9.83 10.39C9.69 10.15 9.82 10.02 9.94 9.9C10.05 9.79 10.19 9.61 10.31 9.47C10.43 9.33 10.47 9.23 10.55 9.07C10.63 8.91 10.59 8.77 10.53 8.65C10.47 8.53 9.99 7.35 9.79 6.88C9.6 6.42 9.4 6.48 9.25 6.47C9.11 6.46 8.95 6.46 8.79 6.46L9.11 6.84Z" />
                  </svg>
                </span>
                <span>Order via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
