/**
 * checkout.js — Cart "Checkout" handler for Amiele Begena
 * Loaded AFTER script.js. Provides:
 *   - window.handleCartCheckout()  (single entry point for the cart Checkout button)
 *
 * Order submission is NOT re-created here. handleCartCheckout reuses the existing
 * server-backed flow (window.openWhatsAppOrderModal, defined in script.js), which:
 *   - builds the order via OrdersService.createOrdersFromCart -> create_guest_order RPC
 *   - uses the DB-composed WhatsApp order message with current currency/quantities
 *     and referral attribution
 * No second checkout system, no client-side order message generation.
 */
(function () {
  "use strict";

  var EMTPY = "Your cart is empty. / ጋሪዎ ባዶ ነው።";

  function showEmptyCartMessage() {
    if (typeof window.showToast === "function") {
      window.showToast(EMTPY, "warning");
    } else {
      window.alert(EMTPY);
    }
  }

  function cartHasItems() {
    try {
      return document.querySelectorAll("#cart-items .cart-item").length > 0;
    } catch (err) {
      return true; // if we can't read the cart DOM, don't block checkout
    }
  }

  /* ── handleCartCheckout: single checkout entry point ─────── */
  window.handleCartCheckout = function () {
    try {
      if (cartHasItems()) {
        if (typeof window.closeCart === "function") {
          window.closeCart();
        }
        if (typeof window.openWhatsAppOrderModal === "function") {
          window.openWhatsAppOrderModal(true);
        } else {
          window.alert("Order processing is unavailable. Please refresh and try again. / ማዘዝ አልተቻለም። እባክዎ ያድሱ።");
        }
      } else {
        showEmptyCartMessage();
      }
    } catch (err) {
      console.error("[Amiele:Checkout] handleCartCheckout failed:", err);
      window.alert("Could not start checkout. Please refresh and try again. / ማዘዝ አልተቻለም። እባክዎ ያድሱ።");
    }
  };

  /* Defensive: the button must preserve pointer-interaction defaults.
     A JavaScript error elsewhere must never silently leave the button dead. */
  try {
    var btn = document.getElementById("cart-checkout-btn");
    if (btn) {
      btn.style.pointerEvents = "auto";
      btn.style.cursor = "pointer";
    }
  } catch (e) {}

  console.log("[Amiele:Checkout] checkout.js loaded successfully");
})();