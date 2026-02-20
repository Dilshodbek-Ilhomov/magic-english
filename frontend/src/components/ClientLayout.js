'use client';

/**
 * ClientLayout - Barcha sahifalarni o'rab turuvchi wrapper
 * AuthProvider, LanguageProvider, Navbar, SecurityShield
 */

import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';
import SecurityShield from '@/components/SecurityShield';
import PWAInstallButton from '@/components/PWAInstallButton';

export default function ClientLayout({ children }) {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <AuthProvider>
                    <SecurityShield>
                        <Navbar />
                        <main style={{ paddingTop: 'var(--navbar-height)', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
                            {children}
                        </main>
                        <PWAInstallButton />
                    </SecurityShield>
                </AuthProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}
