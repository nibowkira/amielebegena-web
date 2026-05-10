/**
 * Amiele Begena Language Toggle
 * Specifically for about.html to switch between Amharic and English content.
 */

(function() {
    // 1. INJECT CSS STYLES
    const style = document.createElement('style');
    style.textContent = `
        .lang-toggle-container {
            display: flex;
            justify-content: center;
            padding: 2rem 0;
            background: var(--parchment-shade);
            border-bottom: 1px solid rgba(0,0,0,0.05);
            margin-top: 70px; /* Space for fixed navbar */
        }

        .lang-switch {
            display: flex;
            background: #fff;
            padding: 5px;
            border-radius: 50px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            border: 1px solid rgba(0,0,0,0.1);
        }

        .lang-btn {
            padding: 10px 25px;
            border-radius: 40px;
            border: none;
            background: transparent;
            font-family: 'Benaiah', sans-serif;
            font-size: 1.1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            color: #666;
        }

        .lang-btn.active {
            background: var(--dark-green);
            color: #fff;
            box-shadow: 0 4px 10px rgba(20, 35, 27, 0.2);
        }

        .lang-btn:hover:not(.active) {
            background: rgba(0,0,0,0.03);
        }

        /* Visibility Classes */
        body.lang-en .amharic-content { display: none !important; }
        body.lang-am .english-content { display: none !important; }
        
        /* Smooth transitions */
        .amharic-content, .english-content {
            transition: opacity 0.3s ease;
        }
    `;
    document.head.appendChild(style);

    // 2. CREATE TOGGLE UI
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'lang-toggle-container';
    toggleContainer.innerHTML = `
        <div class="lang-switch">
            <button class="lang-btn active" data-lang="both">All / ሁለቱም</button>
            <button class="lang-btn" data-lang="am">አማርኛ</button>
            <button class="lang-btn" data-lang="en">English</button>
        </div>
    `;

    // Insert just below the navbar (which is usually the first child or fixed)
    const main = document.querySelector('main');
    if (main) {
        main.parentNode.insertBefore(toggleContainer, main);
    }

    const buttons = toggleContainer.querySelectorAll('.lang-btn');

    // 3. TOGGLE LOGIC
    function setLanguage(lang) {
        // Update button states
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });

        // Update body classes
        document.body.classList.remove('lang-en', 'lang-am');
        if (lang === 'en') {
            document.body.classList.add('lang-en');
        } else if (lang === 'am') {
            document.body.classList.add('lang-am');
        }

        // Remember choice
        localStorage.setItem('amiele_about_lang', lang);
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang);
        });
    });

    // 4. RESTORE SAVED CHOICE
    const savedLang = localStorage.getItem('amiele_about_lang') || 'both';
    setLanguage(savedLang);

})();
