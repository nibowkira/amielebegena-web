/**
 * SCROLL ANIMATIONS LOGIC
 * Uses Intersection Observer API for high-performance scroll tracking.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Selection for all animatable elements
    const animatables = document.querySelectorAll(
        '.animate-bottom, .animate-left, .animate-right, .animate-fade, .animate-scale'
    );

    /**
     * INTERSECTION OBSERVER SETUP
     * 
     * threshold: 0.1 means trigger when 10% of the element is visible.
     * rootMargin: Adjusts the trigger point relative to the viewport.
     */
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px' // Triggers slightly before element enters
    };

    const animationObserver = new IntersectionObserver((entries, observer) => {
        // Group entries by parent container to handle staggered delays
        const parents = new Map();

        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const parent = element.parentElement;

                if (!parents.has(parent)) {
                    parents.set(parent, []);
                }
                parents.get(parent).push(element);

                // Stop observing this element immediately since we only animate ONCE
                observer.unobserve(element);
            }
        });

        // Apply animations with staggered delays
        parents.forEach((elements) => {
            elements.forEach((el, index) => {
                // Apply a small delay (0.1s) multiplied by index for staggered effect
                const delay = index * 0.1;
                el.style.transitionDelay = `${delay}s`;
                el.classList.add('show-animation');
            });
        });
    }, observerOptions);

    // Initial check for elements already in viewport
    // and starting the observation for others
    animatables.forEach(el => {
        // Use getBoundingClientRect to check if already visible on load
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            // Already visible: Show immediately without animation to prevent pop-in
            el.classList.add('show-animation');
        } else {
            // Start observing for scroll entry
            animationObserver.observe(el);
        }
    });
});
