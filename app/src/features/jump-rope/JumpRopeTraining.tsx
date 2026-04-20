import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Play, Square, RefreshCcw, Activity, Pause, Camera, Volume2, VolumeX, TrendingUp, Trophy, Clock, Zap, ArrowLeft, X, Loader2, AlertTriangle, Sparkles, Calendar, Users, RotateCcw, Timer } from 'lucide-react';
import Webcam from 'react-webcam';
import { useAddJumpRopeSession, useTrainingAssignment, useJumpRopeAccess, useStudents, useAssignTraining } from '../../hooks/useData';
import { useSmartPlan } from '../../hooks/useSmartPlan';
import { supabase } from '../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRocketSync } from '../../context/RocketSyncContext';
import { useWebRTCBroadcast } from '../../hooks/useWebRTCBroadcast';
import PageHeader from '../../components/PageHeader';
import PremiumSelect from '../../components/PremiumSelect';
import SmartPlanModal from './components/SmartPlanModal';
import { toast } from 'react-hot-toast';

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

export default function JumpRopeTraining() {
    const { t, i18n } = useTranslation();
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
    const [isSessionActive, setIsSessionActive] = useState(() => {
        return sessionStorage.getItem('ai_session_active') === 'true';
    });
    const isSessionActiveRef = useRef(sessionStorage.getItem('ai_session_active') === 'true');

    // Plan & Admin States
    const { 
        activePlan, 
        targetJumps: syncTargetJumps, 
        targetTime: syncTargetTime, 
        isRemoteLocked, 
        isRemotePaused: syncRemotePaused,
        scheduledRemaining,
        studentId: syncStudentId,
        lastPulse,
        refreshPlan: fetchLatestPlan
    } = useRocketSync();

    const [targetJumps, setTargetJumps] = useState<number>(() => Number(sessionStorage.getItem('ai_session_target_jumps')) || 0);
    const [countdownMins, setCountdownMins] = useState<number>(() => Number(sessionStorage.getItem('ai_session_countdown_mins')) || 0);
    const [countdownSecs, setCountdownSecs] = useState(0);
    const [timerRemaining, setTimerRemaining] = useState<number | null>(() => {
        const cached = sessionStorage.getItem('ai_session_timer_remaining');
        return cached ? Number(cached) : null;
    });
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [showTimerPicker, setShowTimerPicker] = useState(false);
    const lastPlanIdRef = useRef<string | null>(null);
    const minsScrollRef = useRef<HTMLDivElement>(null);
    const secsScrollRef = useRef<HTMLDivElement>(null);
    const isUnmountingRef = useRef(false); // 🛡️ Connection Lifecycle Guard
    const mountTimeRef = useRef(Date.now());

    const [showPlanModal, setShowPlanModal] = useState(false);
    const [resolvedStudentId, setResolvedStudentId] = useState<string>('');
    const [isRemotePaused, setIsRemotePaused] = useState(false);
    const isRemotePausedRef = useRef(false);
    const { updateSessionStatus } = useSmartPlan();

    const ITEM_H = 44;
    const MIN_OPTIONS = Array.from({ length: 21 }, (_, i) => i);
    const SEC_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5);

    const { data: assignmentData } = useTrainingAssignment();
    const { data: accessData } = useJumpRopeAccess();
    const { data: students } = useStudents();
    const isAdmin = accessData?.isAdmin;
    const user = accessData?.user;
    const assignment = assignmentData as any;

    const speak = useCallback((text: string) => {
        if (!voiceEnabled || !window.speechSynthesis) return;
        
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            
            // 🎙️ Dynamic Voice Selection
            const voices = window.speechSynthesis.getVoices();
            const isArabic = i18n.language.startsWith('ar');
            
            // Find best matching voice
            const preferredVoice = voices.find(v => 
                isArabic ? v.lang.startsWith('ar') : (v.lang.startsWith('en') && v.name.includes('Google'))
            ) || voices.find(v => isArabic ? v.lang.startsWith('ar') : v.lang.startsWith('en')) || voices[0];

            if (preferredVoice) {
                utterance.voice = preferredVoice;
                utterance.lang = preferredVoice.lang;
            }

            utterance.rate = 1.1;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Speech Synthesis Error:", e);
        }
    }, [voiceEnabled, i18n.language]);

    // 🚀 VOICE WAKE-UP: Prima the TTS engine on first user interaction
    // Necessary for mobile/chrome autoplay policies
    useEffect(() => {
        const primeTTS = () => {
            if (window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(""); // Silent prime
                window.speechSynthesis.speak(utterance);
                console.log("🎙️ AI Voice Engine: Primed & Ready");
            }
            window.removeEventListener('click', primeTTS);
            window.removeEventListener('touchstart', primeTTS);
        };

        window.addEventListener('click', primeTTS);
        window.addEventListener('touchstart', primeTTS);
        return () => {
            window.removeEventListener('click', primeTTS);
            window.removeEventListener('touchstart', primeTTS);
        };
    }, []);

    // --- Core Operations (Hoisted for Reliability) ---
    async function handleFinish() {
        setIsSessionActive(false);
        isSessionActiveRef.current = false;
        sessionStorage.removeItem('ai_session_active');
        const totalWork = workTimeRef.current;
        const totalRest = restTimeRef.current;
        const totalJumps = jumpCountRef.current;
        const finalRpm = Math.round(totalJumps / ((totalWork || 1) / 60)) || 0;

        if (totalJumps > 0) {
            addSession({
                jumps: totalJumps,
                duration: totalWork + totalRest,
                rpm: finalRpm,
                student_id: resolvedStudentId,
                work_duration: totalWork,
                rest_duration: totalRest
            }, {
                onSuccess: () => { toast.success(t('smartTraining.sessionSaved')); },
                onError: (err: any) => { toast.error(t('smartTraining.sessionSyncError')); }
            });
        }

        setFinalRestSecs(totalRest);
        setJumps(totalJumps);
        setRpm(finalRpm);
        setTotalSeconds(totalWork + totalRest);

        if (resolvedStudentId) {
            await updateSessionStatus(resolvedStudentId, 'idle');
        }

        setShowSummary(true);
        speak(`${totalJumps} ${t('smartTraining.jumpsCompleted')}`);
    }

    function handleRestart() {
        setJumps(0);
        jumpCountRef.current = 0;
        setRpm(0);
        setTotalSeconds(0);
        setActiveSeconds(0);
        workTimeRef.current = 0;
        restTimeRef.current = 0;
        lastActivityTimeRef.current = 0;
        setIntensityStatus('READY');
        setCurrentRestSecs(0);

        const total = (countdownMins * 60) + countdownSecs;
        setTimerRemaining(total > 0 ? total : null);
        timerRemainingRef.current = total > 0 ? total : null;

        setIsTimerActive(false);
        isTimerActiveRef.current = false;
        isTimerStartedRef.current = false;
        setIsSessionActive(false);
        setIsTracking(false);
        setIsRemotePaused(false);
        isRemotePausedRef.current = false;

        speak(t('smartTraining.sessionReset'));
    }

    async function handleStart() {
        const total = (countdownMins * 60) + countdownSecs;
        setTimerRemaining(total > 0 ? total : null);
        timerRemainingRef.current = total > 0 ? total : null;
        setIsTracking(true);
        setIsSessionActive(true);
        isSessionActiveRef.current = true;
        setIsTimerActive(false);
        isTimerActiveRef.current = false;

        if (resolvedStudentId) {
            updateSessionStatus(resolvedStudentId, 'live');
        }

        speak(t('smartTraining.readyStart'));
        jumpCountRef.current = 0; setJumps(0); setRpm(0); setTotalSeconds(0);
        workTimeRef.current = 0; restTimeRef.current = 0; lastActivityTimeRef.current = 0;
        intensityHistoryRef.current = [];
        setIntensityStatus('READY'); setCurrentRestSecs(0);
    }

    // 🚀 SYNC SYNC SYNC: Sync local display states with global RocketSync
    useEffect(() => {
        if (syncTargetJumps !== undefined) setTargetJumps(syncTargetJumps);
    }, [syncTargetJumps]);

    useEffect(() => {
        setIsRemotePaused(syncRemotePaused);
        isRemotePausedRef.current = syncRemotePaused;
    }, [syncRemotePaused]);

    useEffect(() => {
        if (syncStudentId) {
            setResolvedStudentId(syncStudentId);
        }
    }, [syncStudentId]);

    useEffect(() => {
        if (syncTargetTime !== undefined && syncTargetTime !== null && !isSessionActiveRef.current) {
            const total = syncTargetTime * 60;
            setCountdownMins(syncTargetTime);
            setCountdownSecs(0);
            setTimerRemaining(total);
            timerRemainingRef.current = total;
            setIsTimerActive(false);
            isTimerActiveRef.current = false;
            sessionStorage.setItem('ai_session_timer_remaining', total.toString());
        }
    }, [syncTargetTime]);

    // 🚀 ROCKET AUTO-START: Detect 'Live' signal from background and launch UI instantly
    useEffect(() => {
        if (activePlan?.status === 'live' && !isSessionActiveRef.current) {
            console.log("🚀 ROCKET SYNC: AUTO-STARTING SESSION...");
            handleStart();
            
            toast.success(t('smartTraining.missionLive'), { 
                icon: '🔥',
                style: { background: '#0b0e18', color: '#10b981', border: '1px solid #10b981' }
            });
            speak(t('smartTraining.missionLive'));
        }
    }, [activePlan?.status, handleStart, speak, t]);

    // Handle Restart signals from global status
    useEffect(() => {
        if (activePlan?.status === 'restarting') {
            const restartKey = activePlan.updated_at || activePlan.id || 'once';
            if ((window as any).__lastRestartKey !== restartKey) {
                (window as any).__lastRestartKey = restartKey;
                handleRestart();
            }
        }
    }, [activePlan?.status, activePlan?.updated_at, handleRestart]);

    // Cleanup local mounts
    useEffect(() => {
        return () => {
            isUnmountingRef.current = true;
        };
    }, []);


    // 2. Handle Training Assignments
    useEffect(() => {
        if (assignment) {
            if (assignment.target_jumps) setTargetJumps(assignment.target_jumps);
            if (assignment.target_duration_minutes) {
                const total = assignment.target_duration_minutes * 60;
                setCountdownMins(assignment.target_duration_minutes);
                setCountdownSecs(0);
                setTimerRemaining(total);
                timerRemainingRef.current = total;
            }
        }
    }, [assignment]);

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
    const lastValidTimeRef = useRef<number>(0);
    const velocityRef = useRef(0);
    const lastFrameTime = useRef(Date.now());
    const lastActivityTimeRef = useRef(0);
    const workTimeRef = useRef(0);
    const restTimeRef = useRef(0);
    const timerRemainingRef = useRef<number | null>(null);
    const intensityHistoryRef = useRef<any[]>([]);
    const cooldownRef = useRef(false);
    const isTimerStartedRef = useRef(false);
    const isTimerActiveRef = useRef(false);
    const setupStatusRef = useRef<'READY' | 'TOO_CLOSE' | 'STEP_BACK' | 'MOVING' | 'STABLE'>('READY');
    const smoothedVelXRef = useRef(0);
    const smoothedScaleVelRef = useRef(0);

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
        if (!canvasRef.current || !results.poseLandmarks || !webcamRef.current?.video || isRemotePausedRef.current) return;
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

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

        const isFullBody = !!(lAnkle && rAnkle);
        const hasAura = !!(lShoulder || rShoulder || lHip || rHip);
        const noseY = nose.y * H;
        const noseX = nose.x * W;
        const shoulderW = Math.abs(lShoulder.x - rShoulder.x) * W;

        const frameVelocityY = Math.abs(lastCenterY.current - noseY) / deltaTime;
        const frameVelocityX = Math.abs(lastCenterX.current - noseX) / deltaTime;
        const rawScaleVelocity = (shoulderW - lastShoulderWidth.current) / deltaTime;
        smoothedVelXRef.current = (smoothedVelXRef.current * 0.8) + (frameVelocityX * 0.2);
        smoothedScaleVelRef.current = (smoothedScaleVelRef.current * 0.8) + (rawScaleVelocity * 0.2);

        const wasTooClose = setupStatusRef.current === 'TOO_CLOSE';
        const isTooClose = wasTooClose ? (shoulderW > W * 0.35) : (shoulderW > W * 0.40);
        const isApproaching = smoothedScaleVelRef.current > (W * 0.08);
        const isWalking = smoothedVelXRef.current > (W * 0.15);
        const isCurrentlyMoving = frameVelocityY > 400 || smoothedVelXRef.current > 200 || isApproaching;

        lastCenterY.current = noseY;
        lastCenterX.current = noseX;
        lastShoulderWidth.current = shoulderW;

        const hMidX = lHip && rHip ? ((lHip.x + rHip.x) / 2) * W : null;
        const hMidY = lHip && rHip ? ((lHip.y + rHip.y) / 2) * H : null;

        if (isStableRef.current) {
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
                const isGracePeriod = (Date.now() - mountTimeRef.current) < 800; // Saro5 speed
                const nextStatus = (isTooClose && isSessionActiveRef.current && !isGracePeriod) ? 'TOO_CLOSE' : !isFullBody ? 'STEP_BACK' : 'MOVING';
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

        const bY = baselineY.current ?? nose.y;
        const bodyH = Math.abs(((lAnkle?.y ?? rAnkle?.y ?? 0) - nose.y) * H);
        bodyHeightRef.current = Math.max(100, bodyH);
        if (emaSmoothY.current === null) emaSmoothY.current = noseY;
        emaSmoothY.current = (emaSmoothY.current ?? noseY) * 0.3 + noseY * 0.7;
        const smoothY = emaSmoothY.current ?? noseY;
        const displacement = (bY * H) - smoothY;
        const bHipY = baselineHipY.current ?? (hMidY ? hMidY / H : 0);
        const hipDisplacement = hMidY !== null ? (bHipY * H) - hMidY : 0;

        velocityRef.current = (velocityRef.current * 0.3) + ((displacement - lastDisplacementRef.current) / deltaTime * 0.7);
        lastDisplacementRef.current = displacement;
        const jumpMinThreshold = Math.max(10, bodyHeightRef.current * 0.020);
        const pct = Math.max(0, Math.min(100, (displacement / (bodyHeightRef.current * 0.10)) * 100));
        setMovementPct(Math.round(pct));

        canvasCtx.globalAlpha = 0.8;
        canvasCtx.fillStyle = '#ff3b30';
        canvasCtx.beginPath(); canvasCtx.arc(noseX, noseY, 6, 0, Math.PI * 2); canvasCtx.fill();
        if (hMidX !== null && hMidY !== null) {
            canvasCtx.fillStyle = '#10b981';
            canvasCtx.beginPath(); canvasCtx.arc(hMidX, hMidY, 6, 0, Math.PI * 2); canvasCtx.fill();
        }
        canvasCtx.globalAlpha = 1.0;

        if (baselineY.current !== null) {
            const bYLine = baselineY.current * H;
            canvasCtx.beginPath();
            canvasCtx.moveTo(0, bYLine - jumpMinThreshold); canvasCtx.lineTo(W, bYLine - jumpMinThreshold);
            canvasCtx.strokeStyle = jumpStatusRef.current === 'jumping' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(255, 255, 255, 0.15)';
            canvasCtx.setLineDash([8, 4]); canvasCtx.stroke(); canvasCtx.setLineDash([]);
        }

        if (jumpStatusRef.current === 'standing') {
            const hipsDetected = hMidY !== null;
            const isBodyMoving = !hipsDetected || hipDisplacement > (jumpMinThreshold * 0.3);
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
            if ((velocityRef.current < -30 || displacement < jumpMinThreshold * 0.5) && !cooldownRef.current) {
                if (peakY.current > jumpMinThreshold && isSessionActiveRef.current) {
                    jumpCountRef.current++;
                    setJumps(jumpCountRef.current);

                    // Start timer on FIRST JUMP - Only if established and READY
                    if (jumpCountRef.current === 1 && !isTimerActiveRef.current && setupStatusRef.current === 'READY') {
                        console.log("Timer started by first jump detection");
                        setIsTimerActive(true);
                        isTimerActiveRef.current = true;
                        speak(t('smartTraining.timerStarted'));
                    }

                    if (jumpCountRef.current % 10 === 0) speak(jumpCountRef.current.toString());
                    if ('vibrate' in navigator) navigator.vibrate(50);
                    lastActivityTimeRef.current = now;
                }
                jumpStatusRef.current = 'standing';
                cooldownRef.current = true;
                isJumpingRef.current = false;
                setTimeout(() => { cooldownRef.current = false; }, 60);
            }
        }
    }, [isTracking, speak, t]); // 🛡️ 'isRemotePaused' removed from deps to prevent engine reset

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
            if (!isTimerActiveRef.current || isRemotePausedRef.current) return;
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

                // AUDIO COUNTDOWN 10-0
                if (nextValue <= 10 && nextValue > 0) {
                    speak(nextValue.toString());
                }

                if (nextValue === 0) handleFinish();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isSessionActive, isTracking]); // 🛡️ 'isRemotePaused' removed from deps to prevent stale/incorrect closures





    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black overflow-hidden font-sans antialiased">
            {/* 1. Immersive Camera Base - TRUE FULL SCREEN */}
            <div className="absolute inset-0 z-0 bg-black">
                <Webcam ref={webcamRef} className="w-full h-full object-cover" mirrored={true} onUserMedia={handleVideoLoad} onUserMediaError={handleCameraError} />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none opacity-40" width={640} height={480} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none z-[5]" />
            </div>

            {/* 2. Floating Minimal Header */}
            <div className="absolute top-4 left-4 right-4 z-[100] flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-1 pointer-events-auto">
                    <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-xl">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">{t('common.performanceTracker')}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10 ${voiceEnabled ? 'bg-primary/20 text-primary' : 'bg-black/20 text-white/40'}`}>
                        {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* 3. Primary HUD Counter Layer (Zoned for Mobile) */}
            {!showSummary && (
                <div className="relative flex-1 flex flex-col justify-between pointer-events-none z-[50] pt-2 pb-0 sm:pt-12 sm:pb-2 px-4">

                    {/* CENTER ZONE - Minimal Overlay */}
                    <div className="flex flex-col items-center justify-center flex-1 h-full pt-20">
                        {/* 🏆 ADMIN PERSONAL TARGET WIDGET (Top of page as requested) */}
                        {isAdmin && !isSessionActive && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-top duration-700">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-2xl group transition-all hover:border-blue-400/30">
                                    <Trophy size={14} className="text-yellow-400/60 group-hover:scale-110 transition-all" />
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">{t('smartTraining.jumpsGoal')}</span>
                                        <input
                                            type="number"
                                            value={targetJumps || ''}
                                            onChange={(e) => setTargetJumps(e.target.value ? parseInt(e.target.value) : 0)}
                                            placeholder="∞"
                                            className="bg-transparent border-none text-[13px] font-black text-white focus:ring-0 p-0 w-12 placeholder:text-white/20 tabular-nums"
                                        />
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={openTimerPicker}
                                    className="px-4 py-2 rounded-2xl bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-2xl group transition-all hover:bg-white/5 hover:border-blue-400/30 flex items-center gap-3"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400/60 group-hover:text-blue-400 transition-all">
                                        <Clock size={16} />
                                    </div>
                                    <div className="flex flex-col items-start translate-y-[1px]">
                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">{t('smartTraining.duration')}</span>
                                        <span className="text-[13px] font-black text-white tabular-nums">
                                            {String(countdownMins).padStart(2, '0')}:{String(countdownSecs).padStart(2, '0')}
                                        </span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>



                    {/* Primary Jump Counter (Upward) + Countdown Progress Bar (Small) */}
                    <div className="relative flex flex-col items-center pt-8">
                        <div className="absolute inset-0 bg-blue-400/5 blur-[120px] rounded-full scale-125" />
                        
                        <span className="text-blue-400/40 text-[9px] font-black uppercase tracking-[0.6em] mb-1 relative z-10">
                            {t('smartTraining.jumps')}
                        </span>

                        <span className="text-[120px] sm:text-[180px] font-black leading-none tracking-tighter drop-shadow-2xl relative z-10 select-none text-white animate-in zoom-in duration-500">
                            {jumps}
                        </span>

                        {/* Decreasing Horizontal Bar (The "Shret" the user mentioned) */}
                        {targetJumps > 0 && (
                            <div className="mt-4 w-40 sm:w-64 h-1 bg-white/5 rounded-full overflow-hidden relative z-10 border border-white/5 backdrop-blur-sm">
                                <div 
                                    className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-300"
                                    style={{ width: `${Math.max(0, ((targetJumps - jumps) / targetJumps) * 100)}%` }}
                                />
                            </div>
                        )}
                        
                        <div className="mt-6 flex items-center gap-3 relative z-10">
                            <div className="px-4 py-1 rounded-full border backdrop-blur-3xl flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                                <Activity size={10} className="text-blue-400/50" />
                                <span className="font-black text-[10px] tracking-[0.1em] text-white/60">{rpm} RPM</span>
                            </div>
                            
                            {targetJumps > 0 && (
                                <div className="px-4 py-1 rounded-full border border-red-500/10 bg-red-500/[0.02] backdrop-blur-3xl flex items-center gap-2">
                                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-red-500/50">Remaining</span>
                                    <span className="text-[10px] font-black text-white">{Math.max(0, targetJumps - jumps)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BOTTOM ZONE: Actions + Secondary Stats */}
                    <div className="relative flex flex-col items-center gap-3 sm:gap-8 pointer-events-auto">

                        {/* Status text */}
                        {!isTimerActive && (
                            <span className="text-[7px] font-black uppercase tracking-[0.5em] text-white/30 animate-pulse">
                                {setupStatus === 'READY' ? t('smartTraining.jumpToStart') : `${t('smartTraining.positioning')}: ${setupStatus}`}
                            </span>
                        )}

                        <div className="w-full flex flex-col items-center gap-3">
                            {isSessionActive && timerRemaining !== null && (
                                <div className="flex flex-col items-center gap-1 scale-90 sm:scale-100">
                                    <span className={`text-4xl sm:text-6xl font-black tabular-nums leading-none transition-all ${!isTimerActive ? 'text-white/10' : (timerRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-blue-400')}`}>
                                        {String(Math.floor(timerRemaining / 60)).padStart(2, '0')}:{String(timerRemaining % 60).padStart(2, '0')}
                                    </span>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[7px] font-black uppercase tracking-widest text-white/30">{t('smartTraining.work')}</span>
                                            <span className="text-sm font-black text-green-400/90 tabular-nums leading-none">
                                                {String(Math.floor(activeSeconds / 60)).padStart(2, '0')}:{String(activeSeconds % 60).padStart(2, '0')}
                                            </span>
                                        </div>
                                        <div className="w-px h-5 bg-white/10" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-[7px] font-black uppercase tracking-widest text-white/30">{t('smartTraining.rest')}</span>
                                            <span className="text-sm font-black text-orange-400/90 tabular-nums leading-none">
                                                {String(Math.floor(currentRestSecs / 60)).padStart(2, '0')}:{String(currentRestSecs % 60).padStart(2, '0')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="w-full max-w-[280px] flex flex-col gap-3">
                                {isSessionActive && isAdmin && (
                                    <div className="flex gap-2 w-full animate-in slide-in-from-bottom-2 duration-300">
                                        <button
                                            onClick={handleRestart}
                                            className="flex-1 h-10 rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-md text-red-400 font-black uppercase tracking-[0.2em] text-[8px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                                        >
                                            <RotateCcw size={12} /> {t('smartTraining.restart')}
                                        </button>
                                        <button
                                            onClick={() => setIsRemotePaused(!isRemotePaused)}
                                            className={`flex-1 h-10 rounded-2xl border backdrop-blur-md font-black uppercase tracking-[0.2em] text-[8px] flex items-center justify-center gap-2 active:scale-95 transition-all ${isRemotePaused ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500'}`}
                                        >
                                            {isRemotePaused ? <><Play size={12} fill="currentColor" /> {t('smartTraining.play')}</> : <><Pause size={12} fill="currentColor" /> {t('smartTraining.pause')}</>}
                                        </button>
                                    </div>
                                )}

                                {isLoading ? (
                                    <div className="w-full flex items-center justify-center gap-2 py-2 text-white/20">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">{t('smartTraining.calibrating')}</span>
                                    </div>
                                ) : !isSessionActive ? (
                                    <div className="w-full flex flex-col gap-3">
                                        <button
                                            onClick={handleStart}
                                            disabled={isRemoteLocked}
                                            className="w-full h-10 rounded-full border border-blue-400/20 bg-blue-400/5 backdrop-blur-md text-blue-400/80 font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl transition-all active:scale-95 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Play size={14} fill="currentColor" /> {t('smartTraining.startTraining')}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleFinish}
                                        className="w-full h-10 rounded-full border border-white/10 bg-white/10 backdrop-blur-md font-black uppercase tracking-[0.2em] text-[9px] transition-all active:scale-95 flex items-center justify-center gap-2 text-white/80 hover:text-white"
                                    >
                                        <div className="w-2.5 h-2.5 bg-blue-400 rounded-sm shadow-[0_0_15px_rgba(96,165,250,0.6)]" /> {t('smartTraining.finishSession')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3.1. Session Lock / Scheduled Overlay (Perfectly Centered) */}
                    {(
                        // Condition A: It's scheduled (Always show instantly)
                        (activePlan?.status === 'scheduled') ||
                        // Condition B: It's locked (Show after tiny grace period if not active)
                        (!sessionStorage.getItem('ai_session_active') && (Date.now() - mountTimeRef.current > 100) && (isRemoteLocked && !isAdmin))
                    ) && (
                        <div className="absolute inset-0 z-[100] backdrop-blur-2xl flex flex-col items-center justify-center gap-8 text-center p-6 pointer-events-auto" style={{ background: 'rgba(10,10,20,0.55)' }}>
                            {activePlan?.status === 'scheduled' ? (
                                /* Emerald Mission Control / Scheduled Overlay */
                                <div className="w-full max-w-[380px] aspect-square flex flex-col items-center justify-center p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl animate-in fade-in zoom-in-95 duration-150 saturate-[1.2]" style={{ background: 'rgba(16,185,129,0.04)', backdropFilter: 'blur(40px)' }}>
                                    <div className="relative">
                                        <div className="absolute -inset-6 bg-emerald-500/15 rounded-full blur-2xl animate-pulse" />
                                        <Timer size={56} className="text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
                                    </div>
                                    <div className="flex flex-col gap-4 max-w-xs items-center">
                                        <h2 className="text-white font-black text-xl uppercase tracking-[0.3em] leading-none drop-shadow-lg">{t('smartTraining.scheduledStart')}</h2>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="text-emerald-400 text-[8px] font-black uppercase tracking-[0.4em] leading-relaxed opacity-60">
                                                {t('smartTraining.startingIn')}
                                            </p>
                                            {scheduledRemaining !== null && (
                                                <span className="text-5xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-in fade-in zoom-in-90 duration-500">
                                                    {Math.floor(scheduledRemaining / 60)}:{(scheduledRemaining % 60).toString().padStart(2, '0')}
                                                </span>
                                            )}
                                            <p className="text-white/30 text-[7px] font-black uppercase tracking-[0.2em] mt-1">
                                                {t('smartTraining.goal')}: <span className="text-white/60">{activePlan.scheduled_start}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/5">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">{t('smartTraining.totalJumps')}</span>
                                            <span className="text-lg font-black text-white">{syncTargetJumps || activePlan?.target_jumps || '∞'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">{t('smartTraining.totalTime')}</span>
                                            <span className="text-lg font-black text-white">{syncTargetTime ? `${syncTargetTime}m` : (activePlan?.target_time ? `${activePlan.target_time}m` : '∞')}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em]">System Ready</div>
                                        <div className="flex items-center gap-2">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Standard Orange Lock UI */
                                <div className="flex flex-col items-center gap-8 px-10 py-12 rounded-[2.5rem] border border-white/10 shadow-2xl" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(40px)' }}>
                                    <div className="relative">
                                        <div className="absolute -inset-6 bg-orange-500/15 rounded-full blur-2xl animate-pulse" />
                                        <div className="relative drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]" style={{ fontSize: 56 }}>🔒</div>
                                    </div>
                                    <div className="flex flex-col gap-3 max-w-xs">
                                        <h2 className="text-white font-black text-xl uppercase tracking-[0.3em] leading-none drop-shadow-lg">
                                            {scheduledRemaining != null && scheduledRemaining > 0 ? t('smartTraining.launchingSoon') : t('smartTraining.waitingForCoach')}
                                        </h2>
                                        
                                        {scheduledRemaining != null && scheduledRemaining > 0 ? (
                                            <div className="mt-4 flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl shadow-xl">
                                                    <Timer size={20} className="text-orange-500 animate-pulse" />
                                                    <span className="text-4xl font-black text-white tabular-nums tracking-tighter">
                                                        {Math.floor(scheduledRemaining / 60)}:{String(scheduledRemaining % 60).padStart(2, '0')}
                                                    </span>
                                                </div>
                                                <p className="text-orange-500/60 text-[8px] font-black uppercase tracking-[0.4em] animate-bounce mt-2">
                                                    {t('smartTraining.prepareToJump')}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em] leading-relaxed">
                                                {t('smartTraining.readyStart')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500/60 animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isRemotePaused && (
                        <div 
                            className="absolute inset-0 z-[100] backdrop-blur-2xl flex flex-col items-center justify-center gap-4 text-center pointer-events-auto cursor-pointer group" 
                            style={{ background: 'rgba(10,10,20,0.45)' }}
                            onClick={() => setIsRemotePaused(false)}
                        >
                            <div className="flex flex-col items-center gap-6 px-10 py-10 rounded-[2.5rem] border border-white/10 shadow-2xl transition-all group-hover:scale-105 group-active:scale-95" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(40px)' }}>
                                <div className="relative">
                                    <Pause size={36} className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all group-hover:text-green-400" fill="currentColor" />
                                    <Play size={20} className="absolute inset-0 m-auto text-black opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <p className="text-white font-black text-base uppercase tracking-widest">{t('smartTraining.sessionPaused')}</p>
                                    <p className="text-white/30 font-black text-[8px] uppercase tracking-[0.3em] animate-pulse">{t('smartTraining.clickToResume')}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 4. Timer Picker Sidebar (Interactive Overlay) */}
            {showTimerPicker && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setShowTimerPicker(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                    <div className="relative z-10 rounded-3xl border overflow-hidden shadow-2xl" style={{ background: 'rgba(10,10,12,0.98)', borderColor: 'rgba(255,255,255,0.08)', width: 280 }} onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 flex flex-col gap-4">
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 text-white text-center">{t('smartTraining.setTimer')}</span>
                            <div className="flex justify-center gap-6 py-6">
                                <div className="flex flex-col items-center gap-3">
                                    <button onClick={() => setCountdownMins(m => Math.min(60, m + 1))} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors relative">
                                        <div className="w-3 h-0.5 bg-current absolute" /><div className="w-0.5 h-3 bg-current absolute" />
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-4xl font-black text-white tabular-nums">{String(countdownMins).padStart(2, '0')}</span>
                                        <span className="text-[9px] font-bold text-white/30 mb-1 tracking-widest uppercase">{t('smartTraining.mins')}</span>
                                    </div>
                                    <button onClick={() => setCountdownMins(m => Math.max(0, m - 1))} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors relative">
                                        <div className="w-3 h-0.5 bg-current absolute" />
                                    </button>
                                </div>
                                <span className="text-4xl font-black text-white/20 pt-10">:</span>
                                <div className="flex flex-col items-center gap-3">
                                    <button onClick={() => setCountdownSecs(s => (s + 5 >= 60 ? 0 : s + 5))} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors relative">
                                        <div className="w-3 h-0.5 bg-current absolute" /><div className="w-0.5 h-3 bg-current absolute" />
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-4xl font-black text-white tabular-nums">{String(countdownSecs).padStart(2, '0')}</span>
                                        <span className="text-[9px] font-bold text-white/30 mb-1 tracking-widest uppercase">{t('smartTraining.secs')}</span>
                                    </div>
                                    <button onClick={() => setCountdownSecs(s => (s - 5 < 0 ? 55 : s - 5))} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors relative">
                                        <div className="w-3 h-0.5 bg-current absolute" />
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setShowTimerPicker(false)} className="w-full py-4 mt-2 bg-blue-500 hover:bg-blue-400 transition-colors rounded-xl text-black font-black text-xs tracking-widest uppercase shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                {t('smartTraining.confirmTime')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Summary Report Overlay (Compact & Refined Version) */}
            {showSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-[300px] relative">
                        <div className="relative bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col gap-6 backdrop-blur-md">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h2 className="text-sm font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-primary to-cyan-400">
                                        {t('smartTraining.workoutResults')}
                                    </h2>
                                    <p className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">{t('smartTraining.sessionSummary')}</p>
                                </div>
                                <button onClick={() => setShowSummary(false)} className="text-white/20 hover:text-white/40"><X size={14} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-1">
                                    <span className="text-[140px] font-black text-white leading-none tracking-tighter drop-shadow-2xl">{jumps}</span>
                                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em] -mt-2">{t('smartTraining.totalJumps')}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center">
                                    <span className="text-xs font-black text-white">{Math.floor(activeSeconds / 60)}:{String(activeSeconds % 60).padStart(2, '0')}</span>
                                    <span className="text-[6px] font-bold text-green-400/30 uppercase tracking-widest mt-1">{t('smartTraining.workTime')}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center">
                                    <span className="text-xs font-black text-white">{Math.floor(finalRestSecs / 60)}:{String(finalRestSecs % 60).padStart(2, '0')}</span>
                                    <span className="text-[6px] font-bold text-orange-400/30 uppercase tracking-widest mt-1">{t('smartTraining.restTime')}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center">
                                    <span className="text-xs font-black text-white">{rpm}</span>
                                    <span className="text-[6px] font-bold text-blue-400/30 uppercase tracking-widest mt-1">{t('smartTraining.avgRpm')}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center">
                                    <span className="text-xs font-black text-white">{Math.floor(totalSeconds / 60)}:{String(totalSeconds % 60).padStart(2, '0')}</span>
                                    <span className="text-[6px] font-bold text-white/10 uppercase tracking-widest mt-1">{t('smartTraining.totalTime')}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-4">
                                <button
                                    onClick={() => setShowSummary(false)}
                                    className="px-6 py-2.5 bg-transparent border border-white/10 rounded-full font-black uppercase text-[8px] text-white/60 tracking-[0.2em] hover:bg-white/5 transition-all self-center"
                                >
                                    {t('smartTraining.finishWorkout')}
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={() => navigate('/jump-rope-hub')}
                                        className="text-[7px] font-black text-white/20 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <ArrowLeft size={8} /> {t('smartTraining.trainerHub')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. Admin Generator Modal */}
            {isAdmin && showPlanModal && (
                <SmartPlanModal
                    studentId={resolvedStudentId}
                    studentName={students?.find((s: any) => s.id === resolvedStudentId)?.full_name || 'Athlete'}
                    isOpen={showPlanModal} onClose={() => setShowPlanModal(false)}
                />
            )}
        </div>
    );
}
