'use client';

/**
 * Video Player Page - Himoyalangan video ko'rish sahifasi
 * Signed URL, progress tracking, watermark
 */

import { useState, useEffect, use, useCallback } from 'react';
import ClientLayout from '@/components/ClientLayout';
import VideoPlayer from '@/components/VideoPlayer';
import QuizModal from '@/components/QuizModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';
import { FaTelegramPlane, FaPen } from 'react-icons/fa';

function VideoPlayerContent({ videoId }) {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const { t, lang } = useLanguage();

    const [video, setVideo] = useState(null);
    const [streamUrl, setStreamUrl] = useState('');
    const [sources, setSources] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showQuiz, setShowQuiz] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            window.location.href = '/login/';
            return;
        }
        if (isAuthenticated) loadVideo();
    }, [authLoading, isAuthenticated, videoId]);

    const loadVideo = async () => {
        setLoading(true);
        const res = await api.getVideo(videoId, { lang });
        if (res.success) {
            const videoData = res.data;
            setVideo(videoData);

            // Stream URLs yaratish
            const token = videoData.stream_token;
            const mainUrl = await api.getVideoStreamUrl(videoId, token);
            setStreamUrl(mainUrl);

            // Sifatlar (sources) yaratish
            const srcObj = {};
            if (videoData.video_360p) srcObj['360p'] = await api.getVideoStreamUrl(videoId, token, '360p');
            if (videoData.video_480p) srcObj['480p'] = await api.getVideoStreamUrl(videoId, token, '480p');
            if (videoData.video_720p) srcObj['720p'] = await api.getVideoStreamUrl(videoId, token, '720p');
            if (videoData.video_1080p) srcObj['1080p'] = await api.getVideoStreamUrl(videoId, token, '1080p');
            setSources(srcObj);
        } else {
            const msg = res.error?.message || '';
            if (msg.includes('limitingizga yetdingiz') || msg.includes('limit reached')) {
                setError(t('error_daily_limit'));
            } else {
                setError(msg || 'Video topilmadi');
            }
        }
        setLoading(false);
    };

    const handleProgressUpdate = useCallback((data) => {
        setVideo(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                progress: { ...prev.progress, ...data }
            };
        });
    }, []);

    const getTitle = (v) => {
        if (!v) return '';
        const map = { uz: v.title_uz, ru: v.title_ru, en: v.title_en };
        return map[lang] || v.title_en;
    };

    const getDesc = (v) => {
        if (!v) return '';
        const map = { uz: v.description_uz, ru: v.description_ru, en: v.description_en };
        return map[lang] || v.description_en;
    };

    if (authLoading || loading) {
        return (
            <div className="loading-container">
                <div className="magical-spinner"></div>
                <p className="loading-text">{t('loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="main-content" style={{ textAlign: 'center', paddingTop: '60px' }}>
                <h2>⚠️ {error}</h2>
                <button className="btn btn-secondary" onClick={() => window.location.href = '/lessons/'} style={{ marginTop: '20px' }}>
                    {t('back')}
                </button>
            </div>
        );
    }

    return (
        <div className="main-content" style={{ maxWidth: '1000px' }}>
            {/* Orqaga tugma */}
            <button
                onClick={() => window.location.href = '/lessons/'}
                className="btn btn-secondary btn-sm"
                style={{ marginBottom: '20px' }}
            >
                ← {t('back')}
            </button>

            {/* Video player using shared component */}
            <div style={playerStyles.wrapper}>
                <VideoPlayer
                    videoId={video.id}
                    user={user}
                    src={streamUrl}
                    sources={sources}
                    poster={video.thumbnail}
                    initialProgress={video.progress?.watched_seconds || 0}
                    onProgressUpdate={handleProgressUpdate}
                />
            </div>

            {/* Video ma'lumotlari */}
            <div style={playerStyles.info}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span className={`badge badge-${video?.level}`}>
                        {video?.level === 'beginner' ? t('level_beginner') :
                            video?.level === 'intermediate' ? t('level_intermediate') : t('level_advanced')}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {video?.views_count} {t('lessons_views')}
                    </span>
                </div>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>{getTitle(video)}</h1>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>{getDesc(video)}</p>

                {/* Action Buttons */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {video?.questions?.length > 0 && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowQuiz(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <FaPen /> {t('take_quiz') || "Test topshirish"}
                        </button>
                    )}
                    {video?.telegram_group_url && (
                        <a
                            href={video.telegram_group_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-telegram"
                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <FaTelegramPlane /> {t('discuss_telegram') || "Telegramda muhokama qilish"}
                        </a>
                    )}
                </div>
                {video?.progress && (
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                {t('profile_progress')}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-gold)' }}>
                                {video.progress.progress_percent}%
                            </span>
                        </div>
                        <div className="progress-bar" style={{ height: '8px' }}>
                            <div className="progress-bar-fill" style={{ width: `${video.progress.progress_percent}%` }}></div>
                        </div>
                    </div>
                )}
            </div>

            {showQuiz && (
                <QuizModal
                    video={video}
                    onClose={() => setShowQuiz(false)}
                    onFinish={(res) => {
                        console.log("Quiz finished", res);
                        // Optional: reload video to update progress/status
                        loadVideo();
                    }}
                />
            )}
        </div>
    );
}

const playerStyles = {
    wrapper: {
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    },
    info: {
        marginTop: '24px',
        padding: '24px',
        background: 'rgba(20, 20, 22, 0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    },
};

export default function VideoPage({ params }) {
    const unwrappedParams = use(params);
    return (
        <ClientLayout>
            <VideoPlayerContent videoId={unwrappedParams.id} />
        </ClientLayout>
    );
}
