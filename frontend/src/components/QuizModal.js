'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import api from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { FaTrophy, FaBook } from 'react-icons/fa';

const QuizModal = ({ video, onClose, onFinish }) => {
    const { t, lang } = useLanguage();
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0); // 0 = intro, 1..N = questions, result = special state

    const questions = video?.questions || [];

    const handleAnswerChange = (qId, value, type) => {
        if (type === 'multi_choice') {
            setAnswers(prev => {
                const current = prev[qId] || [];
                if (current.includes(value)) {
                    return { ...prev, [qId]: current.filter(id => id !== value) };
                } else {
                    return { ...prev, [qId]: [...current, value] };
                }
            });
        } else {
            setAnswers(prev => ({ ...prev, [qId]: value }));
        }
    };

    const isSelected = (qId, choiceId, type) => {
        if (type === 'multi_choice') {
            return (answers[qId] || []).some(id => String(id) === String(choiceId));
        }
        return String(answers[qId]) === String(choiceId);
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < questions.length) {
            if (!confirm(t('quiz_unanswered_confirm'))) return;
        }

        setLoading(true);
        const res = await api.submitQuiz(video.id, answers);
        if (res.success) {
            setResult(res.data);
            if (res.data.passed) {
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#D4AF37', '#7B68AE', '#00f2fe', '#4facfe', '#2ED573']
                });
            } else {
                confetti({
                    particleCount: 80,
                    spread: 120,
                    origin: { y: 0.6 },
                    colors: ['#FF4757', '#ffffff']
                });
            }
            if (onFinish) onFinish(res.data);
        } else {
            alert(res.error?.message || 'Xatolik yuz berdi');
        }
        setLoading(false);
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
        },
        exit: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }
    };

    const questionVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            rotateY: direction > 0 ? 45 : -45
        }),
        center: {
            x: 0,
            opacity: 1,
            rotateY: 0,
            transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 20 }
        },
        exit: (direction) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            rotateY: direction < 0 ? 45 : -45,
            transition: { duration: 0.3 }
        })
    };

    if (result) {
        return (
            <div className="quiz-modal-overlay" style={modalStyles.overlay}>
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="quiz-modal-content"
                    style={modalStyles.content}
                >
                    <div style={modalStyles.resultHeader}>
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            style={{ ...modalStyles.resultEmoji, display: 'flex', justifyContent: 'center' }}
                        >
                            {result.passed ? <FaTrophy style={{ color: 'var(--color-gold)' }} /> : <FaBook style={{ color: 'var(--color-text-muted)' }} />}
                        </motion.div>
                        <h2 style={{ ...modalStyles.resultTitle, color: result.passed ? 'var(--color-success)' : 'var(--color-warning)' }}>
                            {result.passed ? t('quiz_passed') : t('quiz_failed')}
                        </h2>
                    </div>

                    <div style={modalStyles.resultBody}>
                        <div style={modalStyles.scoreCircle}>
                            <svg viewBox="0 0 100 100" style={modalStyles.svg}>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                <motion.circle
                                    cx="50" cy="50" r="45" fill="none"
                                    stroke={result.passed ? '#22c55e' : '#eab308'}
                                    strokeWidth="6"
                                    strokeDasharray="283"
                                    initial={{ strokeDashoffset: 283 }}
                                    animate={{ strokeDashoffset: 283 - (283 * result.score) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div style={modalStyles.scoreText}>
                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                                    {result.score}%
                                </motion.span>
                                <small style={{ fontSize: '0.8rem', opacity: 0.5 }}>{t('quiz_result_score')}</small>
                            </div>
                        </div>

                        <p style={modalStyles.resultStats}>
                            {t('quiz_correct_out_of').replace('{total}', result.total_questions).split('/')[0]}
                            <span style={{ color: result.passed ? '#22c55e' : '#eab308', fontWeight: '800' }}>{result.correct_count}</span>
                            {t('quiz_correct_out_of').replace('{total}', result.total_questions).split('/')[1]}
                        </p>

                        <div style={modalStyles.actions}>
                            <button className="btn-glass" onClick={onClose} style={{ flex: 1 }}>{t('close')}</button>
                            {!result.passed && (
                                <button className="btn-premium" onClick={() => {
                                    setResult(null);
                                    setAnswers({});
                                    setCurrentStep(0);
                                }} style={{ flex: 2 }}>{t('quiz_retry')}</button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (currentStep === 0) {
        return (
            <div className="quiz-modal-overlay" style={modalStyles.overlay}>
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="quiz-modal-content" style={modalStyles.content}>
                    <button onClick={onClose} style={modalStyles.closeBtnTop}>×</button>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div className="quiz-intro-icon" style={modalStyles.introIcon}>✨</div>
                        <h2 className="quiz-intro-title" style={modalStyles.introTitle}>{video[`title_${lang}`] || video.title_en}</h2>
                        <p style={modalStyles.introSub}>{t('quiz_test_knowledge')}</p>

                        <div style={modalStyles.introMeta}>
                            <div className="quiz-meta-item" style={modalStyles.metaItem}>
                                <span className="meta-val" style={modalStyles.metaVal}>{questions.length}</span>
                                <span style={modalStyles.metaLabel}>{t('stats_videos').split(' ')[1]}</span>
                            </div>
                            <div style={modalStyles.metaDivider} />
                            <div className="quiz-meta-item" style={modalStyles.metaItem}>
                                <span className="meta-val" style={modalStyles.metaVal}>80%</span>
                                <span style={modalStyles.metaLabel}>Passing</span>
                            </div>
                        </div>

                        <button className="btn-premium" onClick={() => setCurrentStep(1)} style={{ width: '100%', padding: '18px', marginTop: '30px' }}>
                            {t('quiz_practice')} 🚀
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const q = questions[currentStep - 1];

    return (
        <div className="quiz-modal-overlay" style={modalStyles.overlay}>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="quiz-modal-content" style={modalStyles.content}>
                {/* Header / Progress */}
                <div style={modalStyles.header}>
                    <div style={modalStyles.progressContainer}>
                        <div style={modalStyles.progressBar}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(currentStep / questions.length) * 100}%` }}
                                style={modalStyles.progressFill}
                            />
                        </div>
                        <span style={modalStyles.progressText}>{currentStep} / {questions.length}</span>
                    </div>
                    <button onClick={onClose} style={modalStyles.closeBtn}>×</button>
                </div>

                <div style={modalStyles.scrollArea}>
                    <AnimatePresence mode="wait" custom={1}>
                        <motion.div
                            key={q.id}
                            custom={1}
                            variants={questionVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            style={{ width: '100%' }}
                        >
                            <h3 className="quiz-question-text" style={modalStyles.questionText}>{q.display_text || q[`text_${lang}`] || q.text || q.text_uz}</h3>

                            {q.question_type === 'text' ? (
                                <div style={{ marginTop: '20px' }}>
                                    <input
                                        className="input-field-premium"
                                        placeholder={t('quiz_type_answer')}
                                        value={answers[q.id] || ''}
                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                        style={modalStyles.textInput}
                                    />
                                </div>
                            ) : (
                                <div style={modalStyles.choicesGrid}>
                                    {!q.choices || q.choices.length === 0 ? (
                                        <p style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>
                                            (Variantlar yuklanmadi yoki mavjud emas)
                                        </p>
                                    ) : (
                                        q.choices.map((choice, cIdx) => {
                                            const selected = isSelected(q.id, choice.id, q.question_type);
                                            return (
                                                <motion.button
                                                    key={choice.id || cIdx}
                                                    className="quiz-choice-btn"
                                                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleAnswerChange(q.id, choice.id, q.question_type)}
                                                    style={{
                                                        ...modalStyles.choiceBtn,
                                                        background: selected ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255,255,255,0.04)',
                                                        borderColor: selected ? 'var(--color-gold)' : 'rgba(255,255,255,0.12)',
                                                        boxShadow: selected ? '0 0 25px rgba(212, 175, 55, 0.15)' : 'none',
                                                        borderWidth: selected ? '2px' : '1px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
                                                        <div style={{
                                                            ...modalStyles.choiceIndicator,
                                                            background: selected ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)',
                                                            color: selected ? '#000' : 'rgba(255,255,255,0.4)'
                                                        }}>
                                                            {String.fromCharCode(65 + cIdx)}
                                                        </div>
                                                        <span style={{
                                                            color: selected ? '#fff' : 'rgba(255,255,255,0.7)',
                                                            fontWeight: selected ? '600' : '400',
                                                            fontSize: '1.05rem',
                                                            textAlign: 'left'
                                                        }}>
                                                            {choice.display_text || choice.text || choice[`text_${lang}`] || choice.text_uz || "Option"}
                                                        </span>
                                                        {selected && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={modalStyles.checkIcon}>✓</motion.span>}
                                                    </div>
                                                </motion.button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div style={modalStyles.footer}>
                    <button
                        className="btn-glass"
                        disabled={currentStep === 1}
                        onClick={() => setCurrentStep(prev => prev - 1)}
                        style={{ opacity: currentStep === 1 ? 0 : 1 }}
                    >
                        ← {t('back')}
                    </button>

                    {currentStep < questions.length ? (
                        <button className="btn-premium" onClick={() => setCurrentStep(prev => prev + 1)}>
                            {t('lessons_continue')} →
                        </button>
                    ) : (
                        <button className="btn-premium" onClick={handleSubmit} disabled={loading}>
                            {loading ? t('quiz_checking') : t('quiz_submit')}
                        </button>
                    )}
                </div>
            </motion.div>

            <style jsx global>{`
                .btn-glass {
                    padding: 12px 24px;
                    border-radius: 14px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s;
                }
                .btn-glass:hover:not(:disabled) {
                    background: rgba(255,255,255,0.1);
                    border-color: rgba(255,255,255,0.2);
                }
                .btn-premium {
                    padding: 12px 30px;
                    border-radius: 14px;
                    background: linear-gradient(135deg, var(--color-gold), #fff);
                    border: none;
                    color: #000;
                    cursor: pointer;
                    font-weight: 700;
                    box-shadow: 0 10px 20px rgba(212, 175, 55, 0.2);
                    transition: all 0.3s;
                }
                .btn-premium:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px rgba(212, 175, 55, 0.3);
                }
                .input-field-premium {
                    width: 100%;
                    padding: 16px 20px;
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 14px;
                    color: white;
                    outline: none;
                    font-size: 1.1rem;
                    transition: all 0.3s;
                }
                .input-field-premium:focus {
                    border-color: var(--color-gold);
                    background: rgba(0,0,0,0.4);
                }

                @media (max-width: 768px) {
                    .quiz-modal-content {
                        padding: 25px 20px !important;
                        border-radius: 24px !important;
                        width: calc(100% - 30px) !important;
                        max-height: 90vh !important;
                    }
                    .quiz-modal-overlay {
                        padding: 0 !important;
                    }
                    h2.quiz-intro-title {
                        font-size: 1.5rem !important;
                    }
                    .quiz-intro-icon {
                        font-size: 3rem !important;
                    }
                    .quiz-meta-item .meta-val {
                        font-size: 1.2rem !important;
                    }
                    h3.quiz-question-text {
                        font-size: 1.1rem !important;
                        margin-bottom: 20px !important;
                    }
                    button.quiz-choice-btn {
                        padding: 14px 16px !important;
                    }
                    button.quiz-choice-btn span {
                        font-size: 0.95rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

const modalStyles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(15px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    },
    content: {
        background: 'rgba(26, 26, 46, 0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        width: '100%',
        maxWidth: '650px',
        maxHeight: '85vh',
        borderRadius: '32px',
        padding: '35px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
    },
    closeBtnTop: {
        position: 'absolute',
        top: '20px',
        right: '25px',
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '2rem',
        cursor: 'pointer'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
    },
    progressContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flex: 1
    },
    progressBar: {
        flex: 1,
        height: '8px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, var(--color-gold), #fff)',
        borderRadius: '4px'
    },
    progressText: {
        fontSize: '0.85rem',
        fontWeight: '700',
        color: 'var(--color-gold)',
        minWidth: '45px'
    },
    closeBtn: {
        background: 'rgba(255,255,255,0.05)',
        border: 'none',
        color: 'white',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        cursor: 'pointer',
        marginLeft: '15px'
    },
    scrollArea: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px 0'
    },
    questionText: {
        fontSize: '1.4rem',
        fontWeight: '700',
        lineHeight: '1.4',
        marginBottom: '30px',
        textAlign: 'center',
        color: '#fff'
    },
    choicesGrid: {
        display: 'grid',
        gap: '12px',
        width: '100%'
    },
    choiceBtn: {
        display: 'flex',
        alignItems: 'center',
        padding: '18px 22px',
        borderRadius: '18px',
        border: '1px solid',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        fontSize: '1.1rem',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
    },
    choiceIndicator: {
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '15px',
        fontSize: '0.8rem',
        fontWeight: '800'
    },
    checkIcon: {
        marginLeft: 'auto',
        color: 'var(--color-gold)',
        fontSize: '1.2rem'
    },
    footer: {
        marginTop: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '15px'
    },
    introIcon: {
        fontSize: '4rem',
        marginBottom: '20px'
    },
    introTitle: {
        fontSize: '1.8rem',
        marginBottom: '10px',
        background: 'linear-gradient(45deg, #fff, var(--color-gold))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    introSub: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: '1rem',
        marginBottom: '30px'
    },
    introMeta: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '30px',
        background: 'rgba(255,255,255,0.03)',
        padding: '20px',
        borderRadius: '20px'
    },
    metaItem: {
        display: 'flex',
        flexDirection: 'column'
    },
    metaVal: {
        fontSize: '1.4rem',
        fontWeight: '800',
        color: '#fff'
    },
    metaLabel: {
        fontSize: '0.75rem',
        opacity: 0.5,
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    metaDivider: {
        width: '1px',
        height: '30px',
        background: 'rgba(255,255,255,0.1)'
    },
    resultHeader: {
        textAlign: 'center',
        marginBottom: '40px'
    },
    resultEmoji: {
        fontSize: '6rem',
        marginBottom: '20px'
    },
    resultTitle: {
        fontSize: '2.2rem',
        fontWeight: '900',
        margin: 0
    },
    resultBody: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    scoreCircle: {
        position: 'relative',
        width: '160px',
        height: '160px',
        marginBottom: '30px'
    },
    svg: {
        transform: 'rotate(-90deg)',
        width: '100%',
        height: '100%'
    },
    scoreText: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2.5rem',
        fontWeight: '900',
        color: '#fff'
    },
    resultStats: {
        fontSize: '1.2rem',
        opacity: 0.8,
        marginBottom: '40px',
        color: '#fff'
    },
    actions: {
        display: 'flex',
        gap: '15px',
        width: '100%'
    }
};

export default QuizModal;
