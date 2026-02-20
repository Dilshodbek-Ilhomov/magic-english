'use client';

/**
 * SecurityShield - Klient tomonidagi himoya qatlami
 * Right-click, DevTools, PrintScreen, Copy bloklash
 */

import { useEffect } from 'react';

export default function SecurityShield({ children }) {
    useEffect(() => {
        // Right-click bloklash
        const handleContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        // Klaviatura shortcutlarini bloklash
        const handleKeyDown = (e) => {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I (DevTools)
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+J (Console)
            if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                e.preventDefault();
                return false;
            }
            // Ctrl+U (View Source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                return false;
            }
            // Ctrl+S (Save)
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                return false;
            }
            // PrintScreen
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                // Qora overlay chiqarish
                showBlackOverlay();
                return false;
            }
        };

        // Copy bloklash
        const handleCopy = (e) => {
            e.preventDefault();
            return false;
        };

        // Drag bloklash
        const handleDrag = (e) => {
            e.preventDefault();
            return false;
        };

        // DevTools aniqlash
        const detectDevTools = () => {
            const threshold = 160;
            const widthDiff = window.outerWidth - window.innerWidth;
            const heightDiff = window.outerHeight - window.innerHeight;

            if (widthDiff > threshold || heightDiff > threshold) {
                document.body.style.filter = 'blur(20px)';
                document.title = '⚠️ Xavfsizlik ogohlantirishi';
            } else {
                document.body.style.filter = 'none';
                document.title = 'MagicEnglish';
            }
        };

        const showBlackOverlay = () => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
        position: fixed; inset: 0; background: #000;
        z-index: 99999; display: flex; align-items: center;
        justify-content: center; color: #D4AF37;
        font-family: 'Cinzel', serif; font-size: 1.5rem;
      `;
            overlay.textContent = '⚡ Screenshot bloklangan';
            document.body.appendChild(overlay);
            setTimeout(() => overlay.remove(), 2000);
        };

        // Event listener'larni qo'shish
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('dragstart', handleDrag);

        // DevTools tekshiruvini har soniya bajarish
        const devToolsInterval = setInterval(detectDevTools, 1000);

        // Tozalash
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('dragstart', handleDrag);
            clearInterval(devToolsInterval);
        };
    }, []);

    return <>{children}</>;
}
