'use client';

/**
 * Landing Page - Sehrli hero section va xususiyatlar
 * Faqat autentifikatsiya qilinmagan foydalanuvchilar uchun
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useLanguage } from '@/context/LanguageContext';
import { BiBookOpen } from 'react-icons/bi';
import { FaTrophy, FaChartBar, FaStar } from 'react-icons/fa';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';
import api from '@/lib/api';

// Oldindan belgilangan yulduz pozitsiyalari (hydration xatosini oldini olish uchun)
const LANDING_STARS = [
  { left: '5%', top: '12%', delay: '0s', dur: '3s' },
  { left: '12%', top: '58%', delay: '2.1s', dur: '4s' },
  { left: '18%', top: '30%', delay: '0.8s', dur: '2.5s' },
  { left: '25%', top: '75%', delay: '3.5s', dur: '3.5s' },
  { left: '32%', top: '15%', delay: '1.2s', dur: '4.5s' },
  { left: '38%', top: '88%', delay: '4.2s', dur: '2.8s' },
  { left: '45%', top: '42%', delay: '0.5s', dur: '3.2s' },
  { left: '52%', top: '5%', delay: '2.8s', dur: '4.2s' },
  { left: '58%', top: '68%', delay: '1.6s', dur: '2.6s' },
  { left: '65%', top: '22%', delay: '3.9s', dur: '3.8s' },
  { left: '72%', top: '50%', delay: '0.3s', dur: '3.3s' },
  { left: '78%', top: '82%', delay: '2.5s', dur: '4s' },
  { left: '85%', top: '35%', delay: '1.8s', dur: '2.4s' },
  { left: '92%', top: '65%', delay: '4.5s', dur: '3.6s' },
  { left: '8%', top: '92%', delay: '0.7s', dur: '4.8s' },
  { left: '35%', top: '55%', delay: '3.2s', dur: '2.2s' },
  { left: '50%', top: '28%', delay: '1.4s', dur: '3.4s' },
  { left: '68%', top: '8%', delay: '4.8s', dur: '2.9s' },
  { left: '82%', top: '48%', delay: '0.9s', dur: '3.7s' },
  { left: '15%', top: '40%', delay: '2.3s', dur: '4.4s' },
];

function LandingContent() {
  const { t, language } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [cmsContent, setCmsContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await api.getLandingContent();
        if (res.success) {
          setCmsContent(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch CMS content:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  // Autentifikatsiya qilingan bo'lsa, darslar sahifasiga yo'naltirish
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.href = '/lessons';
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="magical-spinner"></div>
        <p className="loading-text">{t('loading')}</p>
      </div>
    );
  }

  // Content helper
  const getCmsField = (field, fallbackKey) => {
    if (!cmsContent) return t(fallbackKey);
    const langSuffix = language === 'uz' ? '_uz' : language === 'ru' ? '_ru' : '_en';
    return cmsContent[`${field}${langSuffix}`] || t(fallbackKey);
  };

  return (
    <div className={styles.landing}>
      {/* Sehrli fon animatsiyasi */}
      <div className={styles.magicBg}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
        <div className={styles.orb3}></div>
        {/* Yulduzlar */}
        {LANDING_STARS.map((star, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.delay,
              animationDuration: star.dur,
            }}
          />
        ))}
      </div>

      {/* HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroGlow}></div>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroIcon}>✦</span>
            {getCmsField('hero_title', 'hero_title')}
          </h1>
          <p className={styles.heroSubtitle}>{getCmsField('hero_description', 'hero_subtitle')}</p>
          <div className={styles.heroCta}>
            <Link href="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {getCmsField('cta_title', 'hero_cta')} <FaStar className="icon-pulse" />
            </Link>
            <Link href="#features" className="btn btn-secondary btn-lg">
              {t('hero_login')}
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className={styles.features} id="features">
        <div className={styles.featuresGrid}>
          {(cmsContent?.features?.length > 0 ? cmsContent.features : [
            { icon: <BiBookOpen size={30} />, title: t('feature_1_title'), desc: t('feature_1_desc') },
            { icon: <FaTrophy size={30} />, title: t('feature_2_title'), desc: t('feature_2_desc') },
            { icon: <FaChartBar size={30} />, title: t('feature_3_title'), desc: t('feature_3_desc') },
          ]).map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>


      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBranding}>
            <Logo size={48} />
            <span className={styles.footerLogo}>{t('app_name')}</span>
          </div>
          <p>© 2026 {t('app_name')}. {t('app_tagline')}</p>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <ClientLayout>
      <LandingContent />
    </ClientLayout>
  );
}
