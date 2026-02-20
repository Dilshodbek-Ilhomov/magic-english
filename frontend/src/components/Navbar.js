'use client';

/**
 * Navbar - Yuqori navigatsiya paneli (Mobile + Desktop)
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { FaUser, FaBook, FaCog, FaSignOutAlt, FaSun, FaMoon, FaChevronDown, FaChevronUp, FaStar } from 'react-icons/fa';
import Logo from './Logo';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const { lang, switchLanguage, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setMobileOpen(false);
        setDropdownOpen(false);
        await logout();
        window.location.href = '/';
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href="/" className={styles.logo} onClick={() => setMobileOpen(false)}>
                    <Logo size={40} className={styles.logoIcon} />
                    <span className={styles.logoText}>{t('app_name')}</span>
                </Link>

                {/* Desktop Nav Links */}
                <div className={styles.nav_links}>
                    {isAuthenticated && (
                        <>
                            <Link href="/lessons" className={styles.navLink}>
                                {t('nav_lessons')}
                            </Link>
                            <Link href="/profile" className={styles.navLink}>
                                {t('nav_profile')}
                            </Link>
                            {isAdmin && (
                                <Link href="/admin" className={`${styles.navLink} ${styles.adminLink}`}>
                                    {t('nav_admin')}
                                </Link>
                            )}
                        </>
                    )}
                </div>

                {/* Right Section */}
                <div className={styles.right_section}>
                    {/* Theme Toggle */}
                    <button onClick={toggleTheme} className={styles.themeToggle} title="Switch Theme" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {theme === 'dark' ? <FaSun /> : <FaMoon />}
                    </button>

                    {/* Language Switcher */}
                    <div className={styles.langSwitcher}>
                        {['uz', 'ru', 'en'].map((l) => (
                            <button
                                key={l}
                                className={`${styles.langBtn} ${lang === l ? styles.langActive : ''}`}
                                onClick={() => switchLanguage(l)}
                            >
                                {l.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* User Menu (Desktop Dropdown) */}
                    {isAuthenticated ? (
                        <div className={styles.userMenu} ref={dropdownRef}>
                            <button
                                className={styles.userBtn}
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <div className={styles.avatar}>
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="" />
                                    ) : (
                                        <span>{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                                    )}
                                </div>
                                <span className={styles.userName}>{user?.username}</span>
                                <span className={styles.chevron}>{dropdownOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                            </button>

                            {dropdownOpen && (
                                <div className={styles.dropdown}>
                                    <div className={styles.dropdownHeader}>
                                        <p className={styles.dropdownName}>{user?.first_name || user?.username}</p>
                                        <p className={styles.dropdownRole}>{user?.role === 'admin' ? 'Admin' : 'Student'}</p>
                                    </div>
                                    <Link href="/profile" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
                                        <FaUser style={{ marginRight: '8px' }} /> {t('nav_profile')}
                                    </Link>
                                    <Link href="/lessons" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
                                        <FaBook style={{ marginRight: '8px' }} /> {t('nav_lessons')}
                                    </Link>
                                    {isAdmin && (
                                        <Link href="/admin" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
                                            <FaCog style={{ marginRight: '8px' }} /> {t('nav_admin')}
                                        </Link>
                                    )}
                                    <button onClick={handleLogout} className={styles.logoutBtn} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <FaSignOutAlt style={{ marginRight: '8px' }} /> {t('nav_logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href="/login" className="btn btn-primary btn-sm">
                            {t('hero_login')}
                        </Link>
                    )}

                    {/* Mobile Hamburger */}
                    <button
                        className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ''}`}
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className={styles.mobileMenu}>
                    {isAuthenticated ? (
                        <>
                            {/* User Info */}
                            <div className={styles.mobileUser}>
                                <div className={styles.mobileAvatar}>
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="" />
                                    ) : (
                                        <span>{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                                    )}
                                </div>
                                <div>
                                    <p className={styles.mobileUserName}>{user?.first_name || user?.username}</p>
                                    <p className={styles.mobileUserRole}>{user?.role === 'admin' ? 'Admin' : 'Student'}</p>
                                </div>
                            </div>
                            <div className={styles.mobileDivider}></div>
                            <Link href="/lessons" onClick={() => setMobileOpen(false)} className={styles.mobileLink} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaBook /> {t('nav_lessons')}
                            </Link>
                            <Link href="/profile" onClick={() => setMobileOpen(false)} className={styles.mobileLink} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaUser /> {t('nav_profile')}
                            </Link>
                            {isAdmin && (
                                <Link href="/admin" onClick={() => setMobileOpen(false)} className={`${styles.mobileLink} ${styles.mobileAdminLink}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaCog /> {t('nav_admin')}
                                </Link>
                            )}
                            <div className={styles.mobileDivider}></div>
                            <button onClick={handleLogout} className={`${styles.mobileLink} ${styles.mobileLogout}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', padding: '12px' }}>
                                <FaSignOutAlt /> {t('nav_logout')}
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="btn btn-primary" onClick={() => setMobileOpen(false)}
                            style={{ display: 'block', textAlign: 'center', margin: '8px 0' }}>
                            {t('hero_login')}
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
}
