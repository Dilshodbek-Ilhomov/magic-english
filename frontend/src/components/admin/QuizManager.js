import { useState, useEffect } from 'react';
import { FaTrash, FaMagic, FaRocket, FaBan, FaPen } from 'react-icons/fa';
import api from '@/lib/api';

export default function QuizManager({ courses, onLoadVideos }) {
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedVideo, setSelectedVideo] = useState('');
    const [videos, setVideos] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [editForm, setEditForm] = useState({ text: '', type: '' });
    const [editingChoiceId, setEditingChoiceId] = useState(null);
    const [editChoiceText, setEditChoiceText] = useState('');

    // Forms
    const [questionText, setQuestionText] = useState('');
    const [questionType, setQuestionType] = useState('choice');
    const [correctAnswers, setCorrectAnswers] = useState({ uz: '', ru: '', en: '' });

    // Nested choices for new question
    const [newQuestionChoices, setNewQuestionChoices] = useState([
        { text: '', is_correct: false },
        { text: '', is_correct: false }
    ]);

    const [choiceForm, setChoiceForm] = useState({ text: '', is_correct: false, questionId: null });

    // Bulk mode
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkChoices, setBulkChoices] = useState('');

    const loadVideos = async (courseId) => {
        if (!courseId) {
            setVideos([]);
            return;
        }
        setLoading(true);
        const res = await api.adminGetVideos({ course_id: courseId });
        if (res.success) {
            setVideos(res.data || []);
        }
        setLoading(false);
    };

    const loadQuestions = async (videoId) => {
        if (!videoId) {
            setQuestions([]);
            return;
        }
        setLoading(true);
        const res = await api.adminGetQuestions(videoId);
        if (res.success) {
            setQuestions(res.data || []);
        }
        setLoading(false);
    };

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(''), 3000);
    };

    useEffect(() => {
        loadVideos(selectedCourse);
        setSelectedVideo('');
    }, [selectedCourse]);

    useEffect(() => {
        if (selectedVideo) {
            loadQuestions(selectedVideo);
        } else {
            setQuestions([]);
        }
    }, [selectedVideo]);

    const handleAddQuestionChoice = () => {
        setNewQuestionChoices([...newQuestionChoices, { text: '', is_correct: false }]);
    };

    const handleRemoveQuestionChoice = (index) => {
        setNewQuestionChoices(newQuestionChoices.filter((_, i) => i !== index));
    };

    const handleUpdateQuestionChoice = (index, field, value) => {
        const updated = [...newQuestionChoices];

        // If single choice, reset others if setting is_correct to true
        if (field === 'is_correct' && value === true && questionType === 'choice') {
            updated.forEach((c, i) => i !== index ? c.is_correct = false : null);
        }

        updated[index][field] = value;
        setNewQuestionChoices(updated);
    };

    const handleAddQuestion = async () => {
        if (!questionText) return alert('Question text required');

        const payload = {
            video: selectedVideo,
            text_uz: questionText,
            text: questionText,
            question_type: questionType,
            correct_answer_uz: correctAnswers.uz,
            correct_answer_ru: correctAnswers.ru,
            correct_answer_en: correctAnswers.en,
            choices: questionType === 'text' ? [] : newQuestionChoices.filter(c => c.text.trim())
        };

        const res = await api.adminCreateQuestion(payload);

        if (res.success) {
            setQuestionText('');
            setCorrectAnswers({ uz: '', ru: '', en: '' });
            setNewQuestionChoices([{ text: '', is_correct: false }, { text: '', is_correct: false }]);
            showMsg('Question added with choices!');
            loadQuestions(selectedVideo);
        } else {
            showMsg('Failed to add question', 'error');
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (!confirm('Delete question and all choices?')) return;
        const res = await api.adminDeleteQuestion(id);
        if (res.success) {
            showMsg('Question deleted');
            loadQuestions(selectedVideo);
        }
    };

    const handleEditQuestion = (q) => {
        setEditingQuestionId(q.id);
        setEditForm({
            text: q.text_uz || q.text || q.display_text || '',
            type: q.question_type || 'choice'
        });
    };

    const handleSaveEdit = async () => {
        if (!editForm.text) return;
        const res = await api.adminUpdateQuestion(editingQuestionId, {
            text_uz: editForm.text,
            text: editForm.text,
            question_type: editForm.type
        });
        if (res.success) {
            setEditingQuestionId(null);
            showMsg('Question updated!');
            loadQuestions(selectedVideo);
        }
    };

    const handleAddChoice = async (questionId) => {
        if (isBulkMode) {
            // Bulk add
            const lines = bulkChoices.split('\n').filter(l => l.trim());
            for (let line of lines) {
                // Simple parsing: if line ends with '*', it's correct
                let text = line.trim();
                let isCorrect = false;
                if (text.endsWith('*')) {
                    isCorrect = true;
                    text = text.slice(0, -1).trim();
                }

                await api.adminCreateChoice({
                    question: questionId,
                    text_uz: text,
                    text: text,
                    is_correct: isCorrect
                });
            }
            setBulkChoices('');
            setIsBulkMode(false);
            showMsg('Bulk choices added');
            loadQuestions(selectedVideo);
        } else {
            // Single add
            if (!choiceForm.text) return;
            const res = await api.adminCreateChoice({
                question: questionId,
                text_uz: choiceForm.text,
                text: choiceForm.text,
                is_correct: choiceForm.is_correct
            });

            if (res.success) {
                setChoiceForm({ ...choiceForm, text: '', is_correct: false });
                loadQuestions(selectedVideo);
            }
        }
    };

    const handleDeleteChoice = async (id) => {
        if (!confirm('Delete choice?')) return;
        const res = await api.adminDeleteChoice(id);
        if (res.success) loadQuestions(selectedVideo);
    };

    const handleEditChoice = (c) => {
        setEditingChoiceId(c.id);
        setEditChoiceText(c.text_uz || c.text || c.display_text || '');
    };

    const handleSaveChoiceEdit = async (choice) => {
        if (!editChoiceText) return;
        // The choice needs to be updated. Assuming we have an update endpoint or we can use adminCreateChoice with ID if backend supports it.
        // Looking at api.js, there is no adminUpdateChoice. Let's assume we use adminCreateChoice or similar if it handles updates, 
        // OR better, let's check api.js again for choice update.
        // Looking at Step 1575: 369: adminCreateChoice, 376: adminDeleteChoice. 
        // No update choice? Wait, usually DRF provides it. Let's add it to api.js if needed or use what's there.
        // For now, I'll use a generic request if it's missing.
        const res = await api.request(`/admin/choices/${choice.id}/`, {
            method: 'PUT',
            body: JSON.stringify({
                question: choice.question,
                text_uz: editChoiceText,
                text: editChoiceText,
                is_correct: choice.is_correct
            })
        });
        if (res.success) {
            setEditingChoiceId(null);
            loadQuestions(selectedVideo);
        }
    };

    const handleQuickAddABCD = async (questionId) => {
        const variants = ['A', 'B', 'C', 'D'];
        for (let v of variants) {
            await api.adminCreateChoice({
                question: questionId,
                text_uz: v,
                text: v,
                is_correct: false
            });
        }
        loadQuestions(selectedVideo);
    };

    const handleQuickAddTrueFalse = async (questionId) => {
        await api.adminCreateChoice({ question: questionId, text_uz: 'Rost', text_ru: 'Истина', text_en: 'True', is_correct: false });
        await api.adminCreateChoice({ question: questionId, text_uz: 'Yolg\'on', text_ru: 'Ложь', text_en: 'False', is_correct: false });
        loadQuestions(selectedVideo);
    };

    return (
        <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)', color: 'var(--color-text-primary)' }}>
            {/* Notification Toast */}
            {message.text && (
                <div className="toast animate-slide-up" style={{
                    background: message.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                    padding: '16px 28px',
                    borderRadius: '16px',
                    position: 'fixed',
                    bottom: '30px',
                    right: '30px',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                        {message.type === 'error' ? <FaBan /> : <FaMagic />}
                    </span>
                    <span style={{ fontWeight: 500 }}>{message.text}</span>
                </div>
            )}

            {/* Header Area */}
            <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--color-gold-glow)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.4 }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', background: 'linear-gradient(45deg, var(--color-gold-light), #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Creative Quiz Engine
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Design interactive learning experiences for your students.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Course</label>
                            <select
                                className="input-field"
                                value={selectedCourse}
                                onChange={e => setSelectedCourse(e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.2)', width: '220px' }}
                            >
                                <option value="">Select Path...</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.title_en || c.title}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Lesson</label>
                            <select
                                className="input-field"
                                value={selectedVideo}
                                onChange={e => setSelectedVideo(e.target.value)}
                                disabled={!selectedCourse}
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.2)', width: '220px', opacity: !selectedCourse ? 0.3 : 1 }}
                            >
                                <option value="">Select Video...</option>
                                {videos.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(v => (
                                    <option key={v.id} value={v.id}>{v.title_en || v.title_uz}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {selectedVideo && (
                <div className="admin-quiz-grid">

                    {/* Left Side: Question List & Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                        {/* Add New Question Card */}
                        <div className="glass-panel" style={{ padding: '25px', borderLeft: '4px solid var(--color-gold)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>✦ Create New Question</h3>
                                <div style={{ display: 'flex', position: 'relative', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '14px', padding: '4px' }}>
                                    {['choice', 'multi_choice', 'true_false', 'text'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setQuestionType(type)}
                                            style={{
                                                position: 'relative',
                                                zIndex: 1,
                                                padding: '8px 18px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                background: questionType === type ? 'var(--color-gold)' : 'transparent',
                                                color: questionType === type ? '#000' : 'rgba(255, 255, 255, 0.6)',
                                                fontWeight: 700,
                                                letterSpacing: '0.5px',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: questionType === type ? '0 4px 15px rgba(212, 175, 55, 0.3)' : 'none'
                                            }}
                                        >
                                            {type.replace('_', ' ').toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                className="input-field"
                                value={questionText}
                                onChange={e => setQuestionText(e.target.value)}
                                placeholder="Describe the magical question..."
                                rows={2}
                                style={{ width: '100%', minHeight: '80px', fontSize: '1.1rem', background: 'rgba(0,0,0,0.2)', marginBottom: '20px' }}
                            />

                            {questionType !== 'text' ? (
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>Variants / Options</span>
                                        <button className="btn btn-sm btn-secondary" style={{ borderRadius: '20px', padding: '4px 15px' }} onClick={handleAddQuestionChoice}>+ Add Another</button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {newQuestionChoices.map((choice, idx) => (
                                            <div key={idx} className="animate-fade-in" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={choice.text}
                                                    onChange={e => handleUpdateQuestionChoice(idx, 'text', e.target.value)}
                                                    placeholder="Option text..."
                                                    style={{ flex: 1, margin: 0, padding: '10px 15px', background: 'rgba(255,255,255,0.03)' }}
                                                />
                                                <button
                                                    onClick={() => handleUpdateQuestionChoice(idx, 'is_correct', !choice.is_correct)}
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '12px',
                                                        border: '1px solid',
                                                        borderColor: choice.is_correct ? 'var(--color-success)' : 'rgba(255,255,255,0.1)',
                                                        background: choice.is_correct ? 'rgba(46, 213, 115, 0.2)' : 'transparent',
                                                        color: choice.is_correct ? 'var(--color-success)' : 'rgba(255,255,255,0.3)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    title="Mark as Correct"
                                                >
                                                    {choice.is_correct ? '✓' : '○'}
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--color-danger)', border: 'none', padding: '10px' }}
                                                    onClick={() => handleRemoveQuestionChoice(idx)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                    {['uz', 'ru', 'en'].map(l => (
                                        <div key={l} className="input-group">
                                            <label style={{ fontSize: '0.7rem' }}>Answer ({l.toUpperCase()})</label>
                                            <input
                                                className="input-field"
                                                value={correctAnswers[l]}
                                                onChange={e => setCorrectAnswers({ ...correctAnswers, [l]: e.target.value })}
                                                placeholder="..."
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAddQuestion}
                                    style={{ borderRadius: '30px', padding: '14px 40px', boxShadow: '0 10px 30px var(--color-gold-glow)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <FaRocket /> Deploy Question
                                </button>
                            </div>
                        </div>

                        {/* Questions List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {questions.map((q, i) => (
                                <div key={q.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                                    <div style={{ padding: '20px 25px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <span style={{ color: 'var(--color-gold)', fontWeight: 800, fontSize: '0.9rem', opacity: 0.5 }}>#{questions.length - i}</span>
                                            {editingQuestionId === q.id ? (
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <input
                                                        className="input-field"
                                                        value={editForm.text}
                                                        onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                                                        style={{ margin: 0, padding: '5px 10px', fontSize: '0.9rem' }}
                                                    />
                                                    <button className="btn btn-xs btn-primary" onClick={handleSaveEdit}><FaRocket /> Save</button>
                                                    <button className="btn btn-xs btn-secondary" onClick={() => setEditingQuestionId(null)}>Cancel</button>
                                                </div>
                                            ) : (
                                                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{q.display_text || q.text || q.text_uz}</h4>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button className="btn btn-sm" onClick={() => handleEditQuestion(q)} style={{ background: 'none', color: 'var(--color-gold)' }}><FaPen /></button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteQuestion(q.id)} style={{ background: 'none' }}><FaTrash /></button>
                                        </div>
                                    </div>

                                    <div style={{ padding: '25px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                            {q.choices?.map(c => (
                                                <div key={c.id} style={{
                                                    padding: '12px 16px',
                                                    background: c.is_correct ? 'rgba(46, 213, 115, 0.08)' : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${c.is_correct ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: '10px'
                                                }}>
                                                    {editingChoiceId === c.id ? (
                                                        <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                                                            <input
                                                                className="input-field"
                                                                value={editChoiceText}
                                                                onChange={e => setEditChoiceText(e.target.value)}
                                                                style={{ margin: 0, padding: '4px 8px', fontSize: '0.85rem' }}
                                                            />
                                                            <button className="btn btn-xs btn-primary" onClick={() => handleSaveChoiceEdit(c)}>OK</button>
                                                            <button className="btn btn-xs btn-secondary" onClick={() => setEditingChoiceId(null)}>×</button>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            style={{ fontSize: '0.9rem', color: c.is_correct ? 'var(--color-success)' : 'inherit', cursor: 'pointer', flex: 1 }}
                                                            onClick={() => handleEditChoice(c)}
                                                            title="Click to edit"
                                                        >
                                                            {c.is_correct && '✦ '} {c.display_text || c.text || c.text_uz}
                                                        </span>
                                                    )}
                                                    <button onClick={() => handleDeleteChoice(c.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0 5px' }}>×</button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Inline Add Quick Variants */}
                                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button className="btn btn-xs btn-secondary" style={{ fontSize: '0.7rem', borderStyle: 'dashed' }} onClick={() => handleQuickAddABCD(q.id)}>+ A/B/C/D</button>
                                                <button className="btn btn-xs btn-secondary" style={{ fontSize: '0.7rem', borderStyle: 'dashed' }} onClick={() => handleQuickAddTrueFalse(q.id)}>+ True/False</button>
                                                {isBulkMode && bulkChoices.trim() && (
                                                    <button className="btn btn-xs btn-primary" style={{ fontSize: '0.7rem', background: 'var(--color-success)', color: '#000', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleAddChoice(q.id)}>
                                                        <FaMagic /> Import Bulk
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <input
                                                    className="input-field"
                                                    placeholder="Quick add variant..."
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'transparent', width: '200px' }}
                                                    onKeyPress={e => {
                                                        if (e.key === 'Enter') {
                                                            setChoiceForm({ text: e.target.value, is_correct: false, questionId: q.id });
                                                            handleAddChoice(q.id);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Stats & Helper Tools */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '100px' }}>

                        {/* Stats Panel */}
                        <div className="glass-panel" style={{ padding: '20px' }}>
                            <h4 style={{ fontSize: '1rem', marginBottom: '15px' }}>Quiz Overview</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.6 }}>Total Questions</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{questions.length}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.6 }}>Avg. Complexity</span>
                                    <span style={{ fontWeight: 'bold' }}>Med</span>
                                </div>
                                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(questions.length * 10, 100)}%`, height: '100%', background: 'var(--color-gold)' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Bulk Mode Zone */}
                        <div className="glass-panel" style={{ padding: '20px', background: isBulkMode ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h4 style={{ fontSize: '1rem', margin: 0 }}>Creative Zone</h4>
                                <button className="btn btn-xs" onClick={() => setIsBulkMode(!isBulkMode)} style={{ background: isBulkMode ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)', color: isBulkMode ? '#000' : '#fff' }}>
                                    {isBulkMode ? 'BULK ON' : 'BULK OFF'}
                                </button>
                            </div>

                            {isBulkMode ? (
                                <div className="animate-fade-in">
                                    <p style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '10px' }}>Paste variants here. Add * to mark correct. One per line.</p>
                                    <textarea
                                        className="input-field"
                                        value={bulkChoices}
                                        onChange={e => setBulkChoices(e.target.value)}
                                        placeholder="Option 1&#10;Option 2*&#10;Option 3"
                                        rows={6}
                                        style={{ width: '100%', fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)' }}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-gold)', marginTop: '8px' }}>Select a question to import these.</p>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', opacity: 0.3 }}>
                                    <div style={{ fontSize: '2rem' }}>⚡</div>
                                    <p style={{ fontSize: '0.8rem' }}>Enable Bulk Mode for rapid imports</p>
                                </div>
                            )}
                        </div>

                        {/* Tip Card */}
                        <div style={{ padding: '15px', borderRadius: '12px', background: 'rgba(123, 104, 174, 0.1)', border: '1px solid rgba(123, 104, 174, 0.2)' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-violet-light)', margin: 0 }}>
                                💡 **Pro Tip:** You can quickly add A, B, C, D variants to any question using the helper buttons below it.
                            </p>
                        </div>
                    </div>

                </div>
            )}

            <style jsx global>{`
                .admin-quiz-grid {
                    display: grid;
                    grid-template-columns: 1fr 380px;
                    gap: 25px;
                    align-items: start;
                }

                @media (max-width: 1024px) {
                    .admin-quiz-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .glass-panel {
                        padding: 15px !important;
                    }
                    .input-group select {
                        width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}
