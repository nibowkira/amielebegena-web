/**
 * Amiele Begena - Parallax Scrolling Logic
 * 
 * This script implements a high-performance parallax effect for the hero section.
 * It works by listening to the scroll event and updating a CSS variable that
 * controls the vertical position of the background image.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Select the hero section element
    const hero = document.querySelector('.hero-section');
    
    // If the hero section doesn't exist on this page, exit early to save resources
    if (!hero) return;

    // State variables for smooth animation
    let lastScrollY = window.pageYOffset;
    let ticking = false;

    /**
     * The core animation function.
     * This calculates the offset based on scroll position and updates the CSS.
     */
    function updateParallax() {
        // Get the current scroll position
        const scrolled = window.pageYOffset;
        
        // PARALLAX MATH:
        // We want the background to move slower than the content.
        // A speed factor of 0.3 means the background moves at 30% of the scroll speed.
        // This creates a sense of depth (the background appears further away).
        const speed = 0.3;
        const offset = scrolled * speed;

        // We update a CSS Custom Property (Variable) on the hero element.
        // This is extremely efficient as it avoids direct DOM manipulation 
        // and allows the GPU to handle the transformation.
        hero.style.setProperty('--parallax-y', `${offset}px`);

        // Reset the ticking flag so the next scroll event can trigger an update
        ticking = false;
    }

    /**
     * Scroll event handler.
     * We use a "ticking" pattern with requestAnimationFrame to ensure
     * the animation is perfectly synced with the browser's refresh rate (usually 60fps).
     */
    window.addEventListener('scroll', () => {
        lastScrollY = window.pageYOffset;

        if (!ticking) {
            // requestAnimationFrame tells the browser to run this function
            // right before the next screen repaint, ensuring silk-smooth motion.
            window.requestAnimationFrame(() => {
                updateParallax();
            });
            ticking = true;
        }
    }, { passive: true }); // 'passive: true' tells the browser we won't call preventDefault,
                           // allowing for much faster scroll performance.

    // Run once on load to set the initial position
    updateParallax();
});
