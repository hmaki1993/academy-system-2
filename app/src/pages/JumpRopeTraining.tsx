import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Play, Square, RefreshCcw, Activity, Pause, Camera, Volume2, VolumeX, TrendingUp, Trophy, Clock, Zap, ArrowLeft, X, Loader2 } from 'lucide-react';
import Webcam from 'react-webcam';
import { useAddJumpRopeSession } from '../hooks/useData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

export default function JumpRopeTraining() {
    const navigate = useNavigate();
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { mutate: addSession, isPending: isSaving } = useAddJumpRopeSession();

    // --- Core State ---
    const [isTracking, setIsTracking] = useState(true);
    const [jumps, setJumps] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [setupStatus, setSetupStatus] = useState<'MOVING' | 'STEP_BACK' | 'READY'>('MOVING');
    const [movementPct, setMovementPct] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [activeSeconds, setActiveSeconds] = useState(0);
    const [totalSeconds, setTotalSeconds] = useState(0);
    const [intensityStatus, setIntensityStatus] = useState<'WORKING' | 'RESTING' | 'READY'>('READY');
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [rpm, setRpm] = useState(0);
    const [finalRestSecs, setFinalRestSecs] = useState(0);
    const [currentRestSecs, setCurrentRestSecs] = useState(0);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const isSessionActiveRef = useRef(false);
    
    // Countdown Timer State
    const [countdownMins, setCountdownMins] = useState(0);
    const [countdownSecs, setCountdownSecs] = useState(0);
    const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [showTimerPicker, setShowTimerPicker] = useState(false);
    const minsScrollRef = useRef<HTMLDivElement>(null);
    const secsScrollRef = useRef<HTMLDivElement>(null);
    const ITEM_H = 44;
    const MIN_OPTIONS = Array.from({length: 21}, (_, i) => i);
    const SEC_OPTIONS = Array.from({length: 12}, (_, i) => i * 5);

    const openTimerPicker = () => {
        setShowTimerPicker(true);
        setTimeout(() => {
            if (minsScrollRef.current) minsScrollRef.current.scrollTop = countdownMins * ITEM_H;
            const sIdx = SEC_OPTIONS.indexOf(countdownSecs);
            if (secsScrollRef.current) secsScrollRef.current.scrollTop = (sIdx >= 0 ? sIdx : 0) * ITEM_H;
        }, 60);
    };

    const handleMinsScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const idx = Math.round(e.currentTarget.scrollTop / ITEM_H);
        setCountdownMins(MIN_OPTIONS[Math.min(idx, MIN_OPTIONS.length - 1)] ?? 0);
    };

    const handleSecsScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const idx = Math.round(e.currentTarget.scrollTop / ITEM_H);
        setCountdownSecs(SEC_OPTIONS[Math.min(idx, SEC_OPTIONS.length - 1)] ?? 0);
    };

    // --- Voice Synthesis ---
    const speak = useCallback((text: string) => {
        if (!voiceEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    }, [voiceEnabled]);

    // --- Detection Refs ---
    const jumpCountRef = useRef(0);
    const jumpStatusRef = useRef<'standing' | 'jumping'>('standing');
    const baselineY = useRef<number | null>(null);
    const baselineHipY = useRef<number | null>(null);
    const bodyHeightRef = useRef<number>(200);
    const peakY = useRef<number>(0);
    const lastCenterX = useRef<number>(0);
    const lastCenterY = useRef<number>(0);
    const lastShoulderWidth = useRef<number>(0);
    const lastDisplacementRef = useRef<number>(0);
    const emaSmoothY = useRef<number | null>(null);
    const isStableRef = useRef(false);
    const stabilityStartRef = useRef<number | null>(null);
    const trackingLossStartRef = useRef<number | null>(null);
    const lastValidTimeRef = useRef<number>(0); // Fix for multi-person snapping
    const velocityRef = useRef(0);
    const lastFrameTime = useRef(Date.now());
    const lastActivityTimeRef = useRef(0);
    const workTimeRef = useRef(0);
    const restTimeRef = useRef(0);
    const timerRemainingRef = useRef<number | null>(null);
    const intensityHistoryRef = useRef<any[]>([]);
    const cooldownRef = useRef(false);
    const isTimerStartedRef = useRef(false);
    const isTimerActiveRef = useRef(false); // mirrors isTimerActive state to avoid stale closure
    const smoothedVelXRef = useRef(0); // EMA of horizontal velocity

    const handleVideoLoad = () => {
        setIsLoading(false);
        setError(null);
    };

    const handleCameraError = (err: any) => {
        setError("Camera failed. Please check permissions.");
        setIsLoading(false);
    };

    const onResults = useCallback((results: any) => {
        if (!canvasRef.current || !results.poseLandmarks || !webcamRef.current?.video) return;
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        // Sync canvas size to video for accurate drawing overlay
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        const W = canvas.width;
        const H = canvas.height;
        const now = Date.now();
        const deltaTime = (now - lastFrameTime.current) / 1000;
        if (deltaTime < 0.001) return;
        lastFrameTime.current = now;

        canvasCtx.clearRect(0, 0, W, H);

        // Draw Tracking Skeleton (AI Vision rendering)
        canvasCtx.fillStyle = '#ff3b30'; // Primary Color
        canvasCtx.strokeStyle = 'rgba(255, 59, 48, 0.4)';
        canvasCtx.lineWidth = 2;

        const connect = (p1: any, p2: any) => {
            if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {
                canvasCtx.beginPath();
                canvasCtx.moveTo(p1.x * W, p1.y * H);
                canvasCtx.lineTo(p2.x * W, p2.y * H);
                canvasCtx.stroke();
            }
        };

        const drawPoint = (p: any, radius = 4) => {
            if (p && p.visibility > 0.5) {
                canvasCtx.beginPath();
                canvasCtx.arc(p.x * W, p.y * H, radius, 0, 2 * Math.PI);
                canvasCtx.fill();
            }
        };

        const LM = results.poseLandmarks;
        const lShoulder = LM[11]; const rShoulder = LM[12];
        const lElbow = LM[13];    const rElbow = LM[14];
        const lWrist = LM[15];    const rWrist = LM[16];
        const lHip = LM[23];      const rHip = LM[24];
        const lKnee = LM[25];     const rKnee = LM[26];
        const lAnkle = LM[27];    const rAnkle = LM[28];
        const nose = LM[0];

        // Draw Lines
        connect(lShoulder, rShoulder); connect(lShoulder, lHip); connect(rShoulder, rHip); connect(lHip, rHip);
        connect(lShoulder, lElbow); connect(lElbow, lWrist);
        connect(rShoulder, rElbow); connect(rElbow, rWrist);
        connect(lHip, lKnee); connect(lKnee, lAnkle);
        connect(rHip, rKnee); connect(rKnee, rAnkle);

        // Draw Points
        [lShoulder, rShoulder, lElbow, rElbow, lWrist, rWrist, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, nose].forEach(p => drawPoint(p));

        // =====================================================
        // EXACT ORIGINAL ENGINE (from JumpRopeCounter.tsx)
        // =====================================================

        const lShoulder2 = LM[11];
        const rShoulder2 = LM[12];
        const lHip2 = LM[23];
        const rHip2 = LM[24];
        const lAnkle2 = LM[27];
        const rAnkle2 = LM[28];

        if (!nose || !lShoulder2 || !rShoulder2) return;

        // === SMART NOSE-BASED DETECTION (With Hip Correlation) ===
        // We track the NOSE (LM[0]) as requested, but we validate it against the HIPs
        // to distinguish a full body jump from a head tilt or hand movement jitter.
        const noseY = nose.y * H;
        const noseX = nose.x * W;
        const hipMidY = lHip2 && rHip2 ? ((lHip2.y + rHip2.y) / 2) * H : (lHip2?.y ?? rHip2?.y ?? nose.y) * H;
        const hipMidX = lHip2 && rHip2 ? ((lHip2.x + rHip2.x) / 2) * W : (lHip2?.x ?? rHip2?.x ?? nose.x) * W;

        // Visual Indicator: Highlight the nose tracking point
        canvasCtx.beginPath();
        canvasCtx.arc(noseX, noseY, 4, 0, 2 * Math.PI);
        canvasCtx.fillStyle = '#ff3b30';
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = '#ff3b30';
        canvasCtx.fill();
        canvasCtx.shadowBlur = 0;

        // --- STABILITY & PROXIMITY GUARD ---
        const isFullBody = !!(lAnkle2 && rAnkle2);
        const hasAura = !!(lShoulder2 || rShoulder2 || lHip2 || rHip2);
        const shoulderW = Math.abs(lShoulder2.x - rShoulder2.x) * W;

        const frameVelocityY = Math.abs(lastCenterY.current - noseY) / deltaTime;
        const frameVelocityX = Math.abs(lastCenterX.current - noseX) / deltaTime;
        const scaleVelocity = (shoulderW - lastShoulderWidth.current) / deltaTime;

        const isTooClose = shoulderW > (W * 0.38);
        const isApproaching = scaleVelocity > 180;
        const isCurrentlyMoving = frameVelocityY > 380 || frameVelocityX > 200 || isApproaching;

        lastCenterY.current = noseY;
        lastCenterX.current = noseX;
        lastShoulderWidth.current = shoulderW;

        smoothedVelXRef.current = smoothedVelXRef.current * 0.6 + frameVelocityX * 0.4;

        if (isStableRef.current) {
            if (isTooClose || isApproaching) {
                if (trackingLossStartRef.current === null) {
                    trackingLossStartRef.current = now;
                } else if (now - trackingLossStartRef.current > 600) {
                    isStableRef.current = false;
                    setSetupStatus('STEP_BACK');
                    return;
                }
            } else {
                trackingLossStartRef.current = null;
                setSetupStatus('READY');
            }

            if (!hasAura || (!lAnkle2 && !rAnkle2)) {
                if (trackingLossStartRef.current === null) {
                    trackingLossStartRef.current = now;
                } else if (now - trackingLossStartRef.current > 1200) {
                    isStableRef.current = false;
                    setSetupStatus('STEP_BACK');
                    return;
                }
            }
        } else {
            if (isCurrentlyMoving || !isFullBody || isTooClose) {
                stabilityStartRef.current = null;
                setSetupStatus(isTooClose || !isFullBody ? 'STEP_BACK' : 'MOVING');
                baselineY.current = noseY;
                setMovementPct(0);
                return;
            }
            if (stabilityStartRef.current === null) {
                stabilityStartRef.current = now;
            } else if (now - stabilityStartRef.current > 1500) {
                isStableRef.current = true;
                setSetupStatus('READY');
            }
            baselineY.current = noseY;
            return;
        }

        if (baselineY.current === null) {
            baselineY.current = noseY;
            baselineHipY.current = hipMidY;
            return;
        }

        // --- THE CORE: NOSE TRACKING WITH HIP SYNC ---
        const bodyH = Math.abs(((lAnkle2?.y ?? rAnkle2?.y ?? 0) - nose.y) * H);
        bodyHeightRef.current = Math.max(100, bodyH);

        // EMA Smoothing on Nose
        if (emaSmoothY.current === null) emaSmoothY.current = noseY;
        emaSmoothY.current = emaSmoothY.current * 0.4 + noseY * 0.6;
        const smoothY = emaSmoothY.current;

        // Displacement
        const displacement = baselineY.current - smoothY;
        // Calculate velocity in Pixels-Per-Second to fix floating point scaling issues
        const rawVelPxPerSec = ((displacement - lastDisplacementRef.current) / Math.max(1, deltaTime)) * 1000;
        velocityRef.current = velocityRef.current * 0.3 + rawVelPxPerSec * 0.7;
        lastDisplacementRef.current = displacement;

        // Threshold: 2.5% of body height (more sensitive for jump rope hops)
        const jumpMinThreshold = Math.max(10, bodyHeightRef.current * 0.025);
        const pct = Math.max(0, Math.min(100, (displacement / (bodyHeightRef.current * 0.12)) * 100));
        setMovementPct(Math.round(pct));

        // --- SYNC GUARD: Validate Nose vs Hip ---
        // When you jump, hips must rise. When you head nod, hips stay stable.
        const hipDisplacement = (baselineHipY.current ?? hipMidY) - hipMidY;
        // Require hips to move up by at least 1.5% of body height to filter head nods,
        // without requiring a strict 40% correlation which breaks on small hops.
        const isBodySync = hipDisplacement > Math.max(4, bodyHeightRef.current * 0.015);
        const isWalkingLaterally = smoothedVelXRef.current > 130;

        if (jumpStatusRef.current === 'standing') {
            // Must have displacement + upward velocity (px/sec) + body sync (hips moving too)
            if (displacement > jumpMinThreshold && velocityRef.current > 40 && isBodySync && !isWalkingLaterally) {
                jumpStatusRef.current = 'jumping';
                peakY.current = displacement;
            } else if (Math.abs(velocityRef.current) < 30) {
                baselineY.current = (baselineY.current ?? smoothY) * 0.95 + smoothY * 0.05;
                if (baselineHipY.current !== null) {
                    baselineHipY.current = baselineHipY.current * 0.95 + hipMidY * 0.05;
                }
            }
        } else {
            if (displacement > peakY.current) peakY.current = displacement;

            const landed = velocityRef.current < -30 || displacement < jumpMinThreshold * 0.5;

            if (landed && !cooldownRef.current) {
                if (peakY.current > jumpMinThreshold && !isWalkingLaterally && isSessionActiveRef.current) {
                    jumpCountRef.current += 1;
                    setJumps(jumpCountRef.current);
                    if ('vibrate' in navigator) navigator.vibrate(50);

                    const now = Date.now();
                    if (!isTimerStartedRef.current) {
                        isTimerStartedRef.current = true;
                        isTimerActiveRef.current = true;
                        setIsTimerActive(true);
                        speak("Session started. Good luck!");
                    }
                    lastActivityTimeRef.current = now;
                    if (jumpCountRef.current % 10 === 0) speak(jumpCountRef.current.toString());
                }

                jumpStatusRef.current = 'standing';
                peakY.current = 0;
                cooldownRef.current = true;
                setTimeout(() => { cooldownRef.current = false; }, 120);
            }
        }
    }, [speak]);

    useEffect(() => {
        let active = true;
        let pose: any = null;
        const setupPose = async () => {
            try {
                const mpPose = await import('@mediapipe/pose');
                const PoseConstructor = mpPose.Pose || (mpPose as any).default?.Pose || (window as any).Pose;
                pose = new PoseConstructor({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/${file}` });
                pose.setOptions({ modelComplexity: 0, smoothLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
                pose.onResults(onResults);
                const loop = async () => {
                    if (webcamRef.current?.video?.readyState === 4 && pose) await pose.send({ image: webcamRef.current.video });
                    if (active) requestAnimationFrame(loop);
                };
                loop();
            } catch (err) { setError("AI Engine failed."); setIsLoading(false); }
        };
        setupPose();
        return () => { active = false; pose?.close?.(); };
    }, [onResults]);

    useEffect(() => {
        if (!isSessionActive) return;
        const interval = setInterval(() => {
            const now = Date.now();
            if (!isTimerActiveRef.current) return;
            setTotalSeconds(s => s + 1);
            
            const isWorking = lastActivityTimeRef.current > 0 && (now - lastActivityTimeRef.current) < 4000;
            if (isWorking) {
                workTimeRef.current += 1;
                setActiveSeconds(workTimeRef.current);
                setIntensityStatus('WORKING');
                setCurrentRestSecs(0);
            } else {
                restTimeRef.current += 1;
                setIntensityStatus('RESTING');
                setCurrentRestSecs(s => s + 1);
            }

            // Record intensity history for chart
            intensityHistoryRef.current.push({
                time: workTimeRef.current + restTimeRef.current,
                jpm: Math.round(jumpCountRef.current / ((workTimeRef.current || 1) / 60))
            });

            if (workTimeRef.current % 2 === 0) {
                setRpm(Math.round(jumpCountRef.current / ((workTimeRef.current || 1) / 60)) || 0);
            }

            if (timerRemainingRef.current !== null && isTimerActiveRef.current) {
                const nextValue = Math.max(0, timerRemainingRef.current - 1);
                timerRemainingRef.current = nextValue;
                setTimerRemaining(nextValue);
                if (nextValue === 0) handleFinish();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isTracking]);

    const handleFinish = useCallback(() => {
        setIsSessionActive(false);
        isSessionActiveRef.current = false;
        setFinalRestSecs(restTimeRef.current);
        const finalRpm = Math.round(jumpCountRef.current / ((workTimeRef.current || 1) / 60)) || 0;
        addSession({ jumps: jumpCountRef.current, duration: workTimeRef.current + restTimeRef.current, rpm: finalRpm });
        setShowSummary(true);
        speak(`${jumpCountRef.current} jumps completed.`);
    }, [addSession, speak]);

    const handleStart = () => {
        const total = (countdownMins * 60) + countdownSecs;
        if (total > 0) {
            setTimerRemaining(total);
            timerRemainingRef.current = total;
        } else {
            setTimerRemaining(null);
            timerRemainingRef.current = null;
        }
        setIsTracking(true); // Camera must be on
        setIsSessionActive(true);
        isSessionActiveRef.current = true;
        setIsTimerActive(false);
        isTimerActiveRef.current = false;
        isTimerStartedRef.current = false;
        jumpCountRef.current = 0;
        setJumps(0);
        setRpm(0);
        setTotalSeconds(0);
        workTimeRef.current = 0;
        restTimeRef.current = 0;
        lastActivityTimeRef.current = 0;
        intensityHistoryRef.current = [];
        setIntensityStatus('READY');
        setCurrentRestSecs(0);
    };

    return (
        <div className="flex-1 flex flex-col relative w-full bg-black overflow-hidden font-sans selection:bg-primary/30 antialiased" style={{ background: 'var(--jr-bg, #000)' }}>
            {/* 1. Immersive Camera Base */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center" style={{ background: 'var(--jr-bg, #080808)' }}>
                <Webcam ref={webcamRef} className="w-full h-full object-cover opacity-60 grayscale-[0.5] contrast-[1.2]" mirrored={true} onUserMedia={handleVideoLoad} onUserMediaError={handleCameraError} />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none opacity-50" width={640} height={480} />
            </div>

            {/* 2. Glassy Header Row (Centered Picker + Controls) */}
            <div className={`absolute top-0 inset-x-0 z-50 p-4 flex items-center justify-between transition-all duration-700`}>
                <button 
                    onClick={() => navigate('/jump-rope')} 
                    className="w-9 h-9 rounded-full border backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'var(--jr-surface, rgba(0,0,0,0.1))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))', color: 'var(--color-text-base)' }}
                >
                    <ArrowLeft size={16} />
                </button>

                {/* Tap-to-Open Timer Pill */}
                {!isSessionActive && (() => {
                    const hasTimer = countdownMins > 0 || countdownSecs > 0;
                    return (
                        <button 
                            onClick={openTimerPicker} 
                            className="flex items-center gap-2 border backdrop-blur-3xl rounded-full px-4 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all active:scale-95" 
                            style={{ 
                                background: 'var(--jr-surface, rgba(15,15,18,0.65))', 
                                borderColor: hasTimer ? 'rgba(255,59,48,0.35)' : 'var(--jr-text-low, rgba(255,255,255,0.12))' 
                            }}
                        >
                            <Clock size={12} style={{ color: hasTimer ? '#ff3b30' : 'rgba(255,255,255,0.4)' }} />
                            <span className="font-mono text-sm font-black tracking-wider" style={{ color: hasTimer ? 'var(--color-text-base)' : 'rgba(255,255,255,0.4)' }}>
                                {String(countdownMins).padStart(2,'0')}:{String(countdownSecs).padStart(2,'0')}
                            </span>
                        </button>
                    );
                })()}

                {/* iOS-Style Scroll Wheel Picker */}
                {showTimerPicker && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setShowTimerPicker(false)}>
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <div className="relative z-10 rounded-3xl border overflow-hidden" style={{ background: 'rgba(10,10,12,0.98)', borderColor: 'rgba(255,255,255,0.08)', width: 220 }} onClick={e => e.stopPropagation()}>
                            <div className="px-5 pt-5 pb-1 text-center">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-25" style={{ color: 'var(--color-text-base)' }}>SET TIMER</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 px-5 py-3">
                                {/* Minutes */}
                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-20 mb-1" style={{ color: 'var(--color-text-base)' }}>MIN</span>
                                    <div className="relative rounded-xl overflow-hidden" style={{ height: ITEM_H * 3 }}>
                                        <div className="absolute inset-x-0 pointer-events-none z-10" style={{ top: ITEM_H, height: ITEM_H, background: 'rgba(255,59,48,0.07)', borderTop: '1px solid rgba(255,59,48,0.2)', borderBottom: '1px solid rgba(255,59,48,0.2)' }} />
                                        <div ref={minsScrollRef} onScroll={handleMinsScroll} className="h-full overflow-y-scroll" style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
                                            <div style={{ height: ITEM_H }} />
                                            {MIN_OPTIONS.map(m => (
                                                <div key={m} style={{ height: ITEM_H, scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => { setCountdownMins(m); if (minsScrollRef.current) minsScrollRef.current.scrollTop = m * ITEM_H; }}>
                                                    <span className="font-mono font-black text-2xl transition-all" style={{ color: m === countdownMins ? '#fff' : 'rgba(255,255,255,0.15)' }}>{String(m).padStart(2,'0')}</span>
                                                </div>
                                            ))}
                                            <div style={{ height: ITEM_H }} />
                                        </div>
                                    </div>
                                </div>
                                <span className="font-black text-2xl pb-1 opacity-20" style={{ color: 'var(--color-text-base)' }}>:</span>
                                {/* Seconds */}
                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-20 mb-1" style={{ color: 'var(--color-text-base)' }}>SEC</span>
                                    <div className="relative rounded-xl overflow-hidden" style={{ height: ITEM_H * 3 }}>
                                        <div className="absolute inset-x-0 pointer-events-none z-10" style={{ top: ITEM_H, height: ITEM_H, background: 'rgba(255,59,48,0.07)', borderTop: '1px solid rgba(255,59,48,0.2)', borderBottom: '1px solid rgba(255,59,48,0.2)' }} />
                                        <div ref={secsScrollRef} onScroll={handleSecsScroll} className="h-full overflow-y-scroll" style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
                                            <div style={{ height: ITEM_H }} />
                                            {SEC_OPTIONS.map(s => (
                                                <div key={s} style={{ height: ITEM_H, scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => { setCountdownSecs(s); if (secsScrollRef.current) secsScrollRef.current.scrollTop = (s/5) * ITEM_H; }}>
                                                    <span className="font-mono font-black text-2xl transition-all" style={{ color: s === countdownSecs ? '#fff' : 'rgba(255,255,255,0.15)' }}>{String(s).padStart(2,'0')}</span>
                                                </div>
                                            ))}
                                            <div style={{ height: ITEM_H }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowTimerPicker(false)} className="w-full py-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all active:opacity-70" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#ff3b30' }}>DONE</button>
                        </div>
                    </div>
                )}
                
                {isSessionActive && (
                   <div className="flex items-center gap-3">
                       {/* Main Session Timer */}
                       <div className="flex items-center gap-2 border backdrop-blur-3xl rounded-full px-4 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" style={{ background: 'var(--jr-surface, rgba(15,15,18,0.65))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.12))' }}>
                           <div className="flex flex-col items-center leading-none min-w-0">
                               <span className="text-primary text-[8px] font-black uppercase tracking-[0.2em] mb-1 opacity-100 truncate">{intensityStatus}</span>
                               <span className="font-mono text-sm font-black tracking-wider truncate" style={{ color: 'var(--color-text-base, #fff)' }}>{timerRemaining !== null ? `${Math.floor(timerRemaining/60)}:${String(timerRemaining%60).padStart(2,'0')}` : `${Math.floor(totalSeconds/60)}:${String(totalSeconds%60).padStart(2,'0')}`}</span>
                           </div>
                       </div>

                       {/* Red Rest Indicator */}
                       {intensityStatus === 'RESTING' && currentRestSecs > 0 && (
                           <div className="flex items-center gap-2 border backdrop-blur-3xl rounded-full px-4 py-2 shadow-[0_8px_32px_rgba(255,59,48,0.2)] animate-in fade-in slide-in-from-right-4 duration-500" style={{ background: 'rgba(255,59,48,0.1)', borderColor: 'rgba(255,59,48,0.3)' }}>
                               <Zap size={10} className="text-primary fill-primary animate-pulse" />
                               <span className="font-mono text-sm font-black tracking-wider text-primary">
                                   {Math.floor(currentRestSecs/60)}:{String(currentRestSecs%60).padStart(2,'0')}
                               </span>
                           </div>
                       )}
                   </div>
                )}

                <button 
                    onClick={() => setVoiceEnabled(!voiceEnabled)} 
                    className={`w-9 h-9 rounded-full border backdrop-blur-3xl flex items-center justify-center transition-all active:scale-90 ${voiceEnabled ? 'bg-primary/5 border-primary/20 text-primary shadow-[0_0_15px_rgba(255,59,48,0.1)]' : 'bg-black/10 border-white/5 text-white/30'}`}
                >
                    {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
            </div>

            {/* 3. Primary HUD Layer (Always visible when not in summary) */}
            {!showSummary && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                    <div className="relative flex flex-col items-center pt-4">
                        {/* Soft background glow */}
                        <div className="absolute inset-0 bg-primary/10 blur-[130px] rounded-full scale-150" />
                        
                        <span className="text-primary text-[8px] font-black uppercase tracking-[0.8em] mb-3 drop-shadow-[0_0_12px_rgba(255,59,48,0.5)] relative z-10">JUMPS</span>
                        <span className="text-[160px] font-black leading-none tracking-tighter drop-shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative z-10 select-none" style={{ color: 'var(--color-text-base, #fff)' }}>{jumps}</span>
                        
                        <div className="mt-6 px-6 py-1.5 rounded-full border backdrop-blur-3xl relative z-10 flex flex-col items-center gap-0.5" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }}>
                            <span className="font-black text-[10px] tracking-[0.1em]" style={{ color: '#fff' }}>{rpm} RPM</span>
                            {/* Setup Status Badge - even smaller */}
                            {!isSessionActive && (
                                <span className={`text-[6px] font-bold uppercase tracking-[0.2em] transition-all ${setupStatus === 'READY' ? 'text-emerald-400 opacity-60' : 'opacity-40'}`}>
                                    {setupStatus === 'READY' ? 'STEALTH READY' : setupStatus}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Bottom Action Area (Start/Finish) */}
                    <div className="absolute bottom-32 pb-safe inset-x-0 flex flex-col items-center gap-5 px-10 pointer-events-auto">
                        {!isSessionActive ? (
                            <button 
                                onClick={handleStart}
                                className="w-full max-w-[260px] h-12 rounded-xl bg-primary text-white font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_20px_40px_rgba(255,59,48,0.3)] transition-all active:scale-95 hover:brightness-110 flex items-center justify-center gap-3"
                            >
                                <Play size={12} fill="currentColor" />
                                START TRAINING
                            </button>
                        ) : (
                            <button 
                                onClick={handleFinish}
                                className="w-full max-w-[260px] h-12 rounded-xl border backdrop-blur-3xl font-black uppercase tracking-[0.3em] text-[10px] transition-all active:scale-95 hover:bg-white/5 flex items-center justify-center gap-3"
                                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--color-text-base)' }}
                            >
                                <div className="w-2 h-2 bg-primary rounded-sm shadow-[0_0_10px_rgba(255,59,48,0.5)]" />
                                FINISH SESSION
                            </button>
                        )}
                        
                        {!isSessionActive && (
                            <p className="text-[8px] font-medium text-center max-w-[200px] leading-relaxed opacity-20 italic" style={{ color: 'var(--color-text-base)' }}>
                                Set your timer at the top. The countdown will begin once you start jumping.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* 5. Antigravity Summary Modal */}
            {showSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="w-full max-w-md border rounded-[2.5rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col gap-6" style={{ background: 'var(--jr-bg, rgba(10,10,10,0.95))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                        {/* Spatial Background Elements */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/3" />
                        
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <Trophy className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-black leading-none mb-1" style={{ color: 'var(--color-text-base)' }}>Workout Report</h2>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] italic" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.3))' }}>Pure Performance</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowSummary(false)} 
                                className="w-8 h-8 rounded-full transition-all"
                                style={{ background: 'var(--jr-surface, rgba(255,255,255,0.05))', color: 'var(--jr-text-low)' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <div className="border backdrop-blur-3xl rounded-2xl p-4 flex flex-col items-center" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.03))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                                <span className="text-xl font-black mb-0.5" style={{ color: 'var(--color-text-base)' }}>{jumps}</span>
                                <span className="text-[7px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.2))' }}>Jumps</span>
                            </div>
                            <div className="border backdrop-blur-3xl rounded-2xl p-4 flex flex-col items-center" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.03))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                                <span className="text-xl font-black text-primary mb-0.5">{rpm}</span>
                                <span className="text-[7px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.2))' }}>Avg RPM</span>
                            </div>
                            <div className="border backdrop-blur-3xl rounded-2xl p-4 flex flex-col items-center text-center" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.03))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                                <span className="text-sm font-black mb-0.5" style={{ color: 'var(--color-text-base)' }}>{Math.floor(totalSeconds/60)}m {totalSeconds%60}s</span>
                                <span className="text-[7px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.2))' }}>Total</span>
                            </div>
                            <div className="border backdrop-blur-3xl rounded-2xl p-4 flex flex-col items-center text-center" style={{ background: 'rgba(255,59,48,0.04)', borderColor: 'rgba(255,59,48,0.12)' }}>
                                <span className="text-sm font-black mb-0.5" style={{ color: '#ff8077' }}>{Math.floor(finalRestSecs/60)}m {finalRestSecs%60}s</span>
                                <span className="text-[7px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: 'rgba(255,128,119,0.5)' }}>Rest</span>
                            </div>
                        </div>

                        <div className="w-full relative z-10" style={{ height: 128 }}>
                            <ResponsiveContainer width="100%" height={128} debounce={50}>
                                <AreaChart data={intensityHistoryRef.current}>
                                    <defs>
                                        <linearGradient id="premiumGlow" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#ff3b30" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="jpm" stroke="#ff3b30" strokeWidth={1.5} fillOpacity={1} fill="url(#premiumGlow)" />
                                    <Tooltip 
                                        contentStyle={{background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '9px', backdropFilter: 'blur(10px)'}} 
                                        labelStyle={{display: 'none'}} 
                                        itemStyle={{color: '#ff3b30', fontWeight: 'bold'}} 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex flex-col items-center relative z-10">
                             <p className="text-[9px] font-bold italic tracking-wide text-center uppercase opacity-60 leading-relaxed" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.2))' }}>
                                "The only bad workout is the one<br/>that didn't happen."
                             </p>
                        </div>
                        
                        <button 
                            onClick={() => setShowSummary(false)} 
                            className="w-full py-4 border font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl transition-all backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] relative z-10"
                            style={{ background: 'var(--jr-surface, rgba(255,255,255,0.05))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))', color: 'var(--color-text-base)' }}
                        >
                            Dismiss Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
