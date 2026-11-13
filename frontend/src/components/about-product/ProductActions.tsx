"use client";

import React, { useState } from "react";
import { useCart } from "../../context/CartContext";
import { useCurrency } from "../../context/CurrencyContext";
import { Product } from "../../lib/types";
import { ShoppingBag, MessageCircle, Check, ArrowRight } from "lucide-react";

interface ProductActionsProps {
  product: Product;
  whatsappUrl: string;
}

export default function ProductActions({ product, whatsappUrl }: ProductActionsProps) {
  const { addItem, openDirectOrder, openCart } = useCart();
  const { formatPrice, currency } = useCurrency();
  const [added, setAdded] = useState(false);

  const priceNum = typeof product.price === "string" ? parseFloat(product.price) : Number(product.price);
  const formattedPrice = !isNaN(priceNum) && priceNum > 0
    ? formatPrice(priceNum, product.currency || "USD")
    : "Price on request";

  const handleAddToCart = () => {
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 450);
  };

  const handleDirectOrder = () => {
    openDirectOrder(product, 1);
  };

  return (
    <div className="pt-4 space-y-4">
      {/* Price & Stock Display Bar */}
      <div className="flex flex-wrap items-baseline justify-center lg:justify-start gap-3">
        <span className="text-2xl sm:text-3xl font-bold text-[#14231b] tracking-tight">
          {formattedPrice}
        </span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#14231b]/5 text-[#2d6a4f] border border-[#2d6a4f]/20">
          Handcrafted in Addis Ababa
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center lg:justify-start gap-2.5 sm:gap-3">
        {/* Primary: Add to Cart */}
        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[46px] rounded-full bg-[#14231b] hover:bg-[#0f2418] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
        >
          {added ? (
            <>
              <Check className="w-4 h-4 text-[#25D366]" />
              <span>Added to Cart</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4 text-[#d4af37]" />
              <span>Add to Cart</span>
            </>
          )}
        </button>

        {/* Secondary: Order via WhatsApp Direct */}
        <button
          type="button"
          onClick={handleDirectOrder}
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[46px] rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span>Order via WhatsApp</span>
        </button>

        {/* Inquire link */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-3.5 min-h-[46px] rounded-full bg-white hover:bg-[#FAF8F5] text-[#5b615e] hover:text-[#14231b] border border-[#E7E3D8] text-xs font-semibold tracking-wide transition-all cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
        >
          <span>Custom Commission</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
        </a>
      </div>
    </div>
  );
}

