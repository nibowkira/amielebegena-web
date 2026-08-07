(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", async function () {
        var grid = document.getElementById("rated-product-grid");
        if (!grid) return;

        if (!window.ProductsService || typeof window.ProductsService.getProducts !== "function") {
            console.warn("[Amiele:Homepage] ProductsService not available.");
            return;
        }

        var products;
        try {
            products = await window.ProductsService.getProducts();
        } catch (err) {
            console.warn("[Amiele:Homepage] Failed to load products:", err && err.message ? err.message : err);
            return;
        }

        if (!products || !products.length) return;

        function bySortOrder(a, b) {
            return (a.sort_order || 0) - (b.sort_order || 0);
        }

        var featured = products.filter(function (p) { return p.featured; });
        var ordered = (featured.length ? featured : products).sort(bySortOrder);

        var escFn = window.AmieleSanitize && typeof window.AmieleSanitize.escapeHtml === "function"
            ? window.AmieleSanitize.escapeHtml
            : function (v) { return v == null ? "" : String(v); };

        ordered.forEach(function (product, index) {
            var name = escFn(product.name);
            var alt = escFn(product.alt_text || product.name);
            var desc = escFn(product.desc);
            var price = typeof product.price === "number" && !isNaN(product.price) ? product.price : 0;
            var imgSrc = escFn(product.image || "image/photo_2025-10-01_07-26-53.jpg");

            var card = document.createElement("div");
            card.className = "rated-card reveal animate-left";
            card.style.textAlign = "center";
            if (index > 0) card.style.transitionDelay = index * 0.1 + "s";

            card.innerHTML =
                '<div class="artisan-photo-wrap wood-shimmer" style="height: 350px; background: var(--parchment); border-radius: 12px; margin-bottom: 1.5rem;">' +
                    '<img src="' + imgSrc + '" alt="' + alt + '" class="animate-fade" style="max-height: 100%; width: auto; object-fit: contain; padding: 2rem;" loading="lazy" title="' + name + '"' + (index === 0 ? ' fetchpriority="high"' : "") + ">" +
                "</div>" +
                '<div class="stars" style="color: #d4af37; font-size: 1.2rem; margin-bottom: 0.5rem; letter-spacing: 2px;">★★★★★</div>' +
                '<h3 class="animate-bottom" style="font-family: \'Benaiah\', sans-serif; font-size: 1.5rem; margin-bottom: 0.5rem;">' + name + "</h3>" +
                '<p style="color: #6a6e6b; font-size: 0.95rem; margin-bottom: 1rem;">' + desc + "</p>" +
                '<span class="dynamic-price" data-usd="' + price + '" style="font-weight: 700; font-size: 1.2rem; color: var(--dark-green);">' + (window.formatPrice ? window.formatPrice(price) : price) + "</span>" +
                '<a href="#" class="whatsapp-btn animate-scale" data-product-name="' + name + '" data-product-price="' + price + '">' +
                    "Order via WhatsApp" +
                "</a>";

            grid.appendChild(card);

            setTimeout(function () {
                card.classList.add("active", "show-animation");
                card.querySelectorAll(".animate-fade, .animate-scale, .animate-bottom").forEach(function (el) {
                    el.classList.add("show-animation");
                });
            }, 50);
        });

        if (typeof window.updateStaticWhatsAppButtons === "function") {
            window.updateStaticWhatsAppButtons();
        }
    });
})();
