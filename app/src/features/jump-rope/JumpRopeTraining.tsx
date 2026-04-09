import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Play, Square, RefreshCcw, Activity, Pause, Camera, Volume2, VolumeX, TrendingUp, Trophy, Clock, Zap, ArrowLeft, X, Loader2, AlertTriangle, Sparkles, Calendar, Users } from 'lucide-react';
import Webcam from 'react-webcam';
import { useAddJumpRopeSession, useTrainingAssignment, useJumpRopeAccess, useStudents, useAssignTraining } from '../../hooks/useData';
import { useSmartPlan } from '../../hooks/useSmartPlan';
import { supabase } from '../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWebRTCBroadcast } from '../../hooks/useWebRTCBroadcast';
import PageHeader from '../../components/PageHeader';
import PremiumSelect from '../../components/PremiumSelect';
import SmartPlanModal from './components/SmartPlanModal';

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

export default function JumpRopeTraining() {
    const { t } = useTranslation();
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
    
    // Plan & Admin States
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [activePlan, setActivePlan] = useState<any>(null);
    const [targetJumps, setTargetJumps] = useState<number | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

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

    const { data: assignmentData } = useTrainingAssignment();
    const { data: access } = useJumpRopeAccess();
    const { data: students } = useStudents();
    const isAdmin = access?.isAdmin;
    const user = (access as any)?.user;
    const assignment = assignmentData as any;

    // 1. Fetch Personal Training Plan (AI) and Listen to Realtime Broadcasts
    useEffect(() => {
        if (!user?.id) return;

        let activeStudentId = user.id;

        const setupTrainingPlan = async () => {
            console.log('📡 Realtime: Setting up for user:', user.id);
            
            // First, resolve the actual student ID matching this profile
            const { data: stData, error: stError } = await supabase
                .from('students')
                .select('id')
                .eq('profile_id', user.id)
                .maybeSingle();

            if (stError) {
                console.error('❌ Realtime: Error resolving student ID:', stError);
                return;
            }

            if (stData?.id) {
                activeStudentId = stData.id;
                console.log('✅ Realtime: Resolved Student ID:', activeStudentId);
            } else {
                console.warn('⚠️ Realtime: No student record found for profile, using profile_id as fallback');
            }

            // Fetch the latest active plan
            const { data } = await supabase
                .from('training_plans')
                .select('*')
                .eq('student_id', activeStudentId)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (data && data.length > 0) {
                console.log('📋 Realtime: Initial plan found:', data[0].id);
                applyPlanTargets(data[0]);
            }

            // Set up Realtime Listener for Live Broadcasts!
            console.log('🔄 Realtime: Subscribing to channel for student_id:', activeStudentId);
            const channel = supabase.channel(`direct_broadcasts_${activeStudentId}`)
                .on(
                    'postgres_changes',
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'training_plans', 
                        filter: `student_id=eq.${activeStudentId}` 
                    },
                    (payload) => {
                        console.log('⚡ Realtime: Received event:', payload.eventType, payload.new);
                        applyPlanTargets(payload.new);
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Realtime: Subscription status:', status);
                });

            return () => {
                console.log('🔌 Realtime: Terminating subscription for:', activeStudentId);
                supabase.removeChannel(channel);
            };
        };

        const applyPlanTargets = (plan: any) => {
            setActivePlan(plan);
            
            // Auto-set targets from plan if they exist
            if (plan.target_jumps) {
                setTargetJumps(plan.target_jumps);
                speak('New jump targets received from coach.');
            }
            if (plan.target_time) {
                const total = plan.target_time * 60;
                setCountdownMins(plan.target_time);
                setCountdownSecs(0);
                setTimerRemaining(total);
                timerRemainingRef.current = total;
                speak('New time targets received from coach.');
            }
        };

        let cleanupFn: any = null;
        setupTrainingPlan().then(cleanup => cleanupFn = cleanup);

        return () => {
            if (cleanupFn) cleanupFn();
        };
    }, [user?.id]);

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
        if (!canvasRef.current || !results.poseLandmarks || !webcamRef.current?.video) return;
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
                const nextStatus = (isTooClose && isSessionActiveRef.current) ? 'TOO_CLOSE' : !isFullBody ? 'STEP_BACK' : 'MOVING';
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
        const totalWork = workTimeRef.current;
        const totalRest = restTimeRef.current;
        const totalJumps = jumpCountRef.current;
        const finalRpm = Math.round(totalJumps / ((totalWork || 1) / 60)) || 0;
        setFinalRestSecs(totalRest);
        setJumps(totalJumps);
        setRpm(finalRpm);
        setTotalSeconds(totalWork + totalRest);
        addSession({ jumps: totalJumps, duration: totalWork + totalRest, rpm: finalRpm });
        setShowSummary(true);
        speak(`${totalJumps} jumps completed.`);
    }, [addSession, speak]);

    const handleStart = () => {
        const total = (countdownMins * 60) + countdownSecs;
        setTimerRemaining(total > 0 ? total : null);
        timerRemainingRef.current = total > 0 ? total : null;
        setIsTracking(true); 
        setIsSessionActive(true);
        isSessionActiveRef.current = true;
        setIsTimerActive(true); 
        isTimerActiveRef.current = true;
        isTimerStartedRef.current = true; 
        speak("Session ready. Start jumping now!");
        jumpCountRef.current = 0; setJumps(0); setRpm(0); setTotalSeconds(0);
        workTimeRef.current = 0; restTimeRef.current = 0; lastActivityTimeRef.current = 0;
        intensityHistoryRef.current = [];
        setIntensityStatus('READY'); setCurrentRestSecs(0);
    };

    return (
        <div className="flex-1 flex flex-col relative w-full overflow-hidden font-sans antialiased">
            {/* 1. Immersive Camera Base */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                <Webcam ref={webcamRef} className="w-full h-full object-cover opacity-80 contrast-[1.1]" mirrored={true} onUserMedia={handleVideoLoad} onUserMediaError={handleCameraError} />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none opacity-50" width={640} height={480} />
            </div>

            {/* 2. Professional HUD Logic Header */}
            <div className="relative z-[60] px-4 sm:px-8 pt-2">
                <PageHeader title={t('common.performanceTracker')} subtitle="AI POWERED PERFORMANCE MONITORING">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        {!isSessionActive && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-1 py-1 bg-transparent">
                                    <Trophy size={12} className="text-accent/60" />
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">Target</span>
                                        <input type="number" value={targetJumps || ''} onChange={(e) => setTargetJumps(e.target.value ? parseInt(e.target.value) : null)} placeholder="Target" className="bg-transparent border-none text-[10px] font-black text-white focus:ring-0 p-0 w-8" />
                                    </div>
                                </div>
                                <button onClick={openTimerPicker} className="flex items-center gap-2 px-1 py-1 bg-transparent hover:opacity-70">
                                    <Clock size={12} className="text-blue-400/60" />
                                    <div className="flex flex-col items-start">
                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">Timer</span>
                                        <span className="text-[10px] font-black text-white leading-none">{String(countdownMins).padStart(2,'0')}:{String(countdownSecs).padStart(2,'0')}</span>
                                    </div>
                                </button>
                            </div>
                        )}
                        <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`w-8 h-8 flex items-center justify-center ${voiceEnabled ? 'text-primary' : 'text-white/40'}`}>
                            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                    </div>
                </PageHeader>
            </div>

            {/* 3. Primary HUD Counter Layer */}
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

                    <div className="absolute bottom-6 pb-safe inset-x-0 flex flex-col items-center gap-5 px-10 pointer-events-auto">
                        {!isSessionActive ? (
                            <button 
                                onClick={handleStart} 
                                className="w-full max-w-[240px] h-11 rounded-full border border-blue-400/30 bg-blue-400/5 backdrop-blur-md text-blue-400 font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_10px_30px_rgba(96,165,250,0.1)] transition-all active:scale-95 hover:bg-blue-400/10 flex items-center justify-center gap-3"
                            >
                                <Play size={12} fill="currentColor" /> START TRAINING
                            </button>
                        ) : (
                            <button 
                                onClick={handleFinish} 
                                className="w-full max-w-[240px] h-11 rounded-full border border-white/10 bg-white/5 backdrop-blur-md font-black uppercase tracking-[0.3em] text-[10px] transition-all active:scale-95 flex items-center justify-center gap-3 text-white"
                            >
                                <div className="w-2 h-2 bg-blue-400 rounded-sm shadow-[0_0_10px_rgba(96,165,250,0.5)]" /> FINISH SESSION
                            </button>
                        )}
                    </div>
                </div>
            )}


            {/* 2. Integrated Training Plan Display (Student View Only) */}
            {!isAdmin && activePlan && (
                <div className="relative z-[60] px-4 sm:px-8 pb-10 mt-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="w-full max-w-4xl mx-auto bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
                        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8">
                            <div className="flex flex-col">
                                <h3 className="text-3xl font-black tracking-[.2em] uppercase text-white leading-none">
                                    {activePlan.status === 'direct_target' ? 'Direct Protocol' : 'Your Strategy'}
                                </h3>
                                <p className="text-xs font-black uppercase tracking-[0.5em] text-orange-500 mt-3 flex items-center gap-2">
                                    <Sparkles size={12} /> {activePlan.status === 'direct_target' ? 'Custom Session Goal' : 'Personalized AI Workout'}
                                </p>
                            </div>
                            <div className="flex gap-8">
                                <div className="text-right">
                                    <span className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 font-mono italic">Daily Burn Goal</span>
                                    <span className="text-3xl font-black text-orange-500 tracking-tighter">{activePlan.target_calories || 0} KCAL</span>
                                </div>
                            </div>
                        </div>

                        {activePlan.plan_content && activePlan.plan_content.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {activePlan.plan_content.map((day: any, i: number) => (
                                    <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 space-y-6 hover:bg-white/[0.06] transition-all duration-500 shadow-xl">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-orange-500 uppercase tracking-[0.2em]">{day.day}</span>
                                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]" />
                                        </div>
                                        <div className="space-y-4">
                                            {day.details.map((ex: any, j: number) => (
                                                <div key={j} className="flex flex-col gap-1 border-l-2 border-orange-500/20 pl-4 py-1">
                                                    <span className="text-xs font-black text-white uppercase tracking-tight leading-none drop-shadow-lg">{ex}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 rounded-[3rem] bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center gap-6">
                                <div className="p-6 rounded-3xl bg-cyan-500/10 text-cyan-400">
                                    <Zap size={40} fill="currentColor" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-black text-white uppercase tracking-widest">Targets Synced</h4>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] max-w-sm mx-auto">
                                        Your coach has broadcasted a direct session goal. Launch the tracker above to begin your objective.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 4. Timer Picker Sidebar (Simplified Overlay) */}
            {showTimerPicker && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setShowTimerPicker(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 rounded-3xl border overflow-hidden" style={{ background: 'rgba(10,10,12,0.98)', borderColor: 'rgba(255,255,255,0.08)', width: 220 }} onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-3 flex flex-col gap-2">
                             <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-25 text-white">SET TIMER</span>
                             {/* iOS Style Scroll Implementation Placeholder (simplified for this write) */}
                             <div className="flex justify-center gap-4 py-6">
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] font-bold text-white/20 mb-2">MIN</span>
                                    <span className="text-2xl font-black text-white">{String(countdownMins).padStart(2,'0')}</span>
                                </div>
                                <span className="text-2xl font-black text-white/20">:</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] font-bold text-white/20 mb-2">SEC</span>
                                    <span className="text-2xl font-black text-white">{String(countdownSecs).padStart(2,'0')}</span>
                                </div>
                             </div>
                             <button onClick={() => setShowTimerPicker(false)} className="w-full py-3 bg-blue-400 rounded-xl text-black font-black text-[10px]">DONE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Summary Report Overlay */}
            {showSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="w-full max-w-[340px] border rounded-[2rem] p-6 shadow-2xl relative flex flex-col gap-5" style={{ background: 'rgba(10,10,10,0.98)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-white uppercase">Workout Report</h2>
                            <button onClick={() => setShowSummary(false)} className="w-7 h-7 rounded-full bg-white/5 text-white/30 flex items-center justify-center"><X size={14}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-4 rounded-xl bg-white/5 text-center">
                                <span className="block text-2xl font-black text-white">{jumps}</span>
                                <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest">Jumps</span>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-400/10 text-center">
                                <span className="block text-2xl font-black text-blue-400">{rpm}</span>
                                <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest">Avg RPM</span>
                            </div>
                        </div>
                        <button onClick={() => setShowSummary(false)} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white tracking-widest">Dismiss</button>
                    </div>
                </div>
            )}

            {/* 6. Admin Generator Modal */}
            {isAdmin && showPlanModal && (
                <SmartPlanModal 
                    studentId={selectedStudentId} 
                    studentName={students?.find((s: any) => s.id === selectedStudentId)?.full_name || 'Athlete'}
                    isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} 
                />
            )}
        </div>
    );
}
