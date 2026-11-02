"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, Product } from "../lib/types";
import { recordAffiliateClick } from "../lib/api";

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotalUSD: number;
  referralCode: string | null;
  isCheckoutModalOpen: boolean;
  openCheckoutModal: () => void;
  closeCheckoutModal: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Initialize cart and capture referral code from URL
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("amiele_cart");
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }

      // Check URL parameters for ?ref=... or ?aff=...
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get("ref") || urlParams.get("aff");
      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        setReferralCode(cleanRef);
        localStorage.setItem("amiele_referral_code", cleanRef);
        recordAffiliateClick(cleanRef, window.location.pathname);
      } else {
        const savedRef = localStorage.getItem("amiele_referral_code");
        if (savedRef) setReferralCode(savedRef);
      }
    } catch (e) {
      console.warn("Storage access failed:", e);
    }
  }, []);

  // Save cart changes
  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem("amiele_cart", JSON.stringify(newItems));
    } catch (e) {}
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const addItem = (product: Product, quantity: number = 1) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    const coverImage = product.images?.[0]?.storagePath || "/image/photo_2025-10-01_07-26-53.jpg";
    const priceNum = typeof product.price === "string" ? parseFloat(product.price) : product.price;

    let updated: CartItem[];
    if (existingIndex > -1) {
      updated = [...items];
      updated[existingIndex].quantity += quantity;
    } else {
      updated = [
        ...items,
        {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: priceNum || 0,
          currency: product.currency || "USD",
          image: coverImage,
          quantity: quantity,
          category: product.category,
        },
      ];
    }
    saveCart(updated);
    openCart();
  };

  const removeItem = (productId: string) => {
    const updated = items.filter((i) => i.productId !== productId);
    saveCart(updated);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    const updated = items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const totalCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

  const subtotalUSD = items.reduce((acc, curr) => {
    return acc + curr.price * curr.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        subtotalUSD,
        referralCode,
        isCheckoutModalOpen,
        openCheckoutModal: () => {
          closeCart();
          setIsCheckoutModalOpen(true);
        },
        closeCheckoutModal: () => setIsCheckoutModalOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
