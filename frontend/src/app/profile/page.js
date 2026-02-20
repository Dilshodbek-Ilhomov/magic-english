'use client';

/**
 * Profile Page - Foydalanuvchi profili va statistika
 */

import { useState, useEffect } from 'react';

import ClientLayout from '@/components/ClientLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';
import { FaCheckCircle, FaPen, FaBookOpen, FaChartBar, FaCamera } from 'react-icons/fa';

function ProfileContent() {
    const { user, isAuthenticated, loading: authLoading, updateProfile, logout } = useAuth();
    const { t } = useLanguage();

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) window.location.href = '/login/';
    }, [authLoading, isAuthenticated]);

    useEffect(() => {
        if (user) {
            setForm({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
            });
        }
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        await updateProfile(form);
        setEditing(false);
        setSaving(false);
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await api.uploadAvatar(file);
            window.location.reload();
        }
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = '/';
    };

    const handleDisconnectDevice = async (pk) => {
        if (confirm('Haqiqatan ham ushbu qurilmani uzmoqchimisiz?')) {
            const res = await api.deleteDevice(pk);
            if (res.success) {
                // Profile ma'lumotlarini qayta yuklash
                window.location.reload();
            }
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    if (authLoading || !user) {
        return (
            <div className="loading-container">
                <div className="magical-spinner"></div>
            </div>
        );
    }

    const stats = user.progress_stats || {};
    const recentProgress = user.recent_progress || [];

    return (
        <div className="main-content" style={{ maxWidth: '900px', animation: 'fadeIn 0.5s ease', paddingBottom: '50px' }}>
            {/* Header / Welcome */}
            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.2rem', background: 'linear-gradient(90deg, #fff, var(--color-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Salom, {user.first_name || user.username}! ✨
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Bugun yangi narsalar o'rganish uchun ajoyib kun!</p>
            </div>
            {/* Profil Card */}
            <div className="card" style={profStyles.profileCard}>
                <div style={profStyles.avatarSection}>
                    <div style={profStyles.avatar}>
                        {user.avatar ? (
                            <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                            <span style={profStyles.avatarLetter}>{user.username[0].toUpperCase()}</span>
                        )}
                    </div>
                    <label style={profStyles.uploadBtn}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaCamera /> {t('profile_upload_avatar')}
                        </div>
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                    </label>
                </div>

                <div style={profStyles.infoSection}>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
                        {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>@{user.username}</p>
                    <span className={`badge badge-${user.role === 'admin' ? 'admin' : 'beginner'}`}>
                        {user.role === 'admin' ? 'Admin' : 'Student'}
                    </span>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '12px' }}>
                        {t('profile_joined')}: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* Statistika va Streak */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', margin: '24px 0' }}>
                <div className="stat-card" style={{ background: 'rgba(212, 175, 55, 0.15)', border: '1px solid var(--color-gold)' }}>
                    <div className="stat-icon" style={{ color: 'var(--color-gold)' }}>🔥</div>
                    <div className="stat-info">
                        <h3>{stats.daily_streak || 0} kun</h3>
                        <p>{t('profile_streak')}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><FaBookOpen /></div>
                    <div className="stat-info">
                        <h3>{stats.total_videos_started || 0}</h3>
                        <p>{t('profile_videos_watched')}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><FaCheckCircle /></div>
                    <div className="stat-info">
                        <h3>{stats.total_videos_completed || 0}</h3>
                        <p>{t('profile_completed')}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><FaChartBar /></div>
                    <div className="stat-info">
                        <h3>{stats.completion_rate || 0}%</h3>
                        <p>{t('profile_progress')}</p>
                    </div>
                </div>
            </div>

            {/* Oxirgi ko'rilgan videolar (Dashboard) */}
            <div className="card" style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.02)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaBookOpen style={{ color: 'var(--color-gold)' }} /> O'qishni davom ettirish
                </h2>
                {recentProgress.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentProgress.map((p, i) => (
                            <a key={i} href={`/lessons/${p.video_id}`} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                transition: 'transform 0.2s',
                            }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '50px', height: '30px', borderRadius: '4px', background: '#333', overflow: 'hidden' }}>
                                        {p.thumbnail ? <img src={p.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ background: 'var(--color-gold-dark)', height: '100%' }} />}
                                    </div>
                                    <div>
                                        <div style={{ color: 'white', fontWeight: '500', fontSize: '0.9rem' }}>{p.video_title}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{p.course_title}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-gold)' }}>{p.progress_percent}%</div>
                                    <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px' }}>
                                        <div style={{ width: `${p.progress_percent}%`, height: '100%', background: 'var(--color-gold)', borderRadius: '2px' }} />
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>Hozircha faoliyat yo'q. Kurslarni ko'rishni boshlang!</p>
                )}
            </div>

            {/* Profilni tahrirlash */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.1rem' }}>{t('profile_edit')}</h2>
                    {!editing && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaPen /> {t('edit')}
                        </button>
                    )}
                </div>

                {editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="input-group">
                            <label>First Name</label>
                            <input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Last Name</label>
                            <input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                                {saving ? '...' : t('save')}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                                {t('cancel')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={profStyles.infoRow}>
                            <span style={profStyles.infoLabel}>{t('login_username')}</span>
                            <span>{user.username}</span>
                        </div>
                        <div style={profStyles.infoRow}>
                            <span style={profStyles.infoLabel}>Email</span>
                            <span>{user.email || '-'}</span>
                        </div>
                        <div style={profStyles.infoRow}>
                            <span style={profStyles.infoLabel}>{t('profile_level')}</span>
                            <span>{user.role}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Connected Devices */}
            <div className="card" style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.02)' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📱 {t('device_connected_title')}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {user.devices?.map(device => (
                        <div key={device.id} style={profStyles.deviceItem}>
                            <div>
                                <div style={{ fontWeight: '600', color: 'white' }}>{device.device_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                    IP: {device.ip_address} | {new Date(device.last_login).toLocaleString()}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDisconnectDevice(device.id)}
                                style={profStyles.disconnectBtn}
                            >
                                {t('device_disconnect')}
                            </button>
                        </div>
                    ))}
                    {(!user.devices || user.devices.length === 0) && (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>Hozircha faqat shu qurilma ulangan</p>
                    )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '16px' }}>
                    * Maksimal 2 ta qurilmaga ruxsat beriladi. Limitdan oshsa yangi qurilma kira olmaydi.
                </p>
            </div>

            {/* Logout */}
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleLogout}>
                {t('nav_logout')}
            </button>
        </div>
    );
}

const profStyles = {
    profileCard: {
        display: 'flex',
        gap: '30px',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    avatarSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
    },
    avatar: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-gold-dark), var(--color-violet))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: '3px solid rgba(212,175,55,0.3)',
    },
    avatarLetter: {
        fontSize: '2.5rem',
        fontWeight: 700,
        color: 'white',
        fontFamily: 'var(--font-heading)',
    },
    uploadBtn: {
        cursor: 'pointer',
        fontSize: '0.8rem',
        color: 'var(--color-gold)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid rgba(212,175,55,0.2)',
        transition: 'all 0.2s',
    },
    infoSection: {
        flex: 1,
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
    },
    infoLabel: {
        color: 'var(--color-text-secondary)',
        fontSize: '0.9rem',
    },
    deviceItem: {
        background: 'rgba(255,255,255,0.03)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid rgba(255,255,255,0.05)',
    },
    disconnectBtn: {
        background: 'rgba(255, 71, 87, 0.1)',
        color: '#FF4757',
        border: '1px solid rgba(255, 71, 87, 0.2)',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default function ProfilePage() {
    return (
        <ClientLayout>
            <ProfileContent />
        </ClientLayout>
    );
}
