import { redirect } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export const revalidate = 60;

export default async function AboutProductIndexPage() {
  try {
    // 1. Try to find the flagship product (featured = true, status = 'active', not soft-deleted)
    const { data: featuredProducts } = await supabase
      .from("products")
      .select("id, slug, featured, sort_order, created_at")
      .is("deleted_at", null)
      .eq("status", "active")
      .eq("featured", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1);

    if (featuredProducts && featuredProducts.length > 0 && featuredProducts[0].slug) {
      redirect(`/about-product/${featuredProducts[0].slug}`);
    }

    // 2. Fallback: first active product
    const { data: activeProducts } = await supabase
      .from("products")
      .select("id, slug, sort_order, created_at")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1);

    if (activeProducts && activeProducts.length > 0 && activeProducts[0].slug) {
      redirect(`/about-product/${activeProducts[0].slug}`);
    }
  } catch (error) {
    // In Next.js, redirect() throws a NEXT_REDIRECT error which should not be caught as an error
    // Re-throw if error is a redirect error
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    console.error("Error querying flagship product for /about-product:", error);
  }

  // 3. Friendly empty state if no active products exist
  return (
    <div className="min-h-[70vh] bg-[#FAF8F5] flex items-center justify-center px-3 min-[360px]:px-4 py-12 sm:py-16">
      <div className="max-w-md w-full text-center space-y-4 sm:space-y-6 p-5 min-[360px]:p-6 sm:p-8 bg-white rounded-2xl sm:rounded-3xl border border-[#E7E3D8] shadow-sm">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-[#FAF8F5] border border-[#d4af37]/40 flex items-center justify-center text-2xl shadow-sm">
          🎻
        </div>
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-[#d4af37] uppercase tracking-widest block mb-1">
            Artisan Exhibition
          </span>
          <h1 className="font-benaiah text-2xl min-[360px]:text-3xl font-bold text-[#14231b] mb-2 leading-snug">
            የጥበቡ ታሪክና አሠራር
          </h1>
          <p className="text-xs text-[#737874] leading-relaxed">
            Our atelier craftsmanship gallery is currently being curated. Please explore the storefront to discover our available traditional Ethiopian instruments.
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 min-h-[46px] rounded-full bg-[#14231b] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider hover:bg-[#d4af37] hover:text-[#14231b] transition-all text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
        >
          Explore All Products
        </Link>
      </div>
    </div>
  );
}

