'use client';

/**
 * Lessons Page - Foydalanuvchiga tegishli kurslar va video darslar
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { FaCheckCircle, FaBook, FaPlayCircle, FaBookOpen, FaVideo } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';
import styles from './lessons.module.css';

function LessonsContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { t, lang } = useLanguage();

    const [courses, setCourses] = useState([]);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('courses'); // 'courses' | 'videos'
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            window.location.href = '/login/';
        }
    }, [authLoading, isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchCourses();
            fetchVideos();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated && view === 'videos') fetchVideos();
    }, [filter, search]);

    const fetchCourses = async () => {
        const res = await api.getCourses();
        if (res.success) setCourses(res.data);
    };

    const fetchVideos = async () => {
        setLoading(true);
        const params = {};
        if (filter !== 'all') params.level = filter;
        if (search) params.search = search;
        const res = await api.getVideos(params);
        if (res.success) setVideos(res.data);
        setLoading(false);
    };

    useEffect(() => {
        if (isAuthenticated && view === 'courses') setLoading(false);
    }, [courses, view]);

    const getTitle = (obj) => {
        const map = { uz: obj.title_uz, ru: obj.title_ru, en: obj.title_en };
        return map[lang] || obj.title_en || obj.title_uz || '';
    };

    const getDesc = (obj) => {
        const map = { uz: obj.description_uz, ru: obj.description_ru, en: obj.description_en };
        return map[lang] || obj.description_en || obj.description_uz || '';
    };

    const formatDuration = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const getLevelBadge = (level) => {
        const labels = {
            beginner: t('level_beginner') || 'Boshlang\'ich',
            intermediate: t('level_intermediate') || 'O\'rta',
            advanced: t('level_advanced') || 'Yuqori',
        };
        return labels[level] || level;
    };

    if (authLoading) {
        return (
            <div className="loading-container">
                <div className="magical-spinner"></div>
                <p className="loading-text">{t('loading') || 'Yuklanmoqda...'}</p>
            </div>
        );
    }

    return (
        <div className="main-content">
            {/* Header */}
            <div className="page-header" style={{ animation: 'fadeIn 0.5s ease' }}>
                <div className={styles.header}>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaBook style={{ color: 'var(--color-gold)' }} /> {t('lessons_title') || 'Darslar'}</h1>
                    <p>{t('lessons_subtitle') || 'Siz xarid qilgan barcha kurslar va darslar shu yerda.'}</p>
                </div>
            </div>



            {/* View Toggle */}
            <div className={styles.viewToggle}>
                <button
                    className={`btn btn-sm ${view === 'courses' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setView('courses'); setLoading(false); }}
                >
                    <FaBookOpen /> {t('courses') || 'Kurslar'}
                </button>
                <button
                    className={`btn btn-sm ${view === 'videos' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setView('videos'); fetchVideos(); }}
                >
                    <FaVideo /> {t('all_videos') || 'Barcha videolar'}
                </button>
            </div>

            {/* COURSES VIEW */}
            {view === 'courses' && (
                <>
                    {courses.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>📭</span>
                            <h3>{t('no_courses') || 'Hozircha kurs yo\'q'}</h3>
                            <p>{t('no_courses_desc') || 'Admin tomonidan kurs tayinlanishi kutilmoqda'}</p>
                        </div>
                    ) : (
                        <div className={styles.coursesGrid}>
                            {courses.map((course, i) => (
                                <Link
                                    key={course.id}
                                    href={`/courses/${course.id}`}
                                    className={styles.courseCard}
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                >
                                    {/* Course Thumbnail */}
                                    <div className={styles.courseThumbnail}>
                                        {course.thumbnail ? (
                                            <img src={course.thumbnail} alt={getTitle(course)} />
                                        ) : (
                                            <div className={styles.courseThumbnailPlaceholder}>
                                                <span style={{ display: 'flex' }}><FaPlayCircle /></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Course Info */}
                                    <div className={styles.courseInfo}>
                                        <h3 className={styles.courseTitle}>{getTitle(course)}</h3>
                                        <p className={styles.courseDesc}>
                                            {getDesc(course)?.substring(0, 100)}
                                            {getDesc(course)?.length > 100 && '...'}
                                        </p>

                                        <div className={styles.courseMeta}>
                                            <span className={styles.courseArrow}>→ {t('open_course') || 'Kursni ochish'}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* VIDEOS VIEW */}
            {view === 'videos' && (
                <>
                    {/* Filters */}
                    <div className={styles.filters}>
                        <div className={styles.filterBtns}>
                            {['all', 'beginner', 'intermediate', 'advanced'].map((f) => (
                                <button
                                    key={f}
                                    className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFilter(f)}
                                >
                                    {f === 'all' ? (t('lessons_filter_all') || 'Barchasi') : getLevelBadge(f)}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            className="input-field"
                            placeholder={t('search') || 'Qidirish...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ maxWidth: '280px', width: '100%' }}
                        />
                    </div>

                    {loading ? (
                        <div className="loading-container" style={{ minHeight: '40vh' }}>
                            <div className="magical-spinner"></div>
                        </div>
                    ) : videos.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>📭</span>
                            <h3>{t('lessons_empty') || 'Video topilmadi'}</h3>
                        </div>
                    ) : (
                        <div className={styles.videosGrid}>
                            {videos.map((video, i) => (
                                <div
                                    key={video.id}
                                    className={`card ${styles.videoCard}`}
                                    style={{ animationDelay: `${i * 0.08}s` }}
                                    onClick={() => window.location.href = `/lessons/${video.id}/`}
                                >
                                    {/* Thumbnail */}
                                    <div className={styles.videoThumbnail}>
                                        {video.thumbnail ? (
                                            <img src={video.thumbnail} alt="" />
                                        ) : (
                                            <div className={styles.thumbPlaceholder}><span>🎬</span></div>
                                        )}
                                        <div className={styles.duration}>{formatDuration(video.duration_seconds)}</div>
                                        {video.progress?.completed && (
                                            <div className={styles.completedBadge}><FaCheckCircle size={14} /></div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className={styles.videoInfo}>
                                        <div className={styles.videoMeta}>
                                            <span className={`badge badge-${video.level}`}>{getLevelBadge(video.level)}</span>
                                            <span className={styles.viewCount}>{video.views_count} {t('lessons_views') || 'ko\'rishlar'}</span>
                                        </div>
                                        <h3 className={styles.videoTitle}>{getTitle(video)}</h3>
                                        <p className={styles.videoDesc}>
                                            {getDesc(video)?.substring(0, 80)}{getDesc(video)?.length > 80 && '...'}
                                        </p>

                                        {/* Progress bar */}
                                        {video.progress && !video.progress.completed && (
                                            <div style={{ marginTop: '10px' }}>
                                                <div className="progress-bar">
                                                    <div className="progress-bar-fill" style={{ width: `${video.progress.progress_percent}%` }}></div>
                                                </div>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                    {video.progress.progress_percent}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function LessonsPage() {
    return (
        <ClientLayout>
            <LessonsContent />
        </ClientLayout>
    );
}
