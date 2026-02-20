'use client';
import { useState, useEffect } from 'react';
import { FaDownload, FaTimes } from 'react-icons/fa';
import { useLanguage } from '@/context/LanguageContext';

export default function PWAInstallButton() {
    const { t } = useLanguage();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Show the install button
            setIsVisible(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsVisible(false);
            setDeferredPrompt(null);
            console.log('App was installed');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible || isInstalled) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(18, 18, 26, 0.98))',
            backdropFilter: 'blur(15px)',
            border: '2px solid var(--color-gold)',
            borderRadius: '50px',
            boxShadow: '0 10px 40px rgba(212, 175, 55, 0.25), 0 0 20px rgba(0,0,0,0.5)',
            animation: 'slideUpAndBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            width: 'max-content',
            maxWidth: '90vw',
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(212, 175, 55, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold)',
                fontSize: '1.2rem'
            }}>
                <FaDownload />
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>{t('pwa_install_title')}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{t('pwa_install_desc')}</div>
            </div>

            <button
                onClick={handleInstallClick}
                style={{
                    padding: '10px 24px',
                    background: 'var(--color-gold)',
                    color: 'black',
                    border: 'none',
                    borderRadius: '30px',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                {t('pwa_install_btn')}
            </button>

            <button
                onClick={() => setIsVisible(false)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '8px',
                    fontSize: '1.1rem'
                }}
            >
                <FaTimes />
            </button>

            <style jsx>{`
                @keyframes slideUpAndBounce {
                    0% { transform: translate(-50%, 150%) scale(0.5); opacity: 0; }
                    50% { transform: translate(-50%, -10%) scale(1.05); }
                    100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
