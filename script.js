// Global Currency State
window.currentCurrency = 'ETB'; 
window.exchangeRates = {
    'USD': { rate: 1, symbol: '$' },
    'ETB': { rate: 120, symbol: 'ETB ' },
    'EUR': { rate: 0.92, symbol: '€' }
};

window.formatPrice = function(priceUSD) {
    const currency = window.exchangeRates[currentCurrency];
    const converted = priceUSD * currency.rate;
    return currency.symbol + converted.toLocaleString('en-US', {
        minimumFractionDigits: currentCurrency === 'ETB' ? 0 : 2,
        maximumFractionDigits: currentCurrency === 'ETB' ? 0 : 2
    });
};

const API_URL = '/api';


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
    }
};

// amielebegena Products
const products = [
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
        image: "image/photo_2025-10-01_07-26-53.jpg", aboutId: "electric-kirar", audio: "audio/kirar_electric.mp3"
    },
    // PERCUSSION & WIND
    {
        id: 5, name: "ከበሮ (Kebero)", desc: "Double-Headed Ceremonial Drum",
        price: 115.00, badge: "ከበሮ", category: "percussion",
        image: "image/photo_2026-05-07_13-41-48.jpg", aboutId: "kebero", audio: "audio/kebero.mp3"
    },
    {
        id: 6, name: "ዋሽንት (Washint)", desc: "End-Blown Bamboo Flute",
        price: 45.00, badge: "ዋሽንት", category: "wind",
        image: "washint_flute_v2_1776883145689.png", aboutId: "washint", audio: "audio/washint.mp3"
    },
    {
        id: 7, name: "ጸናጽል (Sanasel)", desc: "Liturgical Sistrum",
        price: 75.00, badge: "ጸናጽል", category: "percussion",
        image: "image/photo_2026-05-08_11-10-17.jpg", aboutId: "sanasel", audio: "audio/sanasel.mp3"
    },
    {
        id: 8, name: "መለከት (Meleket)", desc: "Ancient Royal Trumpet",
        price: 130.00, badge: "መለከት", category: "wind",
        image: "meleket_trumpet_v2_1776883415170.png", aboutId: "meleket", audio: "audio/meleket.mp3"
    },
    // ACCESSORIES & CRAFT
    {
        id: 9, name: "Artisan Tuning Pegs", desc: "Rosewood & Ebony Set",
        price: 24.00, badge: "ማስተካከያ", category: "accessories",
        image: "https://images.unsplash.com/photo-1550985543-f47f38aeee65?q=80&w=400&auto=format&fit=crop", aboutId: "tuning-pegs"
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
    }
];

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
    const targets = document.querySelectorAll('.artisan-photo-wrap');
    
    targets.forEach(container => {
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
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            
            lens.style.left = (x - lens.offsetWidth / 2) + 'px';
            lens.style.top = (y - lens.offsetHeight / 2) + 'px';
            
            lens.style.backgroundImage = `url('${img.src}')`;
            lens.style.backgroundSize = (img.width * zoom) + "px " + (img.height * zoom) + "px";
            
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
        filtered.sort((a, b) => a.id - b.id);
    }

    filtered.forEach(product => {
        const isSaved = localStorage.getItem('saved_' + product.id) === 'true';
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image-wrap artisan-photo-wrap">
                <button class="save-item-btn ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); toggleSave(${product.id}, this)">
                    ${isSaved ? '♥' : '♡'}
                </button>
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <div class="product-info-row">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="product-title">${product.name}</span>
                        ${product.aboutId ? `<a href="about.html#${product.aboutId}" class="details-link" title="View Details">Details</a>` : ''}
                        ${product.audio ? `<button class="audio-btn" onclick="playAudio('${product.audio}', this)" title="Play Audio Preview">▶</button>` : ''}
                    </div>
                    <span class="product-price">${formatPrice(product.price)}</span>
                </div>
                <div class="product-info-row">
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">ADD TO CART</button>
                </div>
            </div>
        `;
        productContainer.appendChild(card);
    });
    initMagnifier();
}

// Filter by category
window.filterByCategory = function(category, clickedEl) {
    activeCategory = category;
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
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
    openCart();
};

window.removeFromCart = function(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
};

window.changeQuantity = function(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        updateCartUI();
    }
};

function updateCartUI() {
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty">Your cart is empty.</div>';
        if (cartTotalDisplay) cartTotalDisplay.textContent = formatPrice(0);
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
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
                </div>
            </div>
            <div class="cart-item-line-price">
                ${formatPrice(item.price * item.quantity)}
            </div>
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    if (cartTotalDisplay) cartTotalDisplay.textContent = formatPrice(total);
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
    if (cartDrawer) cartDrawer.classList.remove('hidden');
    if (cartOverlay) cartOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    if (cartDrawer) cartDrawer.classList.add('hidden');
    if (cartOverlay) cartOverlay.classList.add('hidden');
    document.body.style.overflow = '';
}

if (cartButton) cartButton.addEventListener('click', openCart);
if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (productContainer) {
        renderProducts('strings');
    }
    updateCartCount(0);

    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-pass').value;

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('userName', data.user.name);
                    window.location.href = 'account.html';
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (err) {
                console.error(err);
                alert('Connection error. Is the server running?');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-pass').value;

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();
                if (response.ok) {
                    alert('Registration successful! Please login.');
                    window.switchAuthTab('login');
                } else {
                    alert(data.message || 'Registration failed');
                }
            } catch (err) {
                console.error(err);
                alert('Connection error');
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userName');
            window.location.href = 'login.html';
        });
    }

    const protectedLinks = document.querySelectorAll('.auth-protected-link, a[href="account.html"]');
    protectedLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    });

    if (window.location.pathname.endsWith('account.html')) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
        } else {
            // Fetch latest user info from server
            fetch(`${API_URL}/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(user => {
                if (user.id) {
                    const nameFields = document.querySelectorAll('.user-display-name');
                    nameFields.forEach(f => f.textContent = user.name);
                    
                    const nameInput = document.getElementById('account-name-input');
                    if (nameInput) nameInput.value = user.name;
                    const emailInput = document.getElementById('account-email-input');
                    if (emailInput) emailInput.value = user.email;
                } else {
                    // Token likely invalid
                    localStorage.removeItem('authToken');
                    window.location.href = 'login.html';
                }
            })
            .catch(() => {
                const userName = localStorage.getItem('userName');
                if (userName) {
                    const nameFields = document.querySelectorAll('.user-display-name');
                    nameFields.forEach(f => f.textContent = userName);
                }
            });
            renderSavedItems();
        }
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
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });
    
    initMagnifier();

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
    
    const mobileNavLinks = mobileNav ? mobileNav.querySelectorAll('a') : [];
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', closeMobileNav);
    });
});

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
                <button class="save-item-btn saved" onclick="event.stopPropagation(); unsaveFromAccount(${product.id}, this)" title="Remove from saved">♥</button>
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <div class="product-info-row">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="product-title">${product.name}</span>
                        ${product.aboutId ? `<a href="about.html#${product.aboutId}" class="details-link" title="View Details">Details</a>` : ''}
                        ${product.audio ? `<button class="audio-btn" onclick="playAudio('${product.audio}', this)" title="Play Audio Preview">▶</button>` : ''}
                    </div>
                    <span class="product-price">${formatPrice(product.price)}</span>
                </div>
                <div class="product-info-row">
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">ADD TO CART</button>
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

    if (currentAudio) {
        currentAudio.pause();
        if (currentAudioBtn) {
            currentAudioBtn.textContent = '▶';
            currentAudioBtn.classList.remove('playing');
        }
    }

    currentAudio = new Audio(url);
    currentAudio.play().catch(e => console.log('Audio playback failed:', e));
    
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
