/**
 * Amiele Begena - Central Configuration
 * Shared constants, exchange rates, and app configuration.
 * Default rates act as an offline fallback; script.js refreshes
 * window.exchangeRates with a live rate at runtime when online.
 */

window.AmieleConfig = {
    CURRENCIES: {
        'USD': { rate: 1, symbol: '$' },
        'ETB': { rate: 120, symbol: 'ETB ' },
        'EUR': { rate: 0.92, symbol: '€' }
    },
    DEFAULT_CURRENCY: 'ETB',
    EXCHANGE_RATE_ETB_USD: 120
};

// Keep the runtime rates object in sync with this config when both are present.
// This guarantees a single source of truth whether script.js or config.js loads first.
(function syncRates() {
    try {
        if (window.AmieleConfig && window.exchangeRates) {
            window.exchangeRates = window.exchangeRates || {};
            Object.keys(window.AmieleConfig.CURRENCIES).forEach(code => {
                const c = window.AmieleConfig.CURRENCIES[code];
                if (!window.exchangeRates[code]) {
                    window.exchangeRates[code] = { rate: c.rate, symbol: c.symbol };
                } else {
                    window.exchangeRates[code].symbol = c.symbol;
                }
            });
        }
    } catch (e) {
        console.warn('[Amiele:Config] Rate sync skipped:', e);
    }
})();
