'use client';

/**
 * Login Page - Premium minimal login sahifasi
 */

import { useState } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { FaSpinner, FaStar } from 'react-icons/fa';

function LoginContent() {
    const { login, forceDisconnect } = useAuth();
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deviceLimitExceeded, setDeviceLimitExceeded] = useState(false);
    const [existingDevices, setExistingDevices] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await login(username, password);
            if (res.success) {
                // Admin bo'lsa admin panelga, talaba bo'lsa darslarga
                const isAdminUser = res.data?.user?.role === 'admin';
                window.location.href = isAdminUser ? '/admin/' : '/lessons/';
            } else if (res.error?.code === 'DEVICE_LIMIT_EXCEEDED') {
                setExistingDevices(res.error.devices || []);
                setDeviceLimitExceeded(true);
            } else {
                // DRF xato formatlarini to'g'ri o'qish
                const msg = res.error?.message
                    || res.error?.non_field_errors?.[0]
                    || (typeof res.error === 'string' ? res.error : null)
                    || t('login_error');
                setError(msg);
            }
        } catch {
            setError(t('login_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (devicePk) => {
        setError('');
        setLoading(true);
        try {
            const res = await forceDisconnect(username, password, devicePk);
            if (res.success) {
                setDeviceLimitExceeded(false);
                // Qayta login qilish
                const loginRes = await login(username, password);
                if (loginRes.success) {
                    window.location.href = loginRes.data?.user?.role === 'admin' ? '/admin/' : '/lessons/';
                }
            } else {
                setError(res.error?.message || 'Xatolik yuz berdi');
            }
        } catch (err) {
            setError('Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={pageStyles.container}>
            <div style={pageStyles.glow}></div>
            <div style={pageStyles.card}>
                <div style={pageStyles.icon}><FaStar /></div>
                <h1 style={pageStyles.title}>{t('login_title')}</h1>
                <p style={pageStyles.subtitle}>{t('login_subtitle')}</p>

                <form onSubmit={handleSubmit} style={pageStyles.form}>
                    {error && <div style={pageStyles.error}>{error}</div>}

                    <div className="input-group">
                        <label>{t('login_username')}</label>
                        <input
                            type="text"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t('login_username')}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label>{t('login_password')}</label>
                        <input
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: '8px' }}
                        disabled={loading}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {loading ? <><FaSpinner className="icon-spin" /> ...</> : t('login_button')}
                        </div>
                    </button>
                </form>
            </div>

            {/* Device Limit Modal */}
            {deviceLimitExceeded && (
                <div style={pageStyles.modalOverlay}>
                    <div style={pageStyles.modal}>
                        <h2 style={pageStyles.modalTitle}>{t('device_limit_title')}</h2>
                        <p style={pageStyles.modalText}>
                            {t('device_limit_desc')}
                        </p>

                        <div style={pageStyles.deviceList}>
                            {existingDevices.map(device => (
                                <div key={device.id} style={pageStyles.deviceItem}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', color: 'white' }}>{device.device_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                            IP: {device.ip_address} | {new Date(device.last_login).toLocaleString()}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDisconnect(device.id)}
                                        style={pageStyles.disconnectBtn}
                                        disabled={loading}
                                    >
                                        {loading ? '...' : t('device_disconnect')}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setDeviceLimitExceeded(false)}
                            style={pageStyles.closeBtn}
                        >
                            {t('device_back')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const pageStyles = {
    container: {
        minHeight: 'calc(100vh - var(--navbar-height))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
    },
    glow: {
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(212,175,55,0.08), transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        pointerEvents: 'none',
    },
    card: {
        background: 'rgba(26, 26, 46, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(212, 175, 55, 0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: '48px 40px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'fadeIn 0.5s ease',
    },
    icon: {
        fontSize: '2.5rem',
        marginBottom: '16px',
        textShadow: '0 0 20px rgba(212,175,55,0.5)',
    },
    title: {
        fontFamily: 'var(--font-heading)',
        fontSize: '1.6rem',
        color: 'var(--color-gold)',
        marginBottom: '8px',
    },
    subtitle: {
        color: 'var(--color-text-secondary)',
        fontSize: '0.9rem',
        marginBottom: '32px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        textAlign: 'left',
    },
    error: {
        background: 'rgba(255, 71, 87, 0.1)',
        border: '1px solid rgba(255, 71, 87, 0.3)',
        color: '#FF4757',
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.9rem',
        textAlign: 'center',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },
    modal: {
        background: 'rgba(30, 30, 50, 0.95)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        padding: '32px',
        maxWidth: '450px',
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
    },
    modalTitle: {
        color: 'var(--color-gold)',
        fontSize: '1.4rem',
        marginBottom: '12px',
    },
    modalText: {
        color: 'var(--color-text-secondary)',
        fontSize: '0.95rem',
        marginBottom: '24px',
        lineHeight: '1.5',
    },
    deviceList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
    },
    deviceItem: {
        background: 'rgba(255,255,255,0.05)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    disconnectBtn: {
        background: 'rgba(255, 71, 87, 0.15)',
        color: '#FF4757',
        border: '1px solid rgba(255, 71, 87, 0.3)',
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        textDecoration: 'underline',
    },
};

export default function LoginPage() {
    return (
        <ClientLayout>
            <LoginContent />
        </ClientLayout>
    );
}
