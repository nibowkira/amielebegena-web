"use client";

import React from "react";
import { Product } from "../lib/types";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { ShoppingBag, Volume2, Sparkles, Check } from "lucide-react";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const [added, setAdded] = React.useState(false);

  const coverImage = product.images?.[0]?.storagePath || "/image/photo_2025-10-01_07-26-53.jpg";

  const handleAdd = () => {
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="group rounded-3xl border border-[#d4af37]/20 bg-[#0f1a14]/75 backdrop-blur-md overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-[#d4af37]/50 hover:shadow-2xl hover:shadow-[#d4af37]/10 hover:-translate-y-1">
      {/* Media Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#14231b]">
        <img
          src={coverImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#080b09]/80 border border-[#d4af37]/40 text-[10px] font-bold text-[#f3e5ab] tracking-wider uppercase backdrop-blur-md">
            {product.badge}
          </div>
        )}

        {/* Audio available badge */}
        {product.audioEnabled && (
          <div className="absolute top-3 right-3 p-1.5 rounded-full bg-[#1b4332]/90 border border-[#52b788]/40 text-[#52b788] backdrop-blur-md" title="Acoustic Audio Audition Available">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[#d4af37] font-semibold uppercase tracking-wider">
            <span>{product.category}</span>
            {product.stock > 0 ? (
              <span className="text-[#52b788]">In Stock ({product.stock})</span>
            ) : (
              <span className="text-red-400">Backorder</span>
            )}
          </div>
          <h3 className="font-serif text-lg font-bold text-[#fbf8f2] group-hover:text-[#f3e5ab] transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-[#fbf8f2]/60 line-clamp-2 leading-relaxed">
            {product.shortDescription || product.description}
          </p>
        </div>

        {/* Bottom Price & Add to Cart */}
        <div className="pt-3 border-t border-[#d4af37]/15 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-[#fbf8f2]/50 block">Price</span>
            <span className="font-serif text-lg font-bold text-[#f3e5ab]">
              {formatPrice(product.price, product.currency)}
            </span>
          </div>

          <button
            onClick={handleAdd}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              added
                ? "bg-[#2d6a4f] text-[#fbf8f2] border border-[#52b788]"
                : "gold-gradient-bg text-[#080b09] hover:brightness-110 active:scale-95"
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
