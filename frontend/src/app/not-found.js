'use client';

/**
 * 404 Page - Harry Potter stilidagi sahifa topilmadi
 * Yulduzlar fixed pozitsiyada (hydration xatosini oldini olish uchun)
 */

import Link from 'next/link';

// Oldindan belgilangan yulduz pozitsiyalari
const STARS = [
    { left: '10%', top: '15%', dur: '3s', delay: '0s' },
    { left: '25%', top: '45%', dur: '4s', delay: '1s' },
    { left: '40%', top: '20%', dur: '2.5s', delay: '0.5s' },
    { left: '55%', top: '70%', dur: '3.5s', delay: '2s' },
    { left: '70%', top: '35%', dur: '4.5s', delay: '1.5s' },
    { left: '85%', top: '60%', dur: '3s', delay: '0.8s' },
    { left: '15%', top: '80%', dur: '2.8s', delay: '2.5s' },
    { left: '60%', top: '10%', dur: '3.2s', delay: '0.3s' },
    { left: '35%', top: '90%', dur: '4.2s', delay: '1.8s' },
    { left: '90%', top: '50%', dur: '2.6s', delay: '1.2s' },
    { left: '5%', top: '55%', dur: '3.8s', delay: '2.2s' },
    { left: '75%', top: '85%', dur: '3.3s', delay: '0.7s' },
    { left: '45%', top: '5%', dur: '4s', delay: '1.6s' },
    { left: '20%', top: '30%', dur: '2.4s', delay: '2.8s' },
    { left: '80%', top: '25%', dur: '3.6s', delay: '0.4s' },
];

export default function NotFound() {
    return (
        <div style={pageStyles.container}>
            {/* Sehrli fon */}
            <div style={pageStyles.bgGlow}></div>

            {/* Yulduzlar */}
            {STARS.map((star, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        width: '2px',
                        height: '2px',
                        background: '#D4AF37',
                        borderRadius: '50%',
                        left: star.left,
                        top: star.top,
                        animation: `sparkle ${star.dur} ease-in-out infinite`,
                        animationDelay: star.delay,
                        boxShadow: '0 0 6px #D4AF37',
                    }}
                />
            ))}

            <div style={pageStyles.content}>
                <div style={pageStyles.number}>404</div>
                <div style={pageStyles.wand}>&#10024;&#129668;</div>
                <h1 style={pageStyles.title}>Sahifa Topilmadi</h1>
                <p style={pageStyles.subtitle}>
                    Bu sahifa sehrli tarzda g&#39;oyib bo&#39;ldi...
                    <br />
                    Balki noto&#39;g&#39;ri sehr qo&#39;lladingiz?
                </p>
                <Link href="/" style={pageStyles.button}>
                    &#127968; Bosh sahifaga qaytish
                </Link>
            </div>
        </div>
    );
}

const pageStyles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0B0F',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
    },
    bgGlow: {
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(212,175,55,0.06), transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
    },
    content: {
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeIn 0.8s ease',
    },
    number: {
        fontSize: 'clamp(6rem, 15vw, 12rem)',
        fontFamily: "'Cinzel', serif",
        fontWeight: 900,
        background: 'linear-gradient(135deg, #B8960C, #D4AF37, #F5D77A, #D4AF37)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
        textShadow: 'none',
        filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.2))',
    },
    wand: {
        fontSize: '3rem',
        margin: '16px 0',
    },
    title: {
        fontFamily: "'Cinzel', serif",
        fontSize: 'clamp(1.5rem, 3vw, 2rem)',
        color: '#D4AF37',
        marginBottom: '12px',
    },
    subtitle: {
        color: '#9A9AB0',
        fontSize: '1rem',
        lineHeight: 1.8,
        marginBottom: '40px',
        maxWidth: '400px',
        margin: '0 auto 40px',
    },
    button: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '14px 32px',
        background: 'linear-gradient(135deg, #B8960C, #D4AF37)',
        color: '#0B0B0F',
        borderRadius: '12px',
        fontFamily: "'Cinzel', serif",
        fontWeight: 600,
        fontSize: '0.95rem',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
    },
};
