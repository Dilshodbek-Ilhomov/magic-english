'use client';

/**
 * Course Detail Page - Kursning video darslari
 * Pattern: VideoPlayerContent ichida useAuth/useLanguage ishlaydi.
 * Thin wrapper CourseDetailPage faqat ClientLayout chaqiradi.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import VideoPlayer from '@/components/VideoPlayer';
import QuizModal from '@/components/QuizModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { FaLock, FaCheckCircle, FaPen, FaTelegramPlane, FaPlayCircle, FaListAlt } from 'react-icons/fa';
import api from '@/lib/api';
import styles from './course.module.css';

// ──────────────────────────────────────────────────────
// Content Component (runs INSIDE AuthProvider)
// ──────────────────────────────────────────────────────
function CourseDetailContent() {
    const { id } = useParams();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { t, lang } = useLanguage();

    const [course, setCourse] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [pageError, setPageError] = useState('');

    const [activeVideo, setActiveVideo] = useState(null);
    const [streamUrl, setStreamUrl] = useState(null);
    const [videoLoading, setVideoLoading] = useState(false);

    const [showQuiz, setShowQuiz] = useState(false);

    // ── 0. Hooks that must be at top ─────────
    const handleProgressUpdate = useCallback((progress) => {
        // Update local state to reflect progress immediately
        setActiveVideo(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                progress: { ...prev?.progress, ...progress }
            };
        });

        setCourse(prev => {
            if (!prev || !prev.videos) return prev;
            const newVideos = prev.videos.map(v =>
                v.id === activeVideo?.id
                    ? { ...v, progress: { ...v.progress, ...progress } }
                    : v
            );
            return { ...prev, videos: newVideos };
        });
    }, [activeVideo?.id]);

    const videoSources = useMemo(() => {
        if (!activeVideo) return null;
        return {
            '360p': activeVideo.video_360p,
            '480p': activeVideo.video_480p,
            '720p': activeVideo.video_720p,
            '1080p': activeVideo.video_1080p,
            '1440p': activeVideo.video_1440p,
            '2160p': activeVideo.video_2160p,
        };
    }, [activeVideo?.id, activeVideo?.video_360p, activeVideo?.video_480p, activeVideo?.video_720p, activeVideo?.video_1080p, activeVideo?.video_1440p, activeVideo?.video_2160p]);

    // ── 1. Auth guard ──────────────────────────
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            window.location.href = '/login/';
        }
    }, [authLoading, isAuthenticated]);

    // ── 2. Fetch course + videos list ─────────
    useEffect(() => {
        if (!isAuthenticated || !id) return;

        let cancelled = false;

        const run = async () => {
            setPageLoading(true);
            setPageError('');
            const res = await api.getCourse(id);
            if (cancelled) return;

            if (res.success && res.data) {
                setCourse(res.data);
                // Auto-play first video
                const firstVideo = res.data.videos?.[0];
                if (firstVideo) {
                    playVideo(firstVideo);
                }
            } else {
                setPageError(
                    res.error?.message || res.message || 'Kurs topilmadi'
                );
            }
            setPageLoading(false);
        };

        run();
        return () => { cancelled = true; };
    }, [isAuthenticated, id]);

    // ── 3. Play a video ───────────────────────
    const playVideo = async (video) => {
        setActiveVideo(video);
        setStreamUrl(null);
        setVideoLoading(true);
        setShowQuiz(false);

        const res = await api.getVideo(video.id, { lang });
        if (!res.success) {
            setVideoLoading(false);
            return;
        }

        const full = { ...video, ...res.data };
        setActiveVideo(full);

        if (res.data.stream_token) {
            // getVideoStreamUrl is async but returns a plain URL string
            const url = await api.getVideoStreamUrl(video.id, res.data.stream_token);
            setStreamUrl(typeof url === 'string' ? url : String(url));
        }

        setVideoLoading(false);
    };

    // ── Helpers ───────────────────────────────
    const loc = (obj, field) => {
        if (!obj) return '';
        return (
            obj[`${field}_${lang}`] ||
            obj[`${field}_en`] ||
            obj[`${field}_uz`] ||
            obj[`${field}_ru`] ||
            ''
        );
    };

    const fmtDur = (s) => {
        if (!s) return '0:00';
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
    };

    // ── States ────────────────────────────────
    if (authLoading || pageLoading) {
        return (
            <div className="loading-container">
                <div className="magical-spinner"></div>
                <p className="loading-text">{t('loading') || 'Yuklanmoqda...'}</p>
            </div>
        );
    }

    if (pageError) {
        return (
            <div className="main-content" style={{ textAlign: 'center', paddingTop: '60px' }}>
                <span style={{ fontSize: '3rem', color: 'var(--color-danger)' }}><FaLock /></span>
                <h2 style={{ marginTop: '16px', color: 'var(--color-text-primary)' }}>{pageError}</h2>
                <Link href="/lessons" className="btn btn-secondary" style={{ marginTop: '20px', display: 'inline-block' }}>
                    ← Orqaga
                </Link>
            </div>
        );
    }

    if (!course) return null;

    const videos = course.videos || [];


    return (
        <div className={`main-content ${styles.pageWrapper}`}>

            {/* Back + Title */}
            <div className={styles.header}>
                <Link href="/lessons" className={styles.backLink}>
                    ← {t('back') || 'Orqaga'}
                </Link>
                <h1 className={styles.courseTitle}>{loc(course, 'title')}</h1>
                {loc(course, 'description') && (
                    <p className={styles.courseDesc}>{loc(course, 'description')}</p>
                )}
                {(course.course_type || course.custom_course_type) && (
                    <span className={styles.badge}>
                        {course.custom_course_type || course.course_type}
                    </span>
                )}
            </div>

            <div className={styles.grid}>

                {/* ── VIDEO AREA ── */}
                <div className={styles.videoArea}>
                    {streamUrl && activeVideo ? (
                        <>
                            <VideoPlayer
                                videoId={activeVideo.id}
                                src={streamUrl}
                                poster={activeVideo.thumbnail}
                                sources={videoSources}
                                initialProgress={activeVideo.progress?.watched_seconds || 0}
                                onProgressUpdate={handleProgressUpdate}
                            />
                            <div className={styles.videoDetails}>
                                <h2 className={styles.videoDetailTitle}>
                                    {loc(activeVideo, 'title')}
                                </h2>
                                {loc(activeVideo, 'description') && (
                                    <p className={styles.videoDetailDesc}>
                                        {loc(activeVideo, 'description')}
                                    </p>
                                )}

                                {/* Progress */}
                                {activeVideo.progress && !activeVideo.progress.completed && (
                                    <div className={styles.progressSection}>
                                        <div className={styles.progressHeader}>
                                            <span className={styles.progressLabel}>Progress</span>
                                            <span className={styles.progressValue}>
                                                {activeVideo.progress.progress_percent ?? 0}%
                                            </span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${activeVideo.progress.progress_percent ?? 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {activeVideo.progress?.completed && (
                                    <p style={{ color: 'var(--color-success, #22c55e)', fontWeight: 600, marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FaCheckCircle /> Video yakunlandi
                                    </p>
                                )}

                                <div className={styles.actions} style={{ display: 'flex', gap: '15px' }}>
                                    {activeVideo.questions?.length > 0 && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setShowQuiz(true)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            <FaPen /> {t('take_quiz') || "Test topshirish"}
                                        </button>
                                    )}
                                    {activeVideo.telegram_group_url && (
                                        <a href={activeVideo.telegram_group_url} target="_blank" rel="noopener noreferrer"
                                            className="btn btn-telegram" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FaTelegramPlane /> Telegramda muhokama
                                        </a>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : videoLoading ? (
                        <div className={styles.placeholder}>
                            <div className="magical-spinner"></div>
                            <p>Video yuklanmoqda...</p>
                        </div>
                    ) : (
                        <div className={styles.placeholder}>
                            <span style={{ fontSize: '3rem', color: 'var(--color-gold)' }}><FaPlayCircle /></span>
                            <p>{videos.length === 0
                                ? 'Bu kursda hozircha video yo\'q'
                                : 'Ro\'yxatdan video tanlang'}</p>
                        </div>
                    )}
                </div>

                {/* ── PLAYLIST ── */}
                <div className={styles.playlist}>
                    <p className={styles.playlistTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaListAlt style={{ color: 'var(--color-gold)' }} /> Kurs mundarijasi ({videos.length})
                    </p>

                    {videos.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
                            Hozircha video yo'q
                        </p>
                    ) : (
                        <div className={styles.playlistList}>
                            {videos.map((v, idx) => (
                                <div
                                    key={v.id}
                                    className={`${styles.playlistItem} ${activeVideo?.id === v.id ? styles.playlistItemActive : ''}`}
                                    onClick={() => playVideo(v)}
                                >
                                    <span className={styles.playlistNum}>{idx + 1}</span>
                                    <div className={styles.playlistInfo}>
                                        <div className={styles.playlistName}>
                                            <span style={{ fontWeight: 600 }}>{loc(v, 'title') || v.title}</span>
                                            {v.progress?.completed && <FaCheckCircle style={{ color: 'var(--color-success)', marginLeft: '6px' }} />}
                                        </div>
                                        <div className={styles.playlistMeta}>
                                            {fmtDur(v.duration_seconds)}
                                        </div>
                                    </div>
                                    <span className={styles.playlistArrow}>▶</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {showQuiz && activeVideo && (
                <QuizModal
                    video={activeVideo}
                    onClose={() => setShowQuiz(false)}
                    onFinish={(res) => {
                        console.log("Quiz finished", res);
                        // Refresh active video to update progress/score if needed
                        playVideo(activeVideo);
                    }}
                />
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────
// Page Export — thin wrapper that provides AuthProvider
// ──────────────────────────────────────────────────────
export default function CourseDetailPage() {
    return (
        <ClientLayout>
            <CourseDetailContent />
        </ClientLayout>
    );
}
