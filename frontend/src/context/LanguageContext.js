'use client';

/**
 * LanguageContext - Ko'p tilli tizim
 * Real-time til almashtirish O'zbek/Rus/Ingliz
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations from '@/lib/i18n';

const LanguageContext = createContext(null);

const SUPPORTED_LANGS = ['uz', 'ru', 'en'];
const DEFAULT_LANG = 'uz';

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(DEFAULT_LANG);

    // Saqlangan tilni yuklash
    useEffect(() => {
        const saved = localStorage.getItem('language');
        if (saved && SUPPORTED_LANGS.includes(saved)) {
            setLang(saved);
        }
    }, []);

    // Tilni o'zgartirish
    const switchLanguage = useCallback((newLang) => {
        if (SUPPORTED_LANGS.includes(newLang)) {
            setLang(newLang);
            localStorage.setItem('language', newLang);
            document.documentElement.lang = newLang;
        }
    }, []);

    // Tarjima funksiyasi
    const t = useCallback((key) => {
        return translations[lang]?.[key] || translations[DEFAULT_LANG]?.[key] || key;
    }, [lang]);

    const value = {
        lang,
        switchLanguage,
        t,
        supportedLangs: SUPPORTED_LANGS,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage faqat LanguageProvider ichida ishlatilishi kerak');
    }
    return context;
}

export default LanguageContext;
