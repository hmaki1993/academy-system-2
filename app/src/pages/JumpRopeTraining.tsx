import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Play, Square, RefreshCcw, Activity, Pause, Camera, Volume2, VolumeX, TrendingUp, Trophy, Clock, Zap, ArrowLeft, X, Loader2, AlertTriangle, LayoutDashboard } from 'lucide-react';
import Webcam from 'react-webcam';
import { useAddJumpRopeSession } from '../hooks/useData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useWebRTCBroadcast } from '../hooks/useWebRTCBroadcast';
import PageHeader from '../components/PageHeader';

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

export default function JumpRopeTraining() {
    const navigate = useNavigate();
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRefForBroadcast = useRef<HTMLVideoElement | null>(null);
    const { mutate: addSession, isPending: isSaving } = useAddJumpRopeSession();

    // --- Core State ---
    const [isTracking, setIsTracking] = useState(true);
    const [jumps, setJumps] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [setupStatus, setSetupStatus] = useState<'MOVING' | 'STEP_BACK' | 'READY' | 'TOO_CLOSE'>('MOVING');
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
    const isJumpingRef = useRef(false);
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
    const setupStatusRef = useRef<'READY' | 'TOO_CLOSE' | 'STEP_BACK' | 'MOVING' | 'STABLE'>('READY');
    const smoothedVelXRef = useRef(0); // EMA of horizontal velocity
    const smoothedScaleVelRef = useRef(0); // EMA of scale velocity for strict approach detection

    // --- Silent WebRTC Broadcast ---
    // Extract the exact video element reference for broadcasting
    useEffect(() => {
        if (webcamRef.current && webcamRef.current.video) {
            videoRefForBroadcast.current = webcamRef.current.video;
        }
    }, [webcamRef.current?.video]);

    useWebRTCBroadcast(isSessionActive, videoRefForBroadcast.current);

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

        const LM = results.poseLandmarks;
        const nose = LM[0];
        const lShoulder = LM[11];
        const rShoulder = LM[12];
        const lHip = LM[23];
        const rHip = LM[24];
        const lAnkle = LM[27];
        const rAnkle = LM[28];

        if (!nose || !lShoulder || !rShoulder) return;

        // --- STABILITY & FULL BODY & PROXIMITY GUARD ---
        const isFullBody = !!(lAnkle && rAnkle);
        const hasAura = !!(lShoulder || rShoulder || lHip || rHip);
        const noseY = nose.y * H;
        const noseX = nose.x * W;
        const shoulderW = Math.abs(lShoulder.x - rShoulder.x) * W;

        const frameVelocityY = Math.abs(lastCenterY.current - noseY) / deltaTime;
        const frameVelocityX = Math.abs(lastCenterX.current - noseX) / deltaTime;
        const rawScaleVelocity = (shoulderW - lastShoulderWidth.current) / deltaTime;

        // Smooth X and Scale velocities to detect walking
        smoothedVelXRef.current = (smoothedVelXRef.current * 0.8) + (frameVelocityX * 0.2);
        smoothedScaleVelRef.current = (smoothedScaleVelRef.current * 0.8) + (rawScaleVelocity * 0.2);

        // --- Proximity Hysteresis & Stabilization ---
        // Enter at 0.38, Exit at 0.34 to prevent flickering
        const wasTooClose = setupStatusRef.current === 'TOO_CLOSE';
        const isTooClose = wasTooClose ? (shoulderW > W * 0.35) : (shoulderW > W * 0.40); 
        
        // Strict walking/approaching thresholds
        const isApproaching = smoothedScaleVelRef.current > (W * 0.08); // Expanding by 8% of frame width per second
        const isWalking = smoothedVelXRef.current > (W * 0.15); // Moving horizontally by 15% of frame width per second
        
        const isCurrentlyMoving = frameVelocityY > 400 || smoothedVelXRef.current > 200 || isApproaching;
        
        lastCenterY.current = noseY;
        lastCenterX.current = noseX;
        lastShoulderWidth.current = shoulderW;

        // --- HIP STABILITY & TRACKING ---
        const hMidX = lHip && rHip ? ((lHip.x + rHip.x) / 2) * W : null;
        const hMidY = lHip && rHip ? ((lHip.y + rHip.y) / 2) * H : null;

        // --- STABLE PERSISTENCE LOGIC ---
        if (isStableRef.current) {
            // Balanced Approach Guard: Needs 0.6s persistent proximity to reset
            if (isTooClose || isApproaching) {
                if (trackingLossStartRef.current === null) {
                    trackingLossStartRef.current = now;
                } else if (now - trackingLossStartRef.current > 600) {
                    isStableRef.current = false;
                    const nextS = isTooClose ? 'TOO_CLOSE' : 'STEP_BACK';
                    setSetupStatus(nextS);
                    setupStatusRef.current = nextS;
                    return;
                }
            } else {
                trackingLossStartRef.current = null;
                setSetupStatus('READY');
                setupStatusRef.current = 'READY';
            }

            const essentialTrackingLost = !hasAura || (!lAnkle && !rAnkle) || !hMidY;
            if (essentialTrackingLost) {
                if (trackingLossStartRef.current === null) {
                    trackingLossStartRef.current = now;
                } else if (now - trackingLossStartRef.current > 1200) {
                    isStableRef.current = false;
                    const nextS = !isFullBody ? 'STEP_BACK' : 'MOVING';
                    setSetupStatus(nextS);
                    setupStatusRef.current = nextS;
                    return;
                }
            }
        } else {
            if (isCurrentlyMoving || !isFullBody || isTooClose) {
                stabilityStartRef.current = null;
                const nextStatus = (isTooClose && isSessionActiveRef.current) ? 'TOO_CLOSE' : !isFullBody ? 'STEP_BACK' : 'MOVING';
                
                // Direct status update for Setup mode
                if (setupStatusRef.current !== nextStatus) {
                    setSetupStatus(nextStatus);
                    setupStatusRef.current = nextStatus;
                }
                
                baselineY.current = nose.y;
                baselineHipY.current = hMidY !== null ? hMidY / H : null;
                setMovementPct(0);
                return;
            }

            if (stabilityStartRef.current === null) {
                stabilityStartRef.current = now;
            } else if (now - stabilityStartRef.current > 1500) {
                isStableRef.current = true;
                setSetupStatus('READY');
                setupStatusRef.current = 'READY';
            }
            baselineY.current = nose.y;
            baselineHipY.current = hMidY !== null ? hMidY / H : null;
            return;
        }

        if (baselineY.current === null || baselineHipY.current === null) {
            baselineY.current = nose.y;
            baselineHipY.current = hMidY !== null ? hMidY / H : null;
            return;
        }

        // --- NOSE PEAK DETECTION (The Core) ---
        const bY = baselineY.current ?? nose.y;
        const bodyH = Math.abs(((lAnkle?.y ?? rAnkle?.y ?? 0) - nose.y) * H);
        bodyHeightRef.current = Math.max(100, bodyH);

        // EMA Smoothing — lighter weight = faster response, fewer missed jumps
        if (emaSmoothY.current === null) emaSmoothY.current = noseY;
        emaSmoothY.current = (emaSmoothY.current ?? noseY) * 0.3 + noseY * 0.7;
        const smoothY = emaSmoothY.current ?? noseY;

        // Relative Movement
        const displacement = (bY * H) - smoothY;
        
        // Hip Displacement (Supresses Head Tilts)
        const bHipY = baselineHipY.current ?? (hMidY ? hMidY / H : 0);
        const hipDisplacement = hMidY !== null ? (bHipY * H) - hMidY : 0;

        velocityRef.current = (velocityRef.current * 0.3) + ((displacement - lastDisplacementRef.current) / deltaTime * 0.7);
        lastDisplacementRef.current = displacement;

        const jumpMinThreshold = Math.max(10, bodyHeightRef.current * 0.020);
        const pct = Math.max(0, Math.min(100, (displacement / (bodyHeightRef.current * 0.10)) * 100));
        setMovementPct(Math.round(pct));

        // Visual Feedback (Red/Green Dots requested)
        canvasCtx.globalAlpha = 0.8;
        // Red Nose Dot
        canvasCtx.fillStyle = '#ff3b30'; 
        canvasCtx.beginPath();
        canvasCtx.arc(noseX, noseY, 6, 0, Math.PI * 2);
        canvasCtx.fill();
        // Green Hip Sync Dot
        if (hMidX !== null && hMidY !== null) {
            canvasCtx.fillStyle = '#10b981';
            canvasCtx.beginPath();
            canvasCtx.arc(hMidX, hMidY, 6, 0, Math.PI * 2);
            canvasCtx.fill();
        }
        canvasCtx.globalAlpha = 1.0;

        if (baselineY.current !== null) {
            const bYLine = baselineY.current * H;
            canvasCtx.beginPath();
            canvasCtx.moveTo(0, bYLine - jumpMinThreshold);
            canvasCtx.lineTo(W, bYLine - jumpMinThreshold);
            canvasCtx.strokeStyle = jumpStatusRef.current === 'jumping' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(255, 255, 255, 0.15)';
            canvasCtx.setLineDash([8, 4]);
            canvasCtx.stroke();
            canvasCtx.setLineDash([]);
        }

        // State Machine
        if (jumpStatusRef.current === 'standing') {
            // Stability Checks:
            // 1. Minimum displacement (Height check)
            // 2. High velocity upward (Impulse check)
            // Hip check is optional — only suppress if hips ARE detected but not moving
            const hipsDetected = hMidY !== null;
            const isBodyMoving = !hipsDetected || hipDisplacement > (jumpMinThreshold * 0.3);
            
            // Strict counting filter: Block if too close, walking sideways, approaching camera, or ankles lost
            const isSuppressed = isTooClose || isApproaching || isWalking || !isFullBody;

            if (displacement > jumpMinThreshold && velocityRef.current > 20 && !isSuppressed && isBodyMoving) {

                jumpStatusRef.current = 'jumping';
                peakY.current = displacement;
                isJumpingRef.current = true;
            } else if (Math.abs(velocityRef.current) < 25 && baselineY.current !== null) {
                baselineY.current = (baselineY.current + (smoothY / H)) / 2;
            }
        } else if (jumpStatusRef.current === 'jumping') {
            if (displacement > peakY.current) peakY.current = displacement;

            // Peak Confirmation (Reset phase)
            if ((velocityRef.current < -30 || displacement < jumpMinThreshold * 0.5) && !cooldownRef.current) {
                if (peakY.current > jumpMinThreshold && isSessionActiveRef.current) {
                    jumpCountRef.current++;
                    setJumps(jumpCountRef.current);
                    
                    // Voice Announcement only every 10 jumps
                    if (jumpCountRef.current % 10 === 0) {
                        speak(jumpCountRef.current.toString());
                    }
                    
                    if ('vibrate' in navigator) navigator.vibrate(50);
                    lastActivityTimeRef.current = now;
                }

                jumpStatusRef.current = 'standing';
                cooldownRef.current = true;
                isJumpingRef.current = false;
                
                // --- TRIGER TIMER ON FIRST JUMP ---
                if (isSessionActiveRef.current && !isTimerActiveRef.current) {
                    isTimerActiveRef.current = true;
                    lastActivityTimeRef.current = Date.now();
                }

                // Faster cooldown for high-speed jumps (60ms = ~1000 RPM max theoretical)
                setTimeout(() => { cooldownRef.current = false; }, 60);
            }
        }
    }, [isTracking, speak]);

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
            } catch (err) { setError("Motion Engine failed."); setIsLoading(false); }
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
    }, [isSessionActive, isTracking]);

    const handleFinish = useCallback(() => {
        setIsSessionActive(false);
        isSessionActiveRef.current = false;
        
        // Finalize Stat Calculations from Refs (Source of Truth)
        const totalWork = workTimeRef.current;
        const totalRest = restTimeRef.current;
        const totalJumps = jumpCountRef.current;
        const finalRpm = Math.round(totalJumps / ((totalWork || 1) / 60)) || 0;

        setFinalRestSecs(totalRest);
        setJumps(totalJumps);
        setRpm(finalRpm);
        setTotalSeconds(totalWork + totalRest);

        addSession({ 
            jumps: totalJumps, 
            duration: totalWork + totalRest, 
            rpm: finalRpm,
            work_duration: totalWork,
            rest_duration: totalRest
        });
        setShowSummary(true);
        speak(`${totalJumps} jumps completed.`);
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
        setIsTimerActive(false); // WAIT FOR PHYSICAL JUMP TO START TIMER
        isTimerActiveRef.current = false;
        isTimerStartedRef.current = false; 
        speak("Session ready. Start jumping now!");
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
        <div className="flex-1 flex flex-col relative w-full bg-transparent overflow-hidden font-sans selection:bg-blue-400/30 antialiased">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none bg-transparent">
                <Webcam ref={webcamRef} className="w-full h-full object-cover opacity-60 grayscale-[0.5] contrast-[1.2]" mirrored={true} onUserMedia={handleVideoLoad} onUserMediaError={handleCameraError} />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none opacity-50" width={640} height={480} />
            </div>

            {/* 2. Professional Unified Header Layer (TOP) */}
            <div className="absolute top-0 inset-x-0 z-50 pt-2 px-6 pointer-events-none">
                <div className="pointer-events-auto">
                    <PageHeader 
                        title="Performance Tracker"
                        subtitle="AI Powered Performance Monitoring"
                        titleSuffix={
                            <button 
                                onClick={() => setVoiceEnabled(!voiceEnabled)} 
                                className={`ml-2 w-8 h-8 flex items-center justify-center transition-all active:scale-90 ${voiceEnabled ? 'text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'text-white/20'}`}
                                title={voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}
                            >
                                {voiceEnabled ? <Volume2 size={18} className="fill-current" /> : <VolumeX size={18} />}
                            </button>
                        }
                    />
                </div>

                {/* Session-Only Sub-HUD Indicators */}
                {isSessionActive && (
                    <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center gap-2 border backdrop-blur-3xl rounded-full px-5 py-2.5 shadow-[0_8px_32px_rgba(239,68,68,0.2)] animate-pulse" style={{ background: 'rgba(255,59,48,0.1)', borderColor: 'rgba(255,59,48,0.3)' }}>
                            <Zap size={14} className="text-red-500 fill-red-500" />
                            <div className="flex flex-col items-start leading-none gap-0.5">
                                <span className="text-red-500/60 text-[7px] font-black uppercase tracking-[0.3em] font-mono">{intensityStatus}</span>
                                <span className="font-mono text-base font-black tracking-widest text-red-500">
                                    {intensityStatus === 'RESTING' ? (
                                        `${Math.floor(currentRestSecs/60)}:${String(currentRestSecs%60).padStart(2,'0')}`
                                    ) : (
                                        timerRemaining !== null ? `${Math.floor(timerRemaining/60)}:${String(timerRemaining%60).padStart(2,'0')}` : `${Math.floor(totalSeconds/60)}:${String(totalSeconds%60).padStart(2,'0')}`
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODALS & OVERLAYS --- */}

            {/* iOS-Style Scroll Wheel Picker */}
            {showTimerPicker && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setShowTimerPicker(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 rounded-3xl border overflow-hidden" style={{ background: 'rgba(10,10,12,0.98)', borderColor: 'rgba(255,255,255,0.08)', width: 220 }} onClick={e => e.stopPropagation()}>
                        <div className="px-5 pt-5 pb-1 text-center">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-25 text-white">SET TIMER</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 px-5 py-3">
                            <div className="flex flex-col items-center flex-1">
                                <span className="text-[7px] font-black uppercase tracking-widest opacity-20 mb-1 text-white">MIN</span>
                                <div className="relative rounded-xl overflow-hidden" style={{ height: ITEM_H * 3 }}>
                                    <div className="absolute inset-x-0 pointer-events-none z-10" style={{ top: ITEM_H, height: ITEM_H, background: 'rgba(96,165,250,0.07)', borderTop: '1px solid rgba(96,165,250,0.2)', borderBottom: '1px solid rgba(96,165,250,0.2)' }} />
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
                            <span className="font-black text-2xl pb-1 opacity-20 text-white">:</span>
                            <div className="flex flex-col items-center flex-1">
                                <span className="text-[7px] font-black uppercase tracking-widest opacity-20 mb-1 text-white">SEC</span>
                                <div className="relative rounded-xl overflow-hidden" style={{ height: ITEM_H * 3 }}>
                                    <div className="absolute inset-x-0 pointer-events-none z-10" style={{ top: ITEM_H, height: ITEM_H, background: 'rgba(96,165,250,0.07)', borderTop: '1px solid rgba(96,165,250,0.2)', borderBottom: '1px solid rgba(96,165,250,0.2)' }} />
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
                        <button onClick={() => setShowTimerPicker(false)} className="w-full py-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all active:opacity-70 text-blue-400" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>DONE</button>
                    </div>
                </div>
            )}

            {/* 3. Primary HUD Layer (Main Count) */}
            {!showSummary && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                    <div className="relative flex flex-col items-center pt-8">
                        <div className="absolute inset-0 bg-blue-400/10 blur-[130px] rounded-full scale-150" />
                        <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.8em] mb-1 drop-shadow-[0_0_12px_rgba(96,165,250,0.5)] relative z-10">JUMPS</span>
                        <span className="text-[180px] font-black leading-none tracking-tighter drop-shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative z-10 select-none text-white">{jumps}</span>
                        
                        <div className="mt-4 flex items-center gap-3 relative z-10">
                            <div className="px-5 py-1.5 rounded-full border backdrop-blur-3xl flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                <Activity size={10} className="text-blue-400" />
                                <span className="font-black text-[11px] tracking-[0.1em] text-white">{rpm} RPM</span>
                            </div>
                            {!isSessionActive && setupStatus !== 'READY' && (
                                <div className="px-5 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 backdrop-blur-3xl flex items-center gap-2">
                                    <AlertTriangle size={10} className="text-red-400" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-red-400">{setupStatus}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Action Area (Start/Finish) */}
                    <div className="absolute bottom-4 pb-safe inset-x-0 flex flex-col items-center gap-5 px-10 pointer-events-auto">
                        {!isSessionActive ? (
                            <button 
                                onClick={handleStart}
                                className="group relative flex flex-col items-center gap-2 transition-all active:scale-95"
                            >
                                <div className="flex items-center gap-4 text-white animate-pulse">
                                    <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_15px_var(--color-primary)] opacity-60" />
                                    <span className="text-[12px] font-black uppercase tracking-[0.5em] drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                                        START TRAINING
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_15px_var(--color-primary)] opacity-60" />
                                </div>
                                <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-primary/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                            </button>
                        ) : (
                            <button 
                                onClick={handleFinish}
                                className="w-full max-w-[240px] h-11 rounded-xl border backdrop-blur-3xl font-black uppercase tracking-[0.3em] text-[10px] transition-all active:scale-95 hover:bg-white/5 flex items-center justify-center gap-3 text-white"
                                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
                            >
                                <div className="w-2 h-2 bg-blue-400 rounded-sm shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                                FINISH SESSION
                            </button>
                        )}
                        
                        {!isSessionActive && (
                            <p className="text-[8px] font-medium text-center max-w-[200px] leading-relaxed opacity-20 italic text-white">
                                Set your timer at the top. The countdown will begin once you start jumping.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* 5. Summary Modal Overlay (Strategy Hub Premium Style) */}
            {showSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-[30px] animate-in fade-in duration-700 font-sans overflow-hidden">
                    {/* Background Glow to match Hub */}
                    <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-orange-500/[0.08] blur-[150px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-500/[0.03] blur-[150px] rounded-full pointer-events-none" />

                    <div className="w-full max-w-[380px] border rounded-[3rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col gap-8" style={{ background: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="flex items-center justify-between relative z-10 font-sans">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                                    <span className="premium-gradient-text">
                                        Elite Report
                                    </span>
                                </h1>
                                <p className="text-muted text-[9px] font-black tracking-[0.2em] uppercase flex items-center gap-2 mt-2">
                                    <span className="w-4 h-[1px] bg-primary/50 inline-block"></span>
                                    Performance Metrics and session analysis
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowSummary(false)} 
                                className="w-8 h-8 rounded-full transition-all bg-red-500/5 text-red-500 border border-red-500/10 flex items-center justify-center active:scale-90 hover:bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <div className="border rounded-[2rem] p-4 flex flex-col items-center justify-center bg-white/[0.02] border-white/5 backdrop-blur-3xl group hover:border-orange-500/20 transition-all">
                                <span className="text-2xl font-black mb-0.5 text-white tabular-nums tracking-tighter">{jumps}</span>
                                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20">Total Jumps</span>
                            </div>
                            <div className="border rounded-[2rem] p-4 flex flex-col items-center justify-center bg-white/[0.02] border-white/5 backdrop-blur-3xl group hover:border-blue-500/20 transition-all">
                                <span className="text-2xl font-black text-blue-400 mb-0.5 tabular-nums tracking-tighter">{rpm}</span>
                                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20">Avg RPM</span>
                            </div>
                            <div className="border rounded-[2rem] p-4 flex flex-col items-center justify-center bg-white/[0.02] border-white/5 backdrop-blur-3xl group hover:border-white/10 transition-all col-span-2">
                                <div className="grid grid-cols-3 w-full gap-2">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-black text-white">{Math.floor(totalSeconds/60)}m {totalSeconds%60}s</span>
                                        <span className="text-[6px] font-black uppercase tracking-[0.1em] mt-0.5 text-white/30">Session</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-black text-orange-400">{Math.floor((totalSeconds - finalRestSecs)/60)}m {(totalSeconds - finalRestSecs)%60}s</span>
                                        <span className="text-[6px] font-black uppercase tracking-[0.1em] mt-0.5 text-orange-400/50">Active</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-black text-red-500">{Math.floor(finalRestSecs/60)}m {finalRestSecs%60}s</span>
                                        <span className="text-[6px] font-black uppercase tracking-[0.1em] mt-0.5 text-red-500/30">Rest</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center relative z-10 pt-4 border-t border-white/5">
                             <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">Strategy Synced</span>
                             </div>
                        </div>
                        
                        <button 
                            onClick={() => navigate('/app/strategy-hub')} 
                            className="w-full py-5 rounded-3xl border border-orange-500/30 bg-orange-500/5 text-orange-500 font-black uppercase tracking-[0.3em] text-[11px] hover:bg-orange-500/10 hover:border-orange-500/50 active:scale-95 transition-all relative z-10 shadow-[0_20px_40px_rgba(249,115,22,0.05)]"
                        >
                            Return To Hub
                        </button>
                    </div>
                </div>
            )}
            {/* 6. FULLSCREEN PROXIMITY OVERLAY (The Requested Blocker) */}
            {setupStatus === 'TOO_CLOSE' && isSessionActive && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[25px] flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
                    <div className="w-24 h-24 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse">
                        <AlertTriangle size={48} className="text-red-500" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-4">
                        Too Close
                    </h2>
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-red-500/60 mb-12">
                        Please Step Back
                    </p>

                    <div className="flex flex-col items-center gap-4 w-full max-w-[280px] pointer-events-auto">
                        {isSessionActive && (
                            <div className="w-full flex flex-col items-center gap-2 mb-4 bg-white/5 border border-white/10 rounded-3xl py-6 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                                <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mb-1">{intensityStatus}</span>
                                <span className="font-mono text-3xl font-black tracking-widest text-white leading-none">
                                    {timerRemaining !== null ? `${Math.floor(timerRemaining/60)}:${String(timerRemaining%60).padStart(2,'0')}` : `${Math.floor(totalSeconds/60)}:${String(totalSeconds%60).padStart(2,'0')}`}
                                </span>
                                {intensityStatus === 'RESTING' && currentRestSecs > 0 && (
                                    <div className="flex items-center gap-2 mt-4 text-red-500 animate-pulse">
                                        <Zap size={14} className="fill-red-500" />
                                        <span className="font-mono font-black text-sm">{Math.floor(currentRestSecs/60)}:{String(currentRestSecs%60).padStart(2,'0')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {isSessionActive && (
                            <button 
                                onClick={handleFinish}
                                className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-black uppercase tracking-[0.2em] text-xs backdrop-blur-md active:scale-95 transition-all"
                            >
                                Finish Session
                            </button>
                        )}
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-20" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 max-w-[200px] leading-relaxed">
                            Stand 2-3 meters away until your full body is visible
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
