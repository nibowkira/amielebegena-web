/**
 * Amiele Begena — HTML Sanitization and Escaping Utility
 * Provides client-side protection against Cross-Site Scripting (XSS)
 * by escaping dynamic data before rendering in HTML templates.
 */

(function () {
    'use strict';

    const Sanitize = {
        /**
         * Escape HTML special characters in string values.
         * @param {*} value - The raw input to be escaped.
         * @returns {string} The HTML-safe escaped string.
         */
        escapeHtml(value) {
            if (value === null || value === undefined) {
                return '';
            }
            const str = String(value);
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }
    };

    // Export utility to window object
    window.AmieleSanitize = Sanitize;
})();
