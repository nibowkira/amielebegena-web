// Global Currency State
window.currentCurrency = 'ETB'; // Default to ETB as requested for local/diaspora
window.exchangeRates = {
    'USD': { rate: 1, symbol: '$' },
    'ETB': { rate: 120, symbol: 'ETB ' },
    'EUR': { rate: 0.92, symbol: '€' }
};

// XSS Protection — HTML escape utility alias
const esc = window.AmieleSanitize ? window.AmieleSanitize.escapeHtml : function(v) { return v == null ? '' : String(v); };

window.formatPrice = function(priceUSD) {
    const currency = exchangeRates[currentCurrency];
    const converted = priceUSD * currency.rate;
    return currency.symbol + converted.toLocaleString('en-US', {
        minimumFractionDigits: currentCurrency === 'ETB' ? 0 : 2,
        maximumFractionDigits: currentCurrency === 'ETB' ? 0 : 2
    });
};

window.getWhatsAppUrl = function(name, priceUSD) {
    const price = formatPrice(priceUSD);
    const message = `Hi, I want to order: ${name} - ${price}`;
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/251969189470?text=${encodedMessage}`;
};

const whatsappIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

window.updateStaticWhatsAppButtons = function() {
    document.querySelectorAll('.whatsapp-btn[data-product-name]').forEach(btn => {
        const name = btn.getAttribute('data-product-name');
        const price = parseFloat(btn.getAttribute('data-product-price'));
        btn.href = getWhatsAppUrl(name, price);
        if (!btn.innerHTML.includes('svg')) {
             btn.innerHTML = `${whatsappIcon} Order via WhatsApp`;
        }
    });
};

window.changeCurrency = function(currency) {
    if (exchangeRates[currency]) {
        currentCurrency = currency;
        
        if (typeof renderProducts === 'function' && document.getElementById('product-container')) {
            renderProducts(typeof activeCategory !== 'undefined' ? activeCategory : 'strings');
        }
        if (typeof updateCartUI === 'function') updateCartUI();
        if (typeof renderSavedItems === 'function' && document.getElementById('saved-items')) {
            renderSavedItems();
        }
        
        document.querySelectorAll('.dynamic-price').forEach(el => {
            const usd = parseFloat(el.getAttribute('data-usd'));
            if (!isNaN(usd)) {
                el.textContent = formatPrice(usd);
            }
        });
        
        document.querySelectorAll('.currency-switcher').forEach(select => {
            select.value = currency;
        });

        if (typeof updateStaticWhatsAppButtons === 'function') updateStaticWhatsAppButtons();
    }
};

// amielebegena Products — loaded dynamically from Supabase
// Fallback hardcoded products used if remote fetch fails
const FALLBACK_PRODUCTS = [
    // STRINGS
    {
        id: 1, name: "በገና (Begena)", desc: "Ten-Stringed Harp of David",
        price: 100.00, badge: "በገና", category: "strings",
        image: "image/photo_2025-10-01_07-26-53.jpg", aboutId: "begena", audio: "audio/begena.mp3"
    },
    {
        id: 2, name: "ክራር (Kirar)", desc: "Traditional 6-String Lyre",
        price: 70.83, badge: "ክራር", category: "strings",
        image: "image/photo_2025-02-27_17-33-38.jpg", aboutId: "kirar", audio: "audio/kirar.mp3"
    },
    {
        id: 3, name: "ማሲንቆ (Masinko)", desc: "One-Stringed Fiddle & Bow",
        price: 58.33, badge: "ማሲንቆ", category: "strings",
        image: "image/photo_2025-02-24_22-03-09.jpg", aboutId: "masinko", audio: "audio/masinko.mp3"
    },
    {
        id: 4, name: "Electric Kirar", desc: "Solid Wood Modern Variant",
        price: 83.33, badge: "ኤሌክትሪክ ክራር", category: "strings",
        image: "image/photo_2025-10-01_07-26-53.jpg", aboutId: "electric-kirar", audio: null
    },
    // PERCUSSION & WIND
    {
        id: 5, name: "ከበሮ (Kebero)", desc: "Double-Headed Ceremonial Drum",
        price: 115.00, badge: "ከበሮ", category: "percussion",
        image: "image/photo_2026-05-07_13-41-48.jpg", aboutId: "kebero", audio: null
    },
    {
        id: 6, name: "ዋሽንት (Washint)", desc: "End-Blown Bamboo Flute",
        price: 45.00, badge: "ዋሽንት", category: "wind",
        image: "image/photo_2025-10-01_07-26-53.jpg", aboutId: "washint", audio: null
    },
    {
        id: 7, name: "ጸናጽል (Sanasel)", desc: "Liturgical Sistrum",
        price: 75.00, badge: "ጸናጽል", category: "percussion",
        image: "image/photo_2026-05-08_11-10-17.jpg", aboutId: "sanasel", audio: null
    },
    {
        id: 8, name: "መለከት (Meleket)", desc: "Ancient Royal Trumpet",
        price: 130.00, badge: "መለከት", category: "wind",
        image: "image/photo_2025-10-01_07-26-53.jpg", aboutId: "meleket", audio: null
    },
    // ACCESSORIES & CRAFT
    {
        id: 9, name: "Awtar (አውታር)", desc: "Per Piece",
        price: 2.08, badge: "አውታር", category: "accessories",
        image: "image/image copy.png", aboutId: "tuning-pegs"
    },
    {
        id: 10, name: "Sheep-Gut Strings", desc: "Amber Resonance Set",
        price: 35.00, badge: "ገመድ", category: "accessories",
        image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=400&auto=format&fit=crop", aboutId: "sheep-gut-strings"
    },
    {
        id: 11, name: "Conditioning Wax", desc: "Highland Beeswax Blend",
        price: 18.00, badge: "ሰም", category: "accessories",
        image: "https://images.unsplash.com/photo-1542868725-783aafa0d5fe?q=80&w=400&auto=format&fit=crop", aboutId: "wax"
    },
    {
        id: 12, name: "Padded Registry Case", desc: "Reinforced Heritage Carry",
        price: 85.00, badge: "ኬዝ", category: "accessories",
        image: "https://images.unsplash.com/photo-1544943961-4ca3fbd72cc7?q=80&w=400&auto=format&fit=crop"
    },
    // BAGS (ቦርሳዎች)
    {
        id: 13, name: "Traditional Leather Bag", desc: "Hand-stitched Ethiopian Leather",
        price: 55.00, badge: "የቆዳ ቦርሳ", category: "bags",
        image: "image/kirar-bag-sehera.jpg"
    },
    {
        id: 14, name: "Woven Cotton Tote", desc: "Authentic Tibeb Pattern",
        price: 30.00, badge: "የጥጥ ቦርሳ", category: "bags",
        image: "image/kirar-bag-koda.jpg"
    },
    {
        id: 15, name: "Begena Transport Bag", desc: "Padded Canvas & Leather Trim",
        price: 75.00, badge: "የበገና ቦርሳ", category: "bags",
        image: "image/bag-begena.jpg"
    },
    {
        id: 16, name: "Kirar Shoulder Bag", desc: "Lightweight Woven Fabric",
        price: 40.00, badge: "የክራር ቦርሳ", category: "bags",
        image: "image/bag-begena-kirar.jpg"
    },
    // BOOKS (መጽሃፍት)
    {
        id: 17, name: "The Begena Lesson Book", desc: "A Comprehensive Guide to the Harp of David",
        price: 14.17, badge: "መጽሃፍ", category: "books",
        image: "image/begena_lesson_book.png", aboutId: "begena-book"
    },
    {
        id: 18, name: "Ethiopian Musical Heritage", desc: "The Sacred Sounds of Begena",
        price: 19.58, badge: "መጽሃፍ", category: "books",
        image: "image/ethiopian_music_heritage_book.png"
    }
];

// Live products array — populated from Supabase, falls back to FALLBACK_PRODUCTS
let products = [...FALLBACK_PRODUCTS];

/**
 * Attempt to load products from Supabase via ProductsService.
 * On success, replaces the products array. On failure, keeps the fallback.
 */
async function loadProductsFromSupabase() {
    if (!window.ProductsService) return;
    try {
        const remoteProducts = await window.ProductsService.getProducts();
        if (remoteProducts && remoteProducts.length > 0) {
            products = remoteProducts;
        }
    } catch (err) {
        console.warn('[Amiele] Failed to load products from Supabase, using fallback:', err.message);
    }
}

let cart = [];
let activeCategory = 'strings';

// DOM Elements
const productContainer = document.getElementById('product-container');
const cartButton = document.getElementById('cart-button');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalDisplay = document.getElementById('cart-total-display');
const cartCountBadges = document.querySelectorAll('.cart-count');


// Luxury Magnifier Logic
function initMagnifier() {
    // Disable on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.querySelectorAll('.artisan-photo-wrap').forEach(container => {
            container.classList.remove('magnifier-container');
            const lens = container.querySelector('.magnifier-lens');
            if (lens) lens.remove();
        });
        return;
    }

    const targets = document.querySelectorAll('.artisan-photo-wrap');
    
    targets.forEach(container => {
        // Prevent duplicate lenses
        if (container.querySelector('.magnifier-lens')) return;
        
        const lens = document.createElement('div');
        lens.className = 'magnifier-lens';
        container.appendChild(lens);
        container.classList.add('magnifier-container');
        
        const img = container.querySelector('img');
        const zoom = 3;

        container.addEventListener('mousemove', (e) => {
            lens.style.display = 'block';
            const rect = container.getBoundingClientRect();
            
            // Calculate position
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            
            // Center the lens
            lens.style.left = (x - lens.offsetWidth / 2) + 'px';
            lens.style.top = (y - lens.offsetHeight / 2) + 'px';
            
            // Set background
            lens.style.backgroundImage = `url('${img.src}')`;
            lens.style.backgroundSize = (img.width * zoom) + "px " + (img.height * zoom) + "px";
            
            // Move background
            let bx = (x * zoom) - (lens.offsetWidth / 2);
            let by = (y * zoom) - (lens.offsetHeight / 2);
            lens.style.backgroundPosition = `-${bx}px -${by}px`;
        });

        container.addEventListener('mouseleave', () => {
            lens.style.display = 'none';
        });
    });
}

// Render Products
function renderProducts(category) {
    if (!productContainer) return;
    productContainer.innerHTML = '';

    let filtered = category === 'all'
        ? [...products]
        : products.filter(p => p.category === category);

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect && sortSelect.value === 'alpha') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        // default by id / newest
        filtered.sort((a, b) => a.id - b.id);
    }

    filtered.forEach((product, index) => {
        const isSaved = localStorage.getItem('saved_' + product.id) === 'true';
        const card = document.createElement('div');
        card.className = 'product-card reveal animate-left';
        card.style.transitionDelay = `${(index % 4) * 0.1}s`; // Staggered entrance
        card.innerHTML = `
            <div class="product-image-wrap artisan-photo-wrap wood-shimmer">

                <button class="save-item-btn animate-scale ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); toggleSave('${esc(product.id)}', this)">
                    ${isSaved ? '♥' : '♡'}
                </button>
                <img src="${esc(product.image)}" alt="${esc(product.name)}" class="animate-fade">
            </div>
            <div class="product-info">
                <div class="product-info-row">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="product-title">${esc(product.name)}</span>
                        ${product.aboutId ? `<a href="about.html#${esc(product.aboutId)}" class="details-link" title="View Details">Details</a>` : ''}
                        ${product.audio ? `<button class="audio-btn animate-scale" onclick="playAudio('${esc(product.audio)}', this)" title="Play Audio Preview">▶</button>` : ''}
                    </div>
                    <span class="product-price">${formatPrice(product.price)}</span>
                </div>
                <div class="product-info-row">

                    <button class="add-to-cart-btn animate-scale" onclick="addToCart('${esc(product.id)}')">ADD TO CART</button>
                    <a href="${getWhatsAppUrl(product.name, product.price)}" target="_blank" class="whatsapp-btn animate-scale">
                        ${whatsappIcon} Order via WhatsApp
                    </a>
                </div>
            </div>
        `;
        productContainer.appendChild(card);
        // Trigger reveal for new items
        setTimeout(() => {
            card.classList.add('active', 'show-animation');
            card.querySelectorAll('.animate-fade, .animate-scale').forEach(el => el.classList.add('show-animation'));
        }, 50);
    });
    initMagnifier();
}

// Filter by category
window.filterByCategory = function(category, clickedEl) {
    activeCategory = category;
    // Update active state on all filter items
    document.querySelectorAll('.filter-list li').forEach(li => li.classList.remove('active'));
    if (clickedEl) clickedEl.classList.add('active');
    renderProducts(category);
};

// Sort Handler
window.handleSort = function() {
    renderProducts(activeCategory);
};

// Cart Logic
window.addToCart = function(productId) {
    const product = products.find(p => p.id == productId);
    const existingItem = cart.find(item => item.id == productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
    openCart();
};

window.removeFromCart = function(productId) {
    cart = cart.filter(item => item.id != productId);
    updateCartUI();
};

window.changeQuantity = function(productId, delta) {
    const item = cart.find(i => i.id == productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        updateCartUI();
    }
};

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty">Your cart is empty.</div>';
        cartTotalDisplay.textContent = formatPrice(0);
        updateCartCount(0);
        return;
    }

    let total = 0;
    let count = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        count += item.quantity;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${esc(item.image)}" alt="${esc(item.name)}">
            <div class="cart-item-info">
                <div class="cart-item-title">${esc(item.name)}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="changeQuantity('${esc(item.id)}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQuantity('${esc(item.id)}', 1)">+</button>
                    <button class="remove-btn" onclick="removeFromCart('${esc(item.id)}')">Remove</button>
                </div>
            </div>
            <div class="cart-item-line-price">
                ${formatPrice(item.price * item.quantity)}
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    cartTotalDisplay.textContent = formatPrice(total);
    updateCartCount(count);
}

function updateCartCount(num) {
    cartCountBadges.forEach(badge => {
        badge.textContent = num;
        badge.style.display = num > 0 ? 'flex' : 'none';
    });
}

// Drawer Toggles
function openCart() {
    cartDrawer.classList.remove('hidden');
    cartOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartDrawer.classList.add('hidden');
    cartOverlay.classList.add('hidden');
    document.body.style.overflow = '';
}

cartButton.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// Init
document.addEventListener('DOMContentLoaded', () => {
    // 1. Detect Referral parameters
    if (window.AmieleDB) {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
            localStorage.setItem('amiele_ref_code', refCode);
            try {
                AmieleDB.trackClick(refCode);
            } catch (e) {
                console.error(e);
            }
        }
    }

    if (productContainer) {
        // Render fallback immediately, then replace with Supabase data
        renderProducts('strings');
        loadProductsFromSupabase().then(() => {
            renderProducts(activeCategory);
        });
    }
    updateStaticWhatsAppButtons();
    updateCartCount(0);

    // Cart Checkout Handling
    const checkoutBtn = document.querySelector('.cart-drawer .btn-primary');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                alert('Your cart is empty. / ጋሪዎ ባዶ ነው።');
                return;
            }

            // Build Receipt Message
            let total = 0;
            let orderLines = [];
            let productNamesList = [];
            
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                orderLines.push(`• ${item.quantity}x ${item.name} (${formatPrice(item.price)} each) - Subtotal: ${formatPrice(itemTotal)}`);
                productNamesList.push(`${item.quantity}x ${item.name}`);
            });

            // Retrieve affiliate code
            const activeRef = localStorage.getItem('amiele_ref_code') || '';
            const refText = activeRef ? `\n🔗 Referral Code: ${activeRef}` : '';

            const userText = localStorage.getItem('userName') ? `\n👤 Customer Name: ${localStorage.getItem('userName')}` : '';
            const currencyText = `Selected Currency: ${currentCurrency}`;

            const orderId = '#HA-' + Math.floor(1000 + Math.random() * 9000);

            const messageText = `🔔 New Order from Amiele Begena Website!\n` +
                                `----------------------------------------\n` +
                                `Order Reference: ${orderId}${userText}${refText}\n` +
                                `💵 ${currencyText}\n` +
                                `----------------------------------------\n` +
                                `🛒 Order Items:\n` +
                                `${orderLines.join('\n')}\n` +
                                `----------------------------------------\n` +
                                `💰 Total Amount: ${formatPrice(total)}\n` +
                                `----------------------------------------\n` +
                                `Please confirm my order and let me know the payment/delivery details. Thank you! / እናመሰግናለን!`;

            // Log sale in legacy local DB if it exists (for compatibility)
            if (window.AmieleDB && activeRef) {
                try {
                    const totalETB = total * 120;
                    window.AmieleDB.trackSale(activeRef, orderId, totalETB, productNamesList.join(', '));
                } catch (e) {
                    console.error('Error attributing sale: ', e);
                }
            }

            // Log orders in Supabase and trigger redirect
            if (window.OrdersService) {
                (async () => {
                    checkoutBtn.disabled = true;
                    const originalText = checkoutBtn.textContent;
                    checkoutBtn.textContent = 'LOGGING ORDER...';

                    try {
                        const currentUser = await window.getCurrentUser();
                        const customerId = currentUser ? currentUser.id : null;
                        
                        await window.OrdersService.createOrdersFromCart(
                            cart,
                            customerId,
                            activeRef,
                            `Order Ref: ${orderId} (WhatsApp Checkout)`
                        );
                    } catch (err) {
                        console.error('[Amiele:Orders] Failed to log order details to Supabase:', err);
                    } finally {
                        localStorage.removeItem('amiele_ref_code');
                        
                        const encodedMessage = encodeURIComponent(messageText);
                        const whatsappUrl = `https://wa.me/251969189470?text=${encodedMessage}`;
                        
                        // Open WhatsApp
                        window.open(whatsappUrl, '_blank');
                        
                        // Reset cart UI
                        cart = [];
                        updateCartUI();
                        closeCart();
                        
                        checkoutBtn.disabled = false;
                        checkoutBtn.textContent = originalText;
                    }
                })();
            } else {
                const encodedMessage = encodeURIComponent(messageText);
                const whatsappUrl = `https://wa.me/251969189470?text=${encodedMessage}`;
                window.open(whatsappUrl, '_blank');
                
                cart = [];
                updateCartUI();
                closeCart();
            }
        });
    }

    // Auth Submission Handling
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('login-email');
            const passInput = document.getElementById('login-pass');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (!emailInput || !passInput || !submitBtn) return;

            const email = emailInput.value.trim();
            const password = passInput.value;

            // Loading state
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'LOGGING IN...';

            try {
                await window.AuthService.signIn(email, password);
                if (typeof showToast === 'function') {
                    showToast('Login successful! Redirecting...', 'success');
                }
                setTimeout(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const dest = urlParams.get('redirect') || 'account.html';
                    window.location.href = decodeURIComponent(dest);
                }, 1000);
            } catch (err) {
                console.error(err);
                if (typeof showToast === 'function') {
                    showToast(err.message || 'An unexpected error occurred during login.', 'error');
                } else {
                    alert(err.message || 'An unexpected error occurred.');
                }
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('reg-name');
            const emailInput = document.getElementById('reg-email');
            const passInput = document.getElementById('reg-pass');
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            if (!nameInput || !emailInput || !passInput || !submitBtn) return;

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passInput.value;

            if (password.length < 6) {
                if (typeof showToast === 'function') {
                    showToast('Password must be at least 6 characters.', 'warning');
                } else {
                    alert('Password must be at least 6 characters.');
                }
                return;
            }

            // Loading state
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'SIGNING UP...';

            try {
                await window.AuthService.signUp(name, email, password);
                if (typeof showToast === 'function') {
                    showToast('Registration successful! Redirecting...', 'success');
                }
                setTimeout(() => {
                    window.location.href = 'account.html';
                }, 1000);
            } catch (err) {
                console.error(err);
                if (typeof showToast === 'function') {
                    showToast(err.message || 'An unexpected error occurred during signup.', 'error');
                } else {
                    alert(err.message || 'An unexpected error occurred.');
                }
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    // Logout Handling
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await window.AuthService.signOut();
                if (typeof showToast === 'function') {
                    showToast('Logged out successfully.', 'info');
                }
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 800);
            } catch (err) {
                console.error(err);
                window.location.href = 'login.html';
            }
        });
    }

    // Intercept protected links
    const protectedLinks = document.querySelectorAll('a[href="account.html"]');
    protectedLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            const isLoggedIn = await window.isAuthenticated();
            if (!isLoggedIn) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    });

    // Protect account.html directly
    if (window.location.pathname.endsWith('account.html')) {
        window.isAuthenticated().then(isLoggedIn => {
            if (!isLoggedIn) {
                window.location.href = 'login.html';
            } else {
                window.getCurrentUser().then(user => {
                    if (user && user.name) {
                        const nameFields = document.querySelectorAll('input[type="text"]');
                        if (nameFields.length > 0) nameFields[0].value = user.name;
                    }
                    if (typeof renderSavedItems === 'function') renderSavedItems();
                });
            }
        });
    }

    // Scroll Animations Observer
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Stop observing once revealed
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });
    
    initMagnifier();

    // Mobile Navigation Toggle
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavClose = document.getElementById('mobile-nav-close');

    function openMobileNav() {
        if (mobileNav) mobileNav.classList.add('active');
        if (mobileNavOverlay) mobileNavOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileNav() {
        if (mobileNav) mobileNav.classList.remove('active');
        if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobileNav);
    if (mobileNavClose) mobileNavClose.addEventListener('click', closeMobileNav);
    if (mobileNavOverlay) mobileNavOverlay.addEventListener('click', closeMobileNav);
    
    // Premium Features Logic
    const navbar = document.querySelector('.navbar');
    const heroContent = document.querySelector('.hero-content');

    // 3. Navbar Glassmorphism on Scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }

        // 4. Hero Parallax Effect
        if (heroContent && window.scrollY < 800) {
            const scrollVal = window.scrollY;
            heroContent.style.transform = `translateY(${scrollVal * 0.3}px)`;
            heroContent.style.opacity = 1 - (scrollVal / 600);
        }
    });
    
    // Close mobile nav when a navigation link is clicked
    const mobileNavLinks = mobileNav ? mobileNav.querySelectorAll('a') : [];
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', closeMobileNav);
    });
});

// Auth Toggle Logic
window.switchAuthTab = function(tabName) {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    if (!loginTab) return;

    if (tabName === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
};

// Account Tab Logic
window.switchAccountTab = function(tabName) {
    const tabs = ['details', 'orders', 'saved', 'impact', 'shipping'];
    tabs.forEach(t => {
        const navItem = document.getElementById('nav-' + t);
        const section = document.getElementById('sec-' + t);
        if (navItem && section) {
            if (t === tabName) {
                navItem.classList.add('active');
                section.classList.add('active');
            } else {
                navItem.classList.remove('active');
                section.classList.remove('active');
            }
        }
    });
};

// Save Item Logic
window.toggleSave = function(productId, btn) {
    const key = 'saved_' + productId;
    const isSaved = localStorage.getItem(key) === 'true';
    if (isSaved) {
        localStorage.removeItem(key);
        btn.classList.remove('saved');
        btn.innerHTML = '♡';
    } else {
        localStorage.setItem(key, 'true');
        btn.classList.add('saved');
        btn.innerHTML = '♥';
    }
    renderSavedItems();
};

// Render Saved Items on Account Page
function renderSavedItems() {
    const container = document.getElementById('saved-items-container');
    if (!container) return;

    const savedProducts = products.filter(p => localStorage.getItem('saved_' + p.id) === 'true');
    
    if (savedProducts.length === 0) {
        container.innerHTML = '<p style="color: #6a6e6b;">You haven\'t saved any archival items yet.</p>';
        return;
    }

    container.innerHTML = '';
    savedProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image-wrap artisan-photo-wrap">

                <button class="save-item-btn saved" onclick="event.stopPropagation(); unsaveFromAccount(${esc(product.id)}, this)" title="Remove from saved">♥</button>
                <img src="${esc(product.image)}" alt="${esc(product.name)}">
            </div>
            <div class="product-info">
                <div class="product-info-row">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="product-title">${esc(product.name)}</span>
                        ${product.aboutId ? `<a href="about.html#${esc(product.aboutId)}" class="details-link" title="View Details">Details</a>` : ''}
                        ${product.audio ? `<button class="audio-btn" onclick="playAudio('${esc(product.audio)}', this)" title="Play Audio Preview">▶</button>` : ''}
                    </div>
                    <span class="product-price">${formatPrice(product.price)}</span>
                </div>
                <div class="product-info-row">

                    <button class="add-to-cart-btn" onclick="addToCart(${esc(product.id)})">ADD TO CART</button>
                    <a href="${getWhatsAppUrl(product.name, product.price)}" target="_blank" class="whatsapp-btn">
                        ${whatsappIcon} Order via WhatsApp
                    </a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}


window.unsaveFromAccount = function(productId, btn) {
    localStorage.removeItem('saved_' + productId);
    renderSavedItems();
};

let currentAudio = null;
let currentAudioBtn = null;

window.playAudio = function(url, btn) {
    // If the same audio is already playing, just pause it and return
    if (currentAudio && currentAudio.src.includes(url)) {
        currentAudio.pause();
        if (currentAudioBtn) {
            currentAudioBtn.textContent = '▶';
            currentAudioBtn.classList.remove('playing');
        }
        currentAudio = null;
        currentAudioBtn = null;
        return;
    }

    // If a different audio is playing, stop it first
    if (currentAudio) {
        currentAudio.pause();
        if (currentAudioBtn) {
            currentAudioBtn.textContent = '▶';
            currentAudioBtn.classList.remove('playing');
        }
    }

    // Play new audio
    currentAudio = new Audio(url);
    currentAudio.play().catch(e => {
        console.error('Audio playback failed (maybe no file yet):', e);
        btn.textContent = '▶';
        btn.classList.remove('playing');
        currentAudio = null;
        currentAudioBtn = null;
    });
    
    btn.textContent = '⏸';
    btn.classList.add('playing');
    currentAudioBtn = btn;

    currentAudio.addEventListener('ended', () => {
        btn.textContent = '▶';
        btn.classList.remove('playing');
        currentAudio = null;
        currentAudioBtn = null;
    });
};

// ==========================================
// CUSTOMER REVIEW FORM LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const starInput = document.getElementById('star-rating-input');
    if (!starInput) return; // Only run on pages with the review form

    const stars = starInput.querySelectorAll('.star');
    const ratingHiddenInput = document.getElementById('selected-rating');
    const reviewForm = document.getElementById('customer-review-form');
    const feedbackDiv = document.getElementById('form-feedback');

    /**
     * STAR RATING INTERACTION
     * Handles clicking, hovering, and resetting stars.
     */
    stars.forEach(star => {
        // Handle Click (Set Rating)
        star.addEventListener('click', () => {
            const rating = star.getAttribute('data-value');
            ratingHiddenInput.value = rating;
            updateStars(rating);
        });

        // Handle Hover (Preview Rating)
        star.addEventListener('mouseover', () => {
            const rating = star.getAttribute('data-value');
            updateStars(rating);
        });

        // Handle Mouse Out (Reset to selected rating)
        star.addEventListener('mouseout', () => {
            const currentRating = ratingHiddenInput.value;
            updateStars(currentRating);
        });
    });

    /**
     * Updates the visual state of stars based on a rating value.
     * @param {number} rating - The number of stars to highlight.
     */
    function updateStars(rating) {
        stars.forEach(star => {
            const value = star.getAttribute('data-value');
            if (value <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    /**
     * FORM SUBMISSION HANDLER
     * Validates data and redirects to WhatsApp.
     */
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get Form Values
        const name = document.getElementById('review-name').value.trim();
        const rating = ratingHiddenInput.value;
        const instrument = document.getElementById('review-instrument').value;
        const message = document.getElementById('review-message').value.trim();

        // Validation Check
        if (!name || rating === "0" || !instrument || !message) {
            showFeedback('Please fill all required fields and provide a star rating. / እባክዎን ሁሉንም አስፈላጊ መስኮች ይሙሉ እና ኮከቦችን ይምረጡ።', 'error');
            return;
        }

        // Create Star Emoji String (e.g., ★★★★★)
        const starEmoji = "★".repeat(rating) + "☆".repeat(5 - rating);
        
        // WhatsApp Integration Details
        const whatsappNumber = "251969189470";
        const text = `⭐ New Review from Amiele Begena Website!\n\nName: ${name}\nInstrument: ${instrument}\nRating: [${starEmoji}]\n\nReview: ${message}`;
        const encodedText = encodeURIComponent(text);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedText}`;

        // Show Success Message and 'Thank You' in Amharic
        showFeedback('Thank you for your review! Redirecting to WhatsApp... / አመሰግናለሁ! ወደ ዋትስአፕ እየወሰድንዎት ነው...', 'success');
        
        // Open WhatsApp in a new tab after a brief delay for the user to see the success message
        setTimeout(() => {
            window.open(whatsappUrl, '_blank');
            
            // Reset form for next time
            reviewForm.reset();
            updateStars(0);
            ratingHiddenInput.value = 0;
            feedbackDiv.classList.add('hidden');
        }, 2000);
    });

    /**
     * Displays success or error feedback to the user.
     * @param {string} msg - The message text.
     * @param {string} type - 'success' or 'error'.
     */
    function showFeedback(msg, type) {
        feedbackDiv.textContent = msg;
        feedbackDiv.className = `form-feedback ${type}`;
        feedbackDiv.classList.remove('hidden');
        
        // Auto-hide errors after 5 seconds
        if (type === 'error') {
            setTimeout(() => {
                feedbackDiv.classList.add('hidden');
            }, 5000);
        }
    }
});

// ==========================================
// TESTIMONIALS SLIDER LOGIC (TRUE INFINITE)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const track = document.querySelector('.testimonials-track');
    let cards = Array.from(document.querySelectorAll('.testimonial-card'));
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const dotsContainer = document.querySelector('.slider-dots');
    const sliderWrapper = document.querySelector('.testimonials-slider-wrapper');

    if (!track || cards.length === 0) return;

    const originalCount = cards.length;
    let currentIndex = 0;
    let cardsToShow = getCardsToShow();
    let autoSlideInterval;

    // Clone cards for infinite loop
    function setupClones() {
        // Remove old clones if any
        const clones = track.querySelectorAll('.clone');
        clones.forEach(c => c.remove());

        // Clone first and last sets
        const firstClones = cards.slice(0, cardsToShow).map(card => {
            const clone = card.cloneNode(true);
            clone.classList.add('clone');
            return clone;
        });
        const lastClones = cards.slice(-cardsToShow).map(card => {
            const clone = card.cloneNode(true);
            clone.classList.add('clone');
            return clone;
        });

        firstClones.forEach(clone => track.appendChild(clone));
        lastClones.reverse().forEach(clone => track.insertBefore(clone, track.firstChild));
        
        // Initial position (offset by the prepended clones)
        currentIndex = cardsToShow;
        updateSlider(false); // No transition for initial setup
    }

    function getCardsToShow() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1200) return 2;
        return 3;
    }

    function initDots() {
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';
        for (let i = 0; i < originalCount; i++) {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                currentIndex = i + cardsToShow;
                updateSlider();
                resetAutoSlide();
            });
            dotsContainer.appendChild(dot);
        }
    }

    function updateSlider(transition = true) {
        const style = window.getComputedStyle(track);
        const gap = parseFloat(style.gap) || 0;
        const cardWidth = cards[0].getBoundingClientRect().width + gap;
        
        track.style.transition = transition ? 'transform 0.7s cubic-bezier(0.165, 0.84, 0.44, 1)' : 'none';
        track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
        
        // Update dots logic
        const dots = document.querySelectorAll('.dot');
        const activeDotIndex = (currentIndex - cardsToShow + originalCount) % originalCount;
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === activeDotIndex);
        });
    }

    // Handle the "instant jump" for infinite effect
    track.addEventListener('transitionend', () => {
        if (currentIndex >= originalCount + cardsToShow) {
            currentIndex = cardsToShow;
            updateSlider(false);
        }
        if (currentIndex <= 0) {
            currentIndex = originalCount;
            updateSlider(false);
        }
    });

    function nextSlide() {
        currentIndex++;
        updateSlider();
    }

    function prevSlide() {
        currentIndex--;
        updateSlider();
    }

    function startAutoSlide() {
        stopAutoSlide();
        autoSlideInterval = setInterval(nextSlide, 4000);
    }

    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }

    function resetAutoSlide() {
        stopAutoSlide();
        startAutoSlide();
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => { nextSlide(); resetAutoSlide(); });
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => { prevSlide(); resetAutoSlide(); });
    }

    if (sliderWrapper) {
        sliderWrapper.addEventListener('mouseenter', stopAutoSlide);
        sliderWrapper.addEventListener('mouseleave', startAutoSlide);
    }

    window.addEventListener('resize', () => {
        const newCardsToShow = getCardsToShow();
        if (newCardsToShow !== cardsToShow) {
            cardsToShow = newCardsToShow;
            setupClones();
            initDots();
        }
    });

    setupClones();
    initDots();
    startAutoSlide();

    // Swipe Support
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; stopAutoSlide(); }, { passive: true });
    track.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) nextSlide();
        else if (touchEndX - touchStartX > 50) prevSlide();
        startAutoSlide();
    }, { passive: true });

    // Newsletter Subscription Logic
    const newsletterBtn = document.getElementById('newsletter-btn');
    const newsletterEmail = document.getElementById('newsletter-email');

    if (newsletterBtn && newsletterEmail) {
        newsletterBtn.addEventListener('click', function() {
            const email = newsletterEmail.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address. / እባክዎን ትክክለኛ ኢሜይል ያስገቡ።');
                return;
            }

            // Pre-fill WhatsApp message
            const phone = "251969189470";
            const message = encodeURIComponent(`Hi, I want to subscribe to Amiele Begena newsletter. My email: ${email}`);
            const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

            // Open WhatsApp
            window.open(whatsappUrl, '_blank');

            // Show thank you and clear input
            newsletterEmail.value = '';
            alert('Thank you for subscribing! / አመሰግናለሁ!');
        });
    }
});
