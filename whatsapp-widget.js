/**
 * Amiele Begena WhatsApp Widget
 * A premium, floating WhatsApp contact button.
 */

(function() {
    // 1. INJECT CSS
    const style = document.createElement('style');
    style.textContent = `
        .wa-widget-container {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 9999;
            font-family: 'Benaiah', sans-serif;
        }

        .wa-button {
            width: 60px;
            height: 60px;
            background-color: #25D366;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
        }

        .wa-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(37, 211, 102, 0.5);
        }

        .wa-button svg {
            width: 32px;
            height: 32px;
            fill: white;
        }

        .wa-popup {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 300px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            overflow: hidden;
            display: none;
            flex-direction: column;
            transform-origin: bottom right;
            animation: wa-pop-in 0.3s ease forwards;
        }

        .wa-popup.active {
            display: flex;
        }

        @keyframes wa-pop-in {
            from { opacity: 0; transform: scale(0.8) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .wa-popup-header {
            background: #075E54;
            color: white;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .wa-popup-header h4 {
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
        }

        .wa-popup-header p {
            margin: 2px 0 0;
            font-size: 0.8rem;
            opacity: 0.8;
        }

        .wa-avatar {
            width: 40px;
            height: 40px;
            background: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
        }

        .wa-popup-body {
            padding: 20px;
            background: #e5ddd5;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .wa-message {
            background: white;
            padding: 10px 15px;
            border-radius: 10px;
            border-top-left-radius: 0;
            font-size: 0.9rem;
            color: #333;
            max-width: 85%;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .wa-input-area {
            padding: 15px;
            background: #f0f0f0;
            text-align: center;
        }

        .wa-send-btn {
            background: #25D366;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            text-decoration: none;
            display: inline-block;
            font-weight: 600;
            font-size: 0.9rem;
            transition: background 0.3s;
        }

        .wa-send-btn:hover {
            background: #128C7E;
        }

        /* Badge for notification */
        .wa-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            width: 15px;
            height: 15px;
            background: #ff3b30;
            border: 2px solid white;
            border-radius: 50%;
        }

        @media (max-width: 768px) {
            .wa-widget-container { bottom: 20px; right: 20px; }
            .wa-popup { width: 260px; }
        }
    `;
    document.head.appendChild(style);

    // 2. CREATE WIDGET
    const container = document.createElement('div');
    container.className = 'wa-widget-container';
    container.innerHTML = `
        <div class="wa-popup" id="waPopup">
            <div class="wa-popup-header">
                <div class="wa-avatar">
                    <img src="image/photo_2025-10-01_07-26-53.jpg" alt="Amiele Begena" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                </div>
                <div>
                    <h4>Amiele Begena</h4>
                    <p>Typically replies in minutes</p>
                </div>
            </div>
            <div class="wa-popup-body">
                <div class="wa-message">
                    Hi there! 👋 How can we help you find the perfect instrument today?
                </div>
            </div>
            <div class="wa-input-area">
                <a href="https://wa.me/251969189470?text=Hi,%20I%20have%20a%20question%20about%20your%20instruments." target="_blank" class="wa-send-btn">
                    Start Chat
                </a>
            </div>
        </div>
        <div class="wa-button" id="waButton">
            <div class="wa-badge"></div>
            <svg viewBox="0 0 448 512">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.7 17.8 69.4 27.3 106.2 27.3 122.4 0 222-99.6 222-222 0-59.3-23.1-115.1-65.1-157.1zM223.9 446.3c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.7-68.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 54 81.2 54 130.5 0 101.7-82.8 184.5-184.6 184.5zm100.5-137.5c-5.5-2.8-32.6-16.1-37.7-17.9-5.1-1.8-8.8-2.8-12.5 2.8-3.7 5.6-14.3 17.9-17.5 21.6-3.2 3.7-6.5 4.1-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.2-3.2-5.5-.3-8.5 2.4-11.2 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.2 3.7-5.5 5.6-9.2 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.7 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.5 32.6-13.3 37.2-26.2 4.6-12.8 4.6-23.9 3.2-26.2-1.3-2.3-5-3.7-10.5-6.5z"></path>
            </svg>
        </div>
    `;

    document.body.appendChild(container);

    // 3. TOGGLE LOGIC
    const waButton = document.getElementById('waButton');
    const waPopup = document.getElementById('waPopup');

    waButton.addEventListener('click', (e) => {
        e.stopPropagation();
        waPopup.classList.toggle('active');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            waPopup.classList.remove('active');
        }
    });

    // Prevent closing when clicking inside popup
    waPopup.addEventListener('click', (e) => {
        e.stopPropagation();
    });

})();
