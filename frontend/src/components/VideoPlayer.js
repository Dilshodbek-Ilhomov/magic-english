import React, { useState, useRef, useEffect } from 'react';
import styles from './VideoPlayer.module.css';
import api from '@/lib/api';
import {
    FaPlay, FaPause, FaVolumeUp, FaVolumeMute,
    FaExpand, FaCompress, FaCog, FaRedo,
    FaForward, FaBackward, FaTachometerAlt
} from 'react-icons/fa';

const VideoPlayer = ({ videoId, user, src, poster, sources, initialProgress = 0, onProgressUpdate }) => {
    const videoRef = useRef(null);
    const progressRef = useRef(null);
    const containerRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [muted, setMuted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [playbackError, setPlaybackError] = useState(null);
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [lastAction, setLastAction] = useState(null); // For center icon animation
    const controlsTimeoutRef = useRef(null);
    const actionTimeoutRef = useRef(null);
    const maxTimeRef = useRef(0);
    const [isFullyWatched, setIsFullyWatched] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Initial state from localStorage
    useEffect(() => {
        const savedVolume = localStorage.getItem('video_volume');
        if (savedVolume !== null) {
            const v = parseFloat(savedVolume);
            setVolume(v);
            if (videoRef.current) videoRef.current.volume = v;
        }
        const savedSpeed = localStorage.getItem('video_speed');
        if (savedSpeed !== null) {
            const s = parseFloat(savedSpeed);
            setPlaybackRate(s);
            if (videoRef.current) videoRef.current.playbackRate = s;
        }

        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Sync videoSrc with src prop from parent
    const [videoSrc, setVideoSrc] = useState(src);
    useEffect(() => {
        setVideoSrc(src);
    }, [src]);

    // Quality state
    const [qualities, setQualities] = useState([]);
    const [currentQuality, setCurrentQuality] = useState('Auto');

    useEffect(() => {
        const available = [];
        const safeSources = sources || {};

        if (safeSources['360p']) available.push({ label: '360p', src: safeSources['360p'] });
        if (safeSources['480p']) available.push({ label: '480p', src: safeSources['480p'] });
        if (safeSources['720p']) available.push({ label: '720p', src: safeSources['720p'] });
        if (safeSources['1080p']) available.push({ label: '1080p', src: safeSources['1080p'] });

        if (available.length === 0 && src) {
            available.push({ label: 'Auto', src: src });
            available.push({ label: '360p', src: src });
            available.push({ label: '720p', src: src });
        } else if (src && !available.find(a => a.label === 'Auto')) {
            available.unshift({ label: 'Auto', src: src });
        }

        setQualities(available);
    }, [src, sources]);

    const triggerAction = (action) => {
        setLastAction(action);
        if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
        actionTimeoutRef.current = setTimeout(() => setLastAction(null), 800);
    };

    const changeQuality = (quality) => {
        if (quality.label === currentQuality) return;
        const time = videoRef.current.currentTime;
        const wasPlaying = !videoRef.current.paused;
        setVideoSrc(quality.src);
        setCurrentQuality(quality.label);
        setLoading(true);
        setTimeout(() => {
            if (videoRef.current) {
                videoRef.current.currentTime = time;
                if (wasPlaying) videoRef.current.play();
            }
        }, 150);
    };

    const changeSpeed = (rate) => {
        setPlaybackRate(rate);
        videoRef.current.playbackRate = rate;
        localStorage.setItem('video_speed', rate);
        setShowSpeedMenu(false);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger if user is typing in an input
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowRight':
                    seek(10);
                    triggerAction('forward');
                    break;
                case 'ArrowLeft':
                    seek(-10);
                    triggerAction('backward');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    adjustVolume(0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    adjustVolume(-0.1);
                    break;
                case 'KeyF':
                    toggleFullscreen();
                    break;
                case 'KeyM':
                    toggleMute();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [playing, volume, muted, isFullscreen]);

    const seek = (seconds) => {
        if (!videoRef.current) return;
        let newTime = videoRef.current.currentTime + seconds;
        if (newTime < 0) newTime = 0;

        // Prevent seeking forward beyond maxTime
        if (newTime > maxTimeRef.current && !isFullyWatched) {
            newTime = maxTimeRef.current;
        }

        videoRef.current.currentTime = newTime;
    };

    const adjustVolume = (delta) => {
        let newVol = Math.min(1, Math.max(0, volume + delta));
        setVolume(newVol);
        if (videoRef.current) videoRef.current.volume = newVol;
        localStorage.setItem('video_volume', newVol);
        setMuted(newVol === 0);
    };

    // Initial progress sync
    useEffect(() => {
        if (videoRef.current && initialProgress > 0) {
            videoRef.current.currentTime = initialProgress;
            setCurrentTime(initialProgress);
            maxTimeRef.current = initialProgress;
        }
    }, [initialProgress, videoSrc]);

    const formatTime = (time) => {
        if (isNaN(time)) return "00:00";
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        const s = Math.floor(time % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        if (videoRef.current.paused) {
            videoRef.current.play().then(() => {
                setPlaying(true);
                triggerAction('play');
            }).catch(() => { });
        } else {
            videoRef.current.pause();
            setPlaying(false);
            triggerAction('pause');
        }
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const current = videoRef.current.currentTime;

        // Prevent skipping ahead
        if (!isFullyWatched && current > maxTimeRef.current + 2) {
            videoRef.current.currentTime = maxTimeRef.current;
            return;
        }

        if (current > maxTimeRef.current) {
            maxTimeRef.current = current;
        }

        if (current >= duration * 0.98) {
            setIsFullyWatched(true);
        }

        setCurrentTime(current);

        // Update buffered
        if (videoRef.current.buffered.length > 0) {
            const lastBuffer = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
            setBuffered(lastBuffer);
        }
    };

    const handleLoadedMetadata = () => {
        setDuration(videoRef.current.duration);
        setLoading(false);
        // Apply saved speed
        videoRef.current.playbackRate = playbackRate;
    };

    const handleProgressClick = (e) => {
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const targetTime = pos * duration;

        if (isFullyWatched || targetTime <= maxTimeRef.current) {
            videoRef.current.currentTime = targetTime;
        } else {
            videoRef.current.currentTime = maxTimeRef.current;
        }
    };

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        videoRef.current.volume = val;
        setMuted(val === 0);
        localStorage.setItem('video_volume', val);
    };

    const toggleMute = () => {
        const newMuted = !muted;
        setMuted(newMuted);
        videoRef.current.muted = newMuted;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleDoubleClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) {
            seek(-10);
            triggerAction('backward');
        } else {
            seek(10);
            triggerAction('forward');
        }
    };

    // Heartbeat logic for tracking
    useEffect(() => {
        let lastSyncTime = 0;
        const syncProgress = () => {
            if (videoRef.current && videoId) {
                const current = videoRef.current.currentTime;
                if (Math.abs(current - lastSyncTime) < 2) return;
                lastSyncTime = current;

                api.updateProgress(videoId, {
                    watched_seconds: Math.floor(current),
                    completed: current >= duration * 0.9 || isFullyWatched
                }).catch(() => { });
            }
        };

        const interval = setInterval(() => { if (playing) syncProgress(); }, 15000);
        const handleBeforeUnload = () => syncProgress();
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            syncProgress();
        };
    }, [playing, videoId, duration, isFullyWatched]);

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (playing && !showSettings && !showSpeedMenu) setShowControls(false);
        }, 3000);
    };

    const getCenterIcon = () => {
        switch (lastAction) {
            case 'play': return <FaPlay />;
            case 'pause': return <FaPause />;
            case 'forward': return <><FaForward /><span style={{ fontSize: '1rem', marginLeft: '5px' }}>+10s</span></>;
            case 'backward': return <><FaBackward /><span style={{ fontSize: '1rem', marginRight: '5px' }}>-10s</span></>;
            default: return null;
        }
    };

    return (
        <div
            ref={containerRef}
            className={`${styles.videoContainer} ${playing ? '' : styles.paused} ${isFullscreen ? styles.fullscreen : ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => playing && !showSettings && !showSpeedMenu && setShowControls(false)}
        >
            {loading && <div className={styles.loader}></div>}

            {lastAction && (
                <div key={lastAction} className={styles.centerActionIcon}>
                    {getCenterIcon()}
                </div>
            )}

            {/* Watermark */}
            {user && (
                <div className={styles.watermark}>
                    {user.username} ({user.id})
                </div>
            )}

            <video
                ref={videoRef}
                className={styles.videoElement}
                src={videoSrc}
                poster={poster}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setLoading(true)}
                onPlaying={() => setLoading(false)}
                onCanPlay={() => setLoading(false)}
                onEnded={() => setPlaying(false)}
                onDoubleClick={handleDoubleClick}
                onClick={togglePlay}
                onTouchStart={handleMouseMove}
                onContextMenu={(e) => e.preventDefault()}
                controlsList="nodownload"
                disablePictureInPicture
                playsInline
            />

            {playbackError && (
                <div className={styles.errorOverlay}>
                    <FaRedo className={styles.errorIcon} />
                    <p>{playbackError}</p>
                    <button className="btn btn-sm btn-primary" onClick={() => window.location.reload()}>Qayta urinish</button>
                </div>
            )}

            {!playing && !loading && !playbackError && (
                <div className={styles.centerPlayBtn} onClick={togglePlay}><FaPlay /></div>
            )}

            <div className={styles.controlsOverlay} style={{ opacity: showControls ? 1 : 0 }}>
                {/* Progress Bar with Buffer */}
                <div className={styles.progressContainer} ref={progressRef} onClick={handleProgressClick}>
                    <div
                        className={styles.bufferBar}
                        style={{ width: `${(buffered / duration) * 100}%` }}
                    ></div>
                    <div
                        className={styles.progressBar}
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    ></div>
                </div>

                <div className={styles.controlsRow}>
                    <div className={styles.leftControls}>
                        <button className={styles.controlBtn} onClick={togglePlay}>
                            {playing ? <FaPause /> : <FaPlay />}
                        </button>

                        <div className={styles.volumeGroup}>
                            <button className={styles.controlBtn} onClick={toggleMute}>
                                {muted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
                            </button>
                            <div className={styles.volumeContainer}>
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={muted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className={styles.volumeSlider}
                                />
                            </div>
                        </div>

                        <span className={styles.timeDisplay}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className={styles.rightControls}>
                        {/* Speed Selector */}
                        <div className={styles.settingsGroup}>
                            <button
                                className={`${styles.settingsBtn} ${showSpeedMenu ? styles.active : ''}`}
                                onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowSettings(false); }}
                            >
                                <FaTachometerAlt style={{ marginRight: '5px' }} /> {playbackRate}x
                            </button>
                            {showSpeedMenu && (
                                <div className={styles.settingsMenu}>
                                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                        <div
                                            key={rate}
                                            className={`${styles.menuItem} ${playbackRate === rate ? styles.active : ''}`}
                                            onClick={() => changeSpeed(rate)}
                                        >
                                            {rate === 1 ? 'Normal' : `${rate}x`}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quality Selector */}
                        <div className={styles.settingsGroup}>
                            <button
                                className={`${styles.settingsBtn} ${showSettings ? styles.active : ''}`}
                                onClick={() => { setShowSettings(!showSettings); setShowSpeedMenu(false); }}
                            >
                                <FaCog style={{ marginRight: '5px' }} /> {currentQuality}
                            </button>
                            {showSettings && (
                                <div className={styles.settingsMenu}>
                                    {qualities.map(q => (
                                        <div
                                            key={q.label}
                                            className={`${styles.menuItem} ${currentQuality === q.label ? styles.active : ''}`}
                                            onClick={() => { changeQuality(q); setShowSettings(false); }}
                                        >
                                            {q.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button className={styles.controlBtn} onClick={toggleFullscreen}>
                            {isFullscreen ? <FaCompress /> : <FaExpand />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
