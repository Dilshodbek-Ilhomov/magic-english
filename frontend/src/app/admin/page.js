'use client';

/**
 * Admin Dashboard - Full Management Panel
 * Videos, Users, Analytics, Security Logs, Courses
 */

import { useState, useEffect } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';
import CMSManager from '@/components/admin/CMSManager';
import QuizManager from '@/components/admin/QuizManager';
import { FaChartBar, FaBook, FaUsers, FaVideo, FaClipboardList, FaLock, FaChartLine, FaCheckCircle, FaPen, FaPlus, FaTrash, FaSave, FaUpload } from 'react-icons/fa';
import { MdSpaceDashboard } from 'react-icons/md';

function AdminContent() {
    const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
    const { t } = useLanguage();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [dashboard, setDashboard] = useState(null);
    const [users, setUsers] = useState([]);
    const [videos, setVideos] = useState([]);
    const [courses, setCourses] = useState([]); // New: Courses state
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ text: '', type: '' });

    // User form
    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [userForm, setUserForm] = useState({
        username: '', password: '',
        first_name: '', last_name: '',
        email: '', role: 'student',
        allowed_courses: [] // Array of course IDs
    });

    // Video form
    const [showVideoForm, setShowVideoForm] = useState(false);
    const [editingVideoId, setEditingVideoId] = useState(null);
    const [videoForm, setVideoForm] = useState({
        title: '', description: '',
        level: 'beginner', duration_seconds: 0, is_published: true, course: '', order_index: 0
    });
    const [videoFile, setVideoFile] = useState(null);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Course form (New)
    const [showCourseForm, setShowCourseForm] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState(null);
    const [courseForm, setCourseForm] = useState({
        title: '', description: '',
        telegram_group_url: '',
        daily_limit: 0,
        allowed_days: '0,1,2,3,4,5,6'
    });
    const [courseThumbnailFile, setCourseThumbnailFile] = useState(null);

    // Analytics state
    const [analyticsTab, setAnalyticsTab] = useState('students');
    const [studentProgress, setStudentProgress] = useState([]);
    const [quizPerformance, setQuizPerformance] = useState([]);



    const handleSaveUser = async () => {
        if (!userForm.username) {
            showMsg('Username is required!', 'error');
            return;
        }

        if (!editingUserId && !userForm.password) {
            showMsg('Password is required for new users!', 'error');
            return;
        }

        let res;
        if (editingUserId) {
            // Remove password if empty for update
            const payload = { ...userForm };
            if (!payload.password) delete payload.password;
            res = await api.updateUser(editingUserId, payload);
        } else {
            res = await api.createUser(userForm);
        }

        if (res.success) {
            setShowUserForm(false);
            setEditingUserId(null);
            setUserForm({
                username: '', password: '',
                first_name: '', last_name: '',
                email: '', role: 'student',
                daily_limit: 0,
                allowed_courses: []
            });
            showMsg(editingUserId ? '✅ User updated successfully!' : '✅ User created successfully!');
            loadTabData();
        } else {
            showMsg('❌ ' + (res.error?.message || 'Failed to save user'), 'error');
        }
    };

    const handleEditUser = (user) => {
        setEditingUserId(user.id);
        setUserForm({
            username: user.username,
            password: '', // Don't show old password
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            role: user.role || 'student',
            daily_limit: user.daily_limit || 0,
            allowed_courses: user.allowed_courses || []
        });
        setShowUserForm(true);
    };

    // ...

    const toggleCourseSelection = (courseId) => {
        const current = userForm.allowed_courses || [];
        if (current.includes(courseId)) {
            setUserForm({ ...userForm, allowed_courses: current.filter(id => id !== courseId) });
        } else {
            setUserForm({ ...userForm, allowed_courses: [...current, courseId] });
        }
    };

    const handleBlockUser = async (id) => {
        const res = await api.toggleBlockUser(id);
        if (res.success) {
            showMsg('User updated');
            loadTabData();
        }
    };

    const handleDeleteUser = async (id) => {
        if (confirm('Are you sure you want to delete this user?')) {
            const res = await api.deleteUser(id);
            if (res.success) {
                showMsg('User deleted');
                loadTabData();
            }
        }
    };

    // === Course Actions ===
    const handleSaveCourse = async () => {
        if (!courseForm.title) {
            showMsg('Title is required!', 'error');
            return;
        }
        const isFormData = !!courseThumbnailFile;
        let payload;

        if (isFormData) {
            payload = new FormData();
            payload.append('title_en', courseForm.title);
            payload.append('title_uz', courseForm.title);
            payload.append('title_ru', courseForm.title);
            payload.append('description_en', courseForm.description || '');
            payload.append('description_uz', courseForm.description || '');
            payload.append('description_ru', courseForm.description || '');
            payload.append('telegram_group_url', courseForm.telegram_group_url || '');
            payload.append('daily_limit', courseForm.daily_limit || 0);
            payload.append('allowed_days', courseForm.allowed_days || '0,1,2,3,4,5,6');
            if (courseThumbnailFile) {
                payload.append('thumbnail', courseThumbnailFile);
            }
        } else {
            payload = {
                title_en: courseForm.title,
                title_uz: courseForm.title,
                title_ru: courseForm.title,
                description_en: courseForm.description,
                description_uz: courseForm.description,
                description_ru: courseForm.description,
                telegram_group_url: courseForm.telegram_group_url,
                daily_limit: courseForm.daily_limit,
                allowed_days: courseForm.allowed_days
            };
        }

        let res;
        if (editingCourseId) {
            res = await api.adminUpdateCourse(editingCourseId, payload);
        } else {
            res = await api.adminCreateCourse(payload);
        }

        if (res.success) {
            setShowCourseForm(false);
            setEditingCourseId(null);
            setCourseForm({
                title: '', description: '',
                telegram_group_url: '',
                daily_limit: 0,
                allowed_days: '0,1,2,3,4,5,6'
            });
            setCourseThumbnailFile(null);
            showMsg(editingCourseId ? '✅ Course updated successfully!' : '✅ Course created successfully!');
            loadTabData();
        } else {
            showMsg('❌ ' + (res.error?.message || 'Failed to save course'), 'error');
        }
    };

    const handleEditCourse = (course) => {
        setEditingCourseId(course.id);
        // Helper to pick the best available title/desc
        const title = course.title_en || course.title || course.title_uz || '';
        const desc = course.description_en || course.description || course.description_uz || '';

        setCourseForm({
            title: title,
            description: desc,
            telegram_group_url: course.telegram_group_url || '',
            daily_limit: course.daily_limit || 0,
            allowed_days: course.allowed_days || '0,1,2,3,4,5,6'
        });
        setCourseThumbnailFile(null);
        setShowCourseForm(true);
    };

    const handleDeleteCourse = async (id) => {
        if (confirm('Are you sure you want to delete this course? All associated videos might be affected.')) {
            const res = await api.adminDeleteCourse(id);
            if (res.success) {
                showMsg('Course deleted');
                loadTabData();
            } else {
                showMsg('❌ ' + (res.error?.message || 'Failed to delete course'), 'error');
            }
        }
    };

    const handleUploadVideo = async () => {
        if (!videoForm.title || !videoFile) {
            showMsg('Title and video file are required!', 'error');
            return;
        }

        const formData = new FormData();
        // Backend expects title_en (required), title_uz, title_ru
        formData.append('title_en', videoForm.title);
        formData.append('title_uz', videoForm.title);
        formData.append('title_ru', videoForm.title);

        // Backend expects description_en, description_uz, description_ru
        formData.append('description_en', videoForm.description);
        formData.append('description_uz', videoForm.description);
        formData.append('description_ru', videoForm.description);

        formData.append('level', videoForm.level);
        if (videoForm.order_index !== undefined) {
            formData.append('order_index', videoForm.order_index);
        } else {
            formData.append('order_index', 0);
        }

        if (videoForm.course) {
            formData.append('course', videoForm.course);
        }

        if (videoFile) {
            formData.append('video_file', videoFile);
        }
        if (thumbnailFile) {
            formData.append('thumbnail', thumbnailFile);
        }

        setUploading(true);
        setUploadProgress(0);

        let res;
        if (editingVideoId) {
            // Update
            res = await api.adminUpdateVideo(editingVideoId, formData);
        } else {
            // Create
            res = await api.adminCreateVideo(formData, (progress) => {
                setUploadProgress(progress);
            });
        }

        setUploading(false);
        if (res.success) {
            setShowVideoForm(false);
            setEditingVideoId(null);
            setVideoForm({
                title: '', description: '',
                level: 'beginner', duration_seconds: 0, order_index: 0, is_published: true, course: ''
            });
            setVideoFile(null);
            setThumbnailFile(null);
            showMsg(editingVideoId ? '✅ Video updated successfully!' : '✅ Video uploaded successfully!');
            loadTabData();
        } else {
            showMsg('❌ ' + (res.error?.message || 'Failed to save video'), 'error');
        }
    };

    const handleEditVideo = (video) => {
        setEditingVideoId(video.id);
        setVideoForm({
            title: video.title_en || video.title || '',
            description: video.description_en || video.description || '',
            level: video.level || 'beginner',
            course: video.course || '',
            order_index: video.order_index || 0,
            is_published: video.is_published
        });
        setVideoFile(null);
        setThumbnailFile(null);
        setShowVideoForm(true);
    };

    const handleDeleteVideo = async (id) => {
        if (confirm('Are you sure you want to delete this video?')) {
            const res = await api.adminDeleteVideo(id);
            if (res.success) {
                showMsg('Video deleted');
                loadTabData();
            }
        }
    };

    const toggleVideoForm = () => {
        if (showVideoForm) {
            setShowVideoForm(false);
            setEditingVideoId(null);
        } else {
            setShowVideoForm(true);
            setEditingVideoId(null);
            setVideoForm({
                title: '', description: '',
                level: 'beginner', duration_seconds: 0, order_index: 0, is_published: true, course: ''
            });
            setVideoFile(null);
            setThumbnailFile(null);
        }
    };

    const toggleCourseForm = () => {
        if (showCourseForm) {
            // Closing
            setShowCourseForm(false);
            setEditingCourseId(null);
            setCourseForm({ title: '', description: '', course_type: 'standard', custom_course_type: '', telegram_group_url: '' });
        } else {
            // Opening (New)
            setShowCourseForm(true);
            setEditingCourseId(null);
            setCourseForm({ title: '', description: '', course_type: 'standard', custom_course_type: '', telegram_group_url: '' });
        }
    };

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    useEffect(() => {
        if (isAuthenticated && isAdmin) {
            loadTabData();
        }
    }, [isAuthenticated, isAdmin, activeTab]);

    const loadTabData = async () => {
        setLoading(true);
        if (activeTab === 'dashboard') {
            const res = await api.getDashboard();
            if (res.success) setDashboard(res.data);
        } else if (activeTab === 'users') {
            const res = await api.getUsers();
            const courseRes = await api.adminGetCourses(); // Need courses for assignment UI
            if (res.success) setUsers(res.data);
            if (courseRes.success) setCourses(courseRes.data);
        } else if (activeTab === 'videos') {
            const res = await api.adminGetVideos();
            const courseRes = await api.adminGetCourses();
            if (res.success) setVideos(res.data);
            if (courseRes.success) setCourses(courseRes.data);
        } else if (activeTab === 'courses') {
            const res = await api.adminGetCourses();
            if (res.success) setCourses(res.data);
        } else if (activeTab === 'analytics') {
            const res = await api.getDashboard(); // Get summary
            const progressRes = await api.request('/admin/analytics/students/');
            const quizRes = await api.request('/admin/analytics/quizzes/');
            if (res.success) setDashboard(res.data);
            if (progressRes.success) setStudentProgress(progressRes.data);
            if (quizRes.success) setQuizPerformance(quizRes.data);
        } else if (activeTab === 'logs') {
            const res = await api.getSecurityLogs();
            if (res.success) setLogs(res.data);
        } else if (activeTab === 'tests') {
            const res = await api.adminGetCourses();
            if (res.success) setCourses(res.data);
        }
        setLoading(false);
    };

    if (authLoading) {
        return (
            <div className="loading-container">
                <div className="magical-spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated || !isAdmin) {
        return (
            <div className="main-content" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <h2>⛔ Access Denied</h2>
                <p>You don't have permission to view this page.</p>
                <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Go Home</button>
            </div>
        );
    }

    const tabs = [
        { key: 'dashboard', label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MdSpaceDashboard /> Dashboard</div> },
        { key: 'courses', label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaBook /> Courses</div> },
        { key: 'users', label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaUsers /> Users</div> },
        { key: 'videos', label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaVideo /> Videos</div> },
        { key: 'tests', label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaClipboardList /> Tests</div> },
        { key: 'cms', label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaChartLine /> CMS</div> },
        { key: 'analytics', label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaChartBar /> Analytics</div> },
        { key: 'logs', label: <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaLock /> Logs</div> },
    ];



    const handleTabChange = (tabKey) => {
        setActiveTab(tabKey);
        if (tabKey === 'cms') return;
    };

    // renderLangTabs function removed

    const handleTogglePublish = async (video) => {
        const newStatus = !video.is_published;
        // Optimistic update
        setVideos(videos.map(v => v.id === video.id ? { ...v, is_published: newStatus } : v));

        const res = await api.adminUpdateVideo(video.id, { is_published: newStatus });
        if (res.success) {
            showMsg(newStatus ? '✅ Video published' : 'Video unpublished');
        } else {
            // Revert on failure
            setVideos(videos.map(v => v.id === video.id ? { ...v, is_published: !newStatus } : v));
            showMsg('❌ Failed to update status', 'error');
        }
    };

    return (
        <div className="main-content" style={{ animation: 'fadeIn 0.5s ease' }}>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaLock style={{ color: 'var(--color-gold)' }} /> Admin Dashboard</h1>
            </div>

            {/* Message toast */}
            {message.text && (
                <div style={{
                    padding: '12px 20px',
                    marginBottom: '20px',
                    borderRadius: 'var(--radius-sm)',
                    background: message.type === 'error' ? 'rgba(255,71,87,0.12)' : 'rgba(46,213,115,0.12)',
                    border: `1px solid ${message.type === 'error' ? 'rgba(255,71,87,0.3)' : 'rgba(46,213,115,0.3)'}`,
                    color: message.type === 'error' ? '#FF4757' : '#2ed573',
                    fontSize: '0.9rem',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    {message.text}
                </div>
            )}

            {/* Tab navigation */}
            <div style={adminStyles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleTabChange(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading-container" style={{ minHeight: '40vh' }}>
                    <div className="magical-spinner"></div>
                </div>
            ) : (
                <>
                    {/* DASHBOARD */}
                    {activeTab === 'dashboard' && dashboard && (
                        <div>
                            <div className="grid grid-4" style={{ marginBottom: '30px' }}>
                                <div className="stat-card">
                                    <div className="stat-icon">👥</div>
                                    <div className="stat-info">
                                        <h3>{dashboard.users?.total || 0}</h3>
                                        <p>Total Users</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(46,213,115,0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaCheckCircle /></div>
                                    <div className="stat-info">
                                        <h3>{dashboard.users?.active || 0}</h3>
                                        <p>Active Users</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(123,104,174,0.1)', color: 'var(--color-violet)' }}>🎬</div>
                                    <div className="stat-info">
                                        <h3>{dashboard.videos?.total || 0}</h3>
                                        <p>Total Videos</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(84,160,255,0.1)', color: 'var(--color-info)' }}>👁️</div>
                                    <div className="stat-info">
                                        <h3>{dashboard.videos?.total_views || 0}</h3>
                                        <p>Total Views</p>
                                    </div>
                                </div>
                            </div>

                            {/* Top videos */}
                            {dashboard?.top_videos?.length > 0 && (
                                <div className="card">
                                    <h3 style={{ marginBottom: '16px' }}>⭐ Top Videos</h3>
                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Video</th>
                                                    <th>Level</th>
                                                    <th>Views</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dashboard.top_videos.map((v, i) => (
                                                    <tr key={v.id}>
                                                        <td>{i + 1}</td>
                                                        <td>{v.title_en}</td>
                                                        <td><span className={`badge badge-${v.level}`}>{v.level}</span></td>
                                                        <td>{v.views_count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* COURSES (NEW) */}
                    {activeTab === 'courses' && (
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <button className="btn btn-primary btn-sm" onClick={toggleCourseForm}>
                                    {showCourseForm ? 'Cancel' : '➕ Create New Course'}
                                </button>
                            </div>

                            {showCourseForm && (
                                <div className="card" style={{ marginBottom: '24px' }}>
                                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {editingCourseId ? <><FaPen /> Edit Course</> : <><FaPlus /> Create Course</>}
                                    </h3>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div className="input-group">
                                            <label>Title *</label>
                                            <input className="input-field" value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="Kurs nomi" />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div className="input-group">
                                            <label>Description</label>
                                            <textarea className="input-field" rows={3} value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Kurs haqida umumiy ma'lumot" />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div className="input-group">
                                            <label>Telegram Group URL</label>
                                            <input
                                                className="input-field"
                                                value={courseForm.telegram_group_url}
                                                onChange={e => setCourseForm({ ...courseForm, telegram_group_url: e.target.value })}
                                                placeholder="https://t.me/example_chat"
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Daily Limit (0 = max)</label>
                                            <input
                                                className="input-field"
                                                type="number"
                                                min="0"
                                                value={courseForm.daily_limit}
                                                onChange={e => setCourseForm({ ...courseForm, daily_limit: parseInt(e.target.value) || 0 })}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div className="input-group">
                                            <label>Allowed Days (0=Mon...6=Sun)</label>
                                            <input
                                                className="input-field"
                                                type="text"
                                                value={courseForm.allowed_days}
                                                onChange={e => setCourseForm({ ...courseForm, allowed_days: e.target.value })}
                                                placeholder="0,1,2,3,4,5,6"
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Thumbnail Image</label>
                                            <input type="file" accept="image/*" className="input-field" onChange={(e) => setCourseThumbnailFile(e.target.files[0])} style={{ padding: '8px' }} />
                                            {courseThumbnailFile && <small style={{ color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>🖼️ {courseThumbnailFile.name}</small>}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                        <button className="btn btn-primary btn-sm" onClick={handleSaveCourse}>
                                            {editingCourseId ? 'Save Changes' : 'Create Course'}
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={toggleCourseForm}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Title</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courses.map(c => (
                                            <tr key={c.id}>
                                                <td>{c.id}</td>
                                                <td>{c.title_en || c.title || c.title_uz}</td>
                                                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="btn btn-sm btn-secondary" onClick={() => handleEditCourse(c)}>
                                                            <FaPen /> Edit
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCourse(c.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <FaTrash /> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* USERS */}
                    {activeTab === 'users' && (
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                    setEditingUserId(null);
                                    setUserForm({
                                        username: '', password: '',
                                        first_name: '', last_name: '',
                                        email: '', role: 'student',
                                        daily_limit: 0,
                                        allowed_courses: []
                                    });
                                    setShowUserForm(!showUserForm);
                                }}>
                                    {showUserForm ? 'Cancel' : '➕ New User'}
                                </button>
                            </div>

                            {showUserForm && (
                                <div className="card" style={{ marginBottom: '24px' }}>
                                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {editingUserId ? <><FaPen /> Edit User</> : <><FaPlus /> Create New User</>}
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="input-group">
                                            <label>Username *</label>
                                            <input className="input-field" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
                                        </div>
                                        <div className="input-group">
                                            <label>{editingUserId ? 'New Password (Optional)' : 'Password *'}</label>
                                            <input className="input-field" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                                        </div>
                                        <div className="input-group">
                                            <label>Email</label>
                                            <input className="input-field" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                                        </div>
                                        <div className="input-group">
                                            <label>Role</label>
                                            <select className="input-field" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                                                <option value="student">Student</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>Daily Video Limit (0 = max)</label>
                                            <input className="input-field" type="number" min="0" value={userForm.daily_limit} onChange={(e) => setUserForm({ ...userForm, daily_limit: parseInt(e.target.value) || 0 })} />
                                        </div>
                                    </div>

                                    {/* Course Assignment for Students */}
                                    {userForm.role === 'student' && (
                                        <div style={{ marginTop: '20px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>📚 Assign Courses to Student</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                                {courses.map(course => (
                                                    <label key={course.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={userForm.allowed_courses?.includes(course.id)}
                                                            onChange={() => toggleCourseSelection(course.id)}
                                                        />
                                                        <span style={{ fontSize: '0.9rem' }}>{course.title_en || course.title}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '8px' }}>
                                                * Check courses to grant access. Admin users have access to all courses by default.
                                            </p>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                        <button className="btn btn-primary btn-sm" onClick={handleSaveUser} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {editingUserId ? <><FaSave /> Update User</> : <><FaCheckCircle /> Create User</>}
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setShowUserForm(false)}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td>{u.id}</td>
                                                <td>{u.username}</td>
                                                <td><span className={`badge badge-${u.role === 'admin' ? 'admin' : 'beginner'}`}>{u.role}</span></td>
                                                <td>
                                                    <span style={{ color: u.is_blocked ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                                        {u.is_blocked ? '🔴 Blocked' : '🟢 Active'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => handleEditUser(u)}>Edit</button>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => handleBlockUser(u.id)}>
                                                            {u.is_blocked ? 'Unblock' : 'Block'}
                                                        </button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id)}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* VIDEOS */}
                    {activeTab === 'videos' && (
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <button className="btn btn-primary btn-sm" onClick={toggleVideoForm}>
                                    {showVideoForm ? 'Cancel' : '➕ Upload New Video'}
                                </button>
                            </div>

                            {showVideoForm && (
                                <div className="card" style={{ marginBottom: '24px' }}>
                                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {editingVideoId ? <><FaPen /> Edit Video Lesson</> : <><FaPlus /> Upload New Video Lesson</>}
                                    </h3>

                                    <div style={{ marginBottom: '20px' }}>
                                        <div className="input-group">
                                            <label>Title *</label>
                                            <input className="input-field" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} placeholder="Video dars nomi" />
                                        </div>
                                        <div className="input-group" style={{ marginTop: '10px' }}>
                                            <label>Description</label>
                                            <textarea className="input-field" rows={3} value={videoForm.description} onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })} placeholder="Video haqida qisqacha"></textarea>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
                                        <div className="input-group">
                                            <label>Course</label>
                                            <select className="input-field" value={videoForm.course || ''} onChange={e => setVideoForm({ ...videoForm, course: e.target.value })}>
                                                <option value="">-- Select Course --</option>
                                                {courses.map(c => (
                                                    <option key={c.id} value={c.id}>{c.title_en || c.title || c.title_uz}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>Level</label>
                                            <select className="input-field" value={videoForm.level} onChange={(e) => setVideoForm({ ...videoForm, level: e.target.value })}>
                                                <option value="beginner">Beginner</option>
                                                <option value="intermediate">Intermediate</option>
                                                <option value="advanced">Advanced</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                                        <div className="input-group">
                                            <label>Video File {editingVideoId ? '(optional)' : '*'} (MP4, WebM)</label>
                                            <input type="file" accept="video/*" className="input-field" onChange={(e) => setVideoFile(e.target.files[0])} />
                                            {videoFile && <small style={{ color: 'var(--color-text-muted)' }}>📁 {videoFile.name}</small>}
                                        </div>
                                        <div className="input-group">
                                            <label>Thumbnail Image (optional)</label>
                                            <input type="file" accept="image/*" className="input-field" onChange={(e) => setThumbnailFile(e.target.files[0])} />
                                            {thumbnailFile && <small style={{ color: 'var(--color-text-muted)' }}>🖼️ {thumbnailFile.name}</small>}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {uploading && (
                                        <div style={{ marginTop: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--color-gold)' }}>Uploading... {uploadProgress}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${uploadProgress}%`,
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, var(--color-gold), var(--color-gold-light))',
                                                    transition: 'width 0.2s',
                                                }}></div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                        <button className="btn btn-primary" onClick={handleUploadVideo} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                            {uploading ? <><FaUpload /> Saving...</> : editingVideoId ? <><FaSave /> Save Changes</> : <><FaCheckCircle /> Upload Video</>}
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setShowVideoForm(false); setEditingVideoId(null); }} disabled={uploading}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Title</th>
                                            <th>Course</th>
                                            <th>Level</th>
                                            <th>Views</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {videos.map(v => (
                                            <tr key={v.id}>
                                                <td>{v.id}</td>
                                                <td style={{ fontWeight: 500 }}>{v.title_en || v.title_uz}</td>
                                                <td>{v.course_title || '-'}</td>
                                                <td><span className={`badge badge-${v.level}`}>{v.level}</span></td>
                                                <td>{v.views_count}</td>
                                                <td>
                                                    <button
                                                        className={`btn btn-xs ${v.is_published ? 'btn-success' : 'btn-secondary'}`}
                                                        onClick={() => handleTogglePublish(v)}
                                                        style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                                    >
                                                        {v.is_published ? '👁️ Published' : '🙈 Hidden'}
                                                    </button>
                                                </td>
                                                <td style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleEditVideo(v)}>
                                                        <FaPen />
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteVideo(v.id)}>
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                    {/* ANALYTICS */}
                    {activeTab === 'analytics' && (
                        <div className="card">
                            <div className="tab-header" style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                <button
                                    className={`btn btn-sm ${analyticsTab === 'students' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setAnalyticsTab('students')}
                                    style={{ marginRight: '10px' }}
                                >
                                    Student Progress
                                </button>
                                <button
                                    className={`btn btn-sm ${analyticsTab === 'quizzes' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setAnalyticsTab('quizzes')}
                                >
                                    Quiz Performance
                                </button>
                            </div>

                            {analyticsTab === 'students' ? (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th>Date Joined</th>
                                                <th>Completed Videos</th>
                                                <th>Total Watch Time</th>
                                                <th>Quizzes Taken</th>
                                                <th>Avg Quiz Score</th>
                                                <th>Last Active</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentProgress.map(s => (
                                                <tr key={s.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold' }}>{s.full_name || s.username}</div>
                                                        <div style={{ fontSize: '0.8em', opacity: 0.7 }}>@{s.username}</div>
                                                    </td>
                                                    <td>{new Date(s.date_joined).toLocaleDateString()}</td>
                                                    <td>{s.completed_videos}</td>
                                                    <td>
                                                        {Math.floor((s.total_watched_seconds || 0) / 3600)}h {Math.floor(((s.total_watched_seconds || 0) % 3600) / 60)}m {(s.total_watched_seconds || 0) % 60}s
                                                    </td>
                                                    <td>{s.total_quizzes_taken}</td>
                                                    <td>
                                                        <span className={`badge ${s.avg_quiz_score >= 70 ? 'badge-success' : s.avg_quiz_score > 0 ? 'badge-warning' : ''}`}>
                                                            {s.avg_quiz_score}%
                                                        </span>
                                                    </td>
                                                    <td>{s.last_active ? new Date(s.last_active).toLocaleString() : 'Never'}</td>
                                                </tr>
                                            ))}
                                            {studentProgress.length === 0 && (
                                                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No student data available</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Video Title</th>
                                                <th>Course</th>
                                                <th>Total Attempts</th>
                                                <th>Avg Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {quizPerformance.map(q => (
                                                <tr key={q.id}>
                                                    <td>{q.title}</td>
                                                    <td>{q.course}</td>
                                                    <td>{q.attempts}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${q.avg_score}%`, background: q.avg_score >= 70 ? '#00e676' : '#ffea00', height: '100%' }}></div>
                                                            </div>
                                                            <span>{q.avg_score}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {quizPerformance.length === 0 && (
                                                <tr><td colSpan="4" style={{ textAlign: 'center' }}>No quiz data available</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LOGS */}
                    {activeTab === 'logs' && (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>User</th>
                                        <th>Action</th>
                                        <th>IP Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id}>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td>{log.username}</td>
                                            <td>
                                                <span className="badge badge-admin" style={{
                                                    background: log.action === 'login' ? 'rgba(46,213,115,0.1)' : 'rgba(212,175,55,0.1)',
                                                    color: log.action === 'login' ? 'var(--color-success)' : 'var(--color-gold)',
                                                }}>
                                                    {log.action_display || log.action}
                                                </span>
                                            </td>
                                            <td>{log.ip_address}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* CMS EDITOR */}


                    {/* QUIZZES */}
                    {activeTab === 'tests' && (
                        <QuizManager courses={courses} />
                    )}
                </>
            )}
        </div>
    );
}




const adminStyles = {
    tabs: {
        display: 'flex',
        gap: '8px',
        marginBottom: '30px',
        flexWrap: 'wrap',
        borderBottom: '1px solid rgba(212,175,55,0.08)',
        paddingBottom: '16px',
    },
};

export default function AdminPage() {
    return (
        <ClientLayout>
            <AdminContent />
        </ClientLayout>
    );
}
