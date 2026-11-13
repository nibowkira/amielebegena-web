"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useScrollLock } from "../lib/useScrollLock";
import { X, Plus, Minus, Trash2, AlertCircle } from "lucide-react";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotalUSD, openCheckoutModal, referralCode } = useCart();
  const { formatPrice, currency } = useCurrency();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Bulletproof lock of background scroll while drawer is open
  useScrollLock(isOpen);

  useEffect(() => {
    if (items.length > 0) {
      setCheckoutError(null);
    }
  }, [items.length]);

  const handleCheckout = () => {
    if (items.length === 0) {
      setCheckoutError("Your cart is empty. Please add a product before checking out.");
      return;
    }
    setCheckoutError(null);
    openCheckoutModal();
  };

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const totalDisplay = items.length > 0
    ? formatPrice(subtotalUSD, "USD")
    : formatPrice(0, "USD");

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
      style={{ overscrollBehavior: "none" }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
        style={{ touchAction: "none" }}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className="w-screen max-w-md flex flex-col"
          style={{
            backgroundColor: "#FAF8F5",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
            animation: "slideInRight 0.3s ease-out",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-5"
            style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#1a1a1a",
                margin: 0,
              }}
            >
              Your Cart
            </h2>
            <button
              onClick={closeCart}
              className="p-1 transition-colors cursor-pointer"
              style={{
                color: "#1a1a1a",
                background: "none",
                border: "none",
              }}
              aria-label="Close cart"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Cart Items / Empty State */}
          <div
            className="flex-1 overflow-y-auto px-6 py-6"
            style={{
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
            {items.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p
                  style={{
                    color: "#6b6b6b",
                    fontSize: "0.95rem",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                  }}
                >
                  Your cart is empty.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Referral Banner */}
                {referralCode && (
                  <div
                    className="flex items-center justify-between px-4 py-2 rounded-lg text-xs"
                    style={{
                      backgroundColor: "#edf7f0",
                      color: "#2d6a4f",
                      border: "1px solid #b7e4c7",
                    }}
                  >
                    <span>
                      Partner Referral: <strong>{referralCode}</strong>
                    </span>
                    <span className="font-bold uppercase tracking-wider" style={{ fontSize: "10px" }}>
                      Applied
                    </span>
                  </div>
                )}

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 py-4"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="shrink-0 overflow-hidden"
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "12px",
                        backgroundColor: "#f0ece4",
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            style={{
                              fontFamily: "'Cormorant Garamond', Georgia, serif",
                              fontSize: "0.9rem",
                              fontWeight: 600,
                              color: "#1a1a1a",
                              lineHeight: 1.3,
                            }}
                            className="line-clamp-1"
                          >
                            {item.name}
                          </h3>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-1 transition-colors cursor-pointer"
                            style={{ color: "#999", background: "none", border: "none" }}
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p
                          style={{
                            fontSize: "0.7rem",
                            color: "#888",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginTop: "2px",
                          }}
                        >
                          {item.category}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Controls */}
                        <div
                          className="flex items-center overflow-hidden"
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                          }}
                        >
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="px-2 py-1 transition-colors cursor-pointer"
                            style={{
                              color: "#1a1a1a",
                              background: "none",
                              border: "none",
                            }}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            className="px-3"
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              color: "#1a1a1a",
                            }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="px-2 py-1 transition-colors cursor-pointer"
                            style={{
                              color: "#1a1a1a",
                              background: "none",
                              border: "none",
                            }}
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <span
                          style={{
                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            color: "#1a1a1a",
                          }}
                        >
                          {formatPrice(item.price * item.quantity, item.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer — Total + Checkout */}
          <div
            className="px-6 py-5"
            style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
          >
            {/* Total Row */}
            <div className="flex items-center justify-between mb-4">
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#1a1a1a",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#1a1a1a",
                }}
              >
                {totalDisplay}
              </span>
            </div>

            {/* Error Message if cart is empty */}
            {checkoutError && (
              <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
                <button
                  onClick={() => setCheckoutError(null)}
                  className="p-1 text-amber-700 hover:text-amber-900 cursor-pointer"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={items.length === 0}
              className={`w-full transition-all min-h-[48px] flex items-center justify-center font-bold ${
                items.length === 0
                  ? "bg-[#738077]/50 text-white/60 cursor-not-allowed"
                  : "bg-[#1b3022] hover:bg-[#264a33] text-white cursor-pointer active:scale-[0.99] shadow-md"
              }`}
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.05rem",
                padding: "14px 24px",
                borderRadius: "999px",
                border: "none",
                letterSpacing: "0.02em",
              }}
            >
              {items.length === 0 ? "Cart is Empty" : `Proceed to Checkout (${items.reduce((sum, i) => sum + i.quantity, 0)})`}
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in animation */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
