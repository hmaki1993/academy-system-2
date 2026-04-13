import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Play, Square, RefreshCcw, Activity, Pause, Camera, Volume2, VolumeX, TrendingUp, Trophy, Clock, Zap, ArrowLeft, X, Loader2, AlertTriangle, Sparkles, Calendar, Users, RotateCcw, Timer } from 'lucide-react';
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
import { toast } from 'react-hot-toast';

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
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [isRemotePaused, setIsRemotePaused] = useState(false);
    const [resolvedStudentId, setResolvedStudentId] = useState<string>('');
    const { updateSessionStatus } = useSmartPlan();
    const [targetJumps, setTargetJumps] = useState<number | null>(null);
    const [targetTime, setTargetTime] = useState<number | null>(null);

    // Countdown Timer State
    const [countdownMins, setCountdownMins] = useState(0);
    const [countdownSecs, setCountdownSecs] = useState(0);
    const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [showTimerPicker, setShowTimerPicker] = useState(false);
    const lastPlanIdRef = useRef<string | null>(null);
    const minsScrollRef = useRef<HTMLDivElement>(null);
    const secsScrollRef = useRef<HTMLDivElement>(null);
    const [scheduledRemaining, setScheduledRemaining] = useState<number | null>(null);
    const ITEM_H = 44;
    const MIN_OPTIONS = Array.from({ length: 21 }, (_, i) => i);
    const SEC_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5);

    const { data: assignmentData } = useTrainingAssignment();
    const { data: access } = useJumpRopeAccess();
    const { data: students } = useStudents();
    const isAdmin = access?.isAdmin;
    const user = (access as any)?.user;
    const assignment = assignmentData as any;

    const speak = useCallback((text: string) => {
        if (!voiceEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    }, [voiceEnabled]);

    const handleFinish = useCallback(async () => {
        setIsSessionActive(false);
        isSessionActiveRef.current = false;
        const totalWork = workTimeRef.current;
        const totalRest = restTimeRef.current;
        const totalJumps = jumpCountRef.current;
        const finalRpm = Math.round(totalJumps / ((totalWork || 1) / 60)) || 0;

        // Guarantee session delivery to Admin Hub
        if (totalJumps > 0) {
            addSession({
                jumps: totalJumps,
                duration: totalWork + totalRest,
                rpm: finalRpm,
                student_id: resolvedStudentId,
                work_duration: totalWork,
                rest_duration: totalRest
            });
        }

        setFinalRestSecs(totalRest);
        setJumps(totalJumps);
        setRpm(finalRpm);
        setTotalSeconds(totalWork + totalRest);

        // Auto-lock session on completion for "Remote Control" experience
        if (resolvedStudentId) {
            await updateSessionStatus(resolvedStudentId, 'idle');
        }

        setShowSummary(true);
        speak(`${totalJumps} ${t('smartTraining.jumpsCompleted')}`);
    }, [addSession, speak, resolvedStudentId, updateSessionStatus, t]);

    const handleRestart = useCallback(() => {
        // Reset everything to deep zero
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

        // Timer Reset Logic
        const total = (countdownMins * 60) + countdownSecs;
        setTimerRemaining(total > 0 ? total : null);
        timerRemainingRef.current = total > 0 ? total : null;

        setIsTimerActive(false);
        isTimerActiveRef.current = false;
        isTimerStartedRef.current = false;

        // Return to "Start Training" state
        setIsSessionActive(false);
        setIsTracking(false);

        speak(t('smartTraining.sessionReset'));
    }, [speak, countdownMins, countdownSecs, t]);

    // Admins are never locked; students start locked until coach sends 'live'
    const [isRemoteLocked, setIsRemoteLocked] = useState(true);
    useEffect(() => {
        if (isAdmin) setIsRemoteLocked(false);
    }, [isAdmin]);

    // 1. Fetch Personal Training Plan and Poll for Status Changes
    const applyPlanTargets = useCallback((plan: any) => {
        if (!plan) return;
        setActivePlan(plan);

        const isNewPlan = lastPlanIdRef.current !== plan.id;

        if (plan.status === 'live') {
            setIsRemoteLocked(false);
            setIsRemotePaused(false);

            // Auto-set session as active if live, but don't start timer yet
            if (plan.target_time && !isSessionActiveRef.current) {
                const totalSecs = Number(plan.target_time) * 60;
                setCountdownMins(Number(plan.target_time));
                setCountdownSecs(0);
                setTimerRemaining(totalSecs);
                timerRemainingRef.current = totalSecs;

                // Auto-launch the session structure
                setIsSessionActive(true);
                isSessionActiveRef.current = true;

                // START MOD: Keep timer inactive initially
                setIsTimerActive(false);
                isTimerActiveRef.current = false;

                isTimerStartedRef.current = true;
                jumpCountRef.current = 0;
                workTimeRef.current = 0;
                restTimeRef.current = 0;
                lastActivityTimeRef.current = 0;
                intensityHistoryRef.current = [];
                speak(t('smartTraining.readyJump'));
            }
        } else if (plan.status === 'scheduled') {
            setIsRemoteLocked(!isAdmin); // Admins bypass lock
        } else if (plan.status === 'paused') {
            setIsRemotePaused(true);
        } else if (plan.status === 'idle') {
            setIsRemoteLocked(!isAdmin); // Admins bypass lock
        } else if (plan.status === 'restarting') {
            setIsRemoteLocked(false);
            setIsRemotePaused(false);
            const restartKey = plan.updated_at || plan.id || plan.created_at || 'once';
            if ((window as any).__lastRestartKey !== restartKey) {
                (window as any).__lastRestartKey = restartKey;
                handleRestart();
            }
        }

        // Update targets ONLY if session is not already active to prevent timer reset "jumps"
        if (plan.target_jumps != null) setTargetJumps(Number(plan.target_jumps));
        if (plan.target_time != null && !isSessionActiveRef.current) {
            const total = Number(plan.target_time) * 60;
            setCountdownMins(Number(plan.target_time));
            setCountdownSecs(0);
            setTimerRemaining(total);
            timerRemainingRef.current = total;
        }
        lastPlanIdRef.current = plan.id;
    }, [handleRestart, speak, isAdmin]);

    const fetchLatestPlan = useCallback(async () => {
        // 🛡️ Strict Guard: Ensure user id exists and looks like a valid UUID before querying profiles/students
        if (!user?.id || user.id.length < 30) return; 
        
        try {
            // Step 1: Get the student's integer ID using their profile UUID
            const { data: stData, error: stError } = await supabase
                .from('students')
                .select('id')
                .eq('profile_id', user.id)
                .maybeSingle();

            if (stError || !stData?.id) return; // Student not registered yet

            // Step 2: Fetch their training plan by integer student_id
            const { data: planData, error: planError } = await supabase
                .from('training_plans')
                .select('*')
                .eq('student_id', stData.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (planError) throw planError;

            if (planData && planData.length > 0) {
                setResolvedStudentId(stData.id);
                applyPlanTargets(planData[0]);
            }
        } catch (e) {
            console.error('fetchLatestPlan SafeGuard:', e);
        }
    }, [user?.id, applyPlanTargets]);

    // 2. Automated Scheduled Start Checker
    useEffect(() => {
        if (!activePlan || activePlan.status !== 'scheduled' || !activePlan.scheduled_start) {
            setScheduledRemaining(null);
            return;
        }

        const checkTime = setInterval(async () => {
            const now = new Date();
            const [targetH, targetM] = activePlan.scheduled_start.split(':').map(Number);
            const targetDate = new Date();
            targetDate.setHours(targetH, targetM, 0, 0);

            // Calculate diff.
            let diffSeconds = Math.ceil((targetDate.getTime() - now.getTime()) / 1000);
            const isToday = now.toDateString() === targetDate.toDateString();

            // 🎯 SECURE AUTO-START:
            // Only fire if it's TODAY and the time has arrived.
            if (isToday && diffSeconds <= 0 && activePlan.status === 'scheduled') {
                console.log("🎯 SCHEDULED TIME REACHED! AUTO-STARTING...");
                clearInterval(checkTime);
                setScheduledRemaining(0);

                try {
                    await supabase
                        .from('training_plans')
                        .update({ status: 'live' })
                        .eq('id', activePlan.id);
                    
                    fetchLatestPlan();
                } catch (err) {
                    console.error("Failed to auto-transition scheduled session:", err);
                }
            } else if (diffSeconds > 0) {
                setScheduledRemaining(diffSeconds);
            } else if (isToday) {
                setScheduledRemaining(0);
            } else {
                setScheduledRemaining(null);
            }
        }, 1000); // Check every 1 second for smooth countdown

        return () => clearInterval(checkTime);
    }, [activePlan, fetchLatestPlan]);

    // 1. Fetch Personal Training Plan and Poll for Status Changes
    useEffect(() => {
        if (!user?.id) return;

        let pollInterval: any = null;

        const init = async () => {
            if (!user?.id || user.id.length < 30) return;

            // Resolve student_id for handleFinish auto-lock
            const { data: stData, error: stError } = await supabase
                .from('students')
                .select('id')
                .eq('profile_id', user.id)
                .maybeSingle();
            
            if (stError) console.error('Init st lookup error:', stError);
            if (stData?.id) setResolvedStudentId(stData.id);

            // Initial fetch
            await fetchLatestPlan();

            // Poll every 3 seconds for status changes from coach
            pollInterval = setInterval(() => {
                fetchLatestPlan();
            }, 3000);
        };

        init();

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [fetchLatestPlan, user?.id]);

    // 🛰️ CONSOLIDATED BROADCAST HUB: Presence + Instructions (ROCK-SOLID)
    useEffect(() => {
        if (!user?.id) return;

        const channelId = `direct_broadcasts_${user.id}`;
        console.log(`📡 STUDENT: Initializing persistent channel [${channelId}]`);

        const channel = supabase.channel(channelId)
            .on('broadcast', { event: 'STUDENT_ACK' }, () => {
                // Self-ack (safe to ignore)
            })
            .on('broadcast', { event: 'SYNC_ALERTS' }, ({ payload }) => {
                console.log('🚀 ROCKET SYNC RECEIVED:', payload);
                
                // 1. Lifecycle Status Updates
                if (payload?.type === 'session_status_update') {
                    if (payload.status) {
                        // 🚀 ROCKET FOR LIVE START:
                        if (payload.status === 'live') {
                            toast.success(t('smartTraining.missionLive'), {
                                duration: 5000,
                                icon: '🔥',
                                style: { background: '#0b0e18', color: '#10b981', border: '1px solid #10b981' }
                            });
                        }
                        
                        // Internal state refresh
                        if (activePlan) {
                            setActivePlan((prev: any) => prev ? { ...prev, status: payload.status } : null);
                        }
                        fetchLatestPlan();
                    }
                }

                // 2. Direct Target Updates
                if (payload?.type === 'target_update') {
                    const tJumps = payload.target_jumps || '??';
                    const tTime = payload.target_time || '??';
                    toast.success(`${t('smartTraining.newMission')}: ${tJumps} ${t('smartTraining.jumps')} / ${tTime} ${t('smartTraining.mins')}`, {
                        duration: 5000,
                        position: 'top-center',
                        icon: '🎯',
                        style: { background: '#0b0e18', color: '#3b82f6', border: '1px solid #3b82f6' }
                    });
                    fetchLatestPlan();
                } else if (payload?.refresh_plan) {
                    fetchLatestPlan();
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ STUDENT: Persistence active on [${channelId}]`);
                    
                    // Fire the handshake ONE time upon entry
                    await channel.send({
                        type: 'broadcast',
                        event: 'STUDENT_ACK',
                        payload: { userId: user.id, timestamp: new Date().toISOString() }
                    });
                    console.log('🤝 HANDSHAKE: BROADCASTED PRESENCE');
                }
                if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.warn(`⚠️ STUDENT: Channel ${status}. Connection might be fragile.`);
                }
            });

        return () => {
            console.log(`🔌 STUDENT: Cleaning up channel [${channelId}]`);
            supabase.removeChannel(channel);
        };
    }, [user?.id]); // 🛡️ ONLY dependent on userId to prevent flickering


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
            if (!isTimerActiveRef.current || isRemotePaused) return;
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
    }, [isSessionActive, isTracking]);





    const handleStart = async () => {
        const total = (countdownMins * 60) + countdownSecs;
        setTimerRemaining(total > 0 ? total : null);
        timerRemainingRef.current = total > 0 ? total : null;
        setIsTracking(true);
        setIsSessionActive(true);
        isSessionActiveRef.current = true;
        setIsTimerActive(true);
        isTimerActiveRef.current = true;

        // Sync to Database so background polling doesn't reset status to idle
        if (resolvedStudentId) {
            updateSessionStatus(resolvedStudentId, 'live');
        }

        console.log("Timer started manually via button");
        speak(t('smartTraining.readyStart'));
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
            <div className="relative z-[60] px-4 sm:px-8 pt-2 sm:pt-4 flex flex-col gap-2 sm:gap-4">
                <PageHeader title={t('common.performanceTracker')} subtitle="AI PERFORMANCE MONITOR">
                    <div className="flex items-center gap-3 sm:gap-6">
                        {!isSessionActive && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 shadow-inner group">
                                    <Trophy size={12} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                                    {isAdmin ? (
                                        <input
                                            type="number"
                                            value={targetJumps || ''}
                                            onChange={(e) => setTargetJumps(e.target.value ? parseInt(e.target.value) : null)}
                                            placeholder="0"
                                            className="bg-transparent border-none text-xs font-black text-white focus:ring-0 p-0 w-12 placeholder:text-white/20"
                                        />
                                    ) : (
                                        <div className="flex flex-col -space-y-1">
                                            <span className="text-[7px] font-bold text-white/30 uppercase tracking-tighter">{t('smartTraining.goal')}</span>
                                            <span className="text-xs font-black text-white tabular-nums">{targetJumps || 0}</span>
                                        </div>
                                    )}
                                </div>
                                <button onClick={isAdmin ? openTimerPicker : undefined} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent border border-white/10 ${isAdmin ? 'hover:bg-white/5 active:scale-95 cursor-pointer' : 'cursor-default'}`}>
                                    <Clock size={10} className="text-blue-400/60" />
                                    <span className="text-[10px] font-black text-white">{String(countdownMins).padStart(2, '0')}:{String(countdownSecs).padStart(2, '0')}</span>
                                </button>
                            </div>
                        )}
                        <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${voiceEnabled ? 'bg-primary/10 text-primary' : 'bg-white/5 text-white/40'}`}>
                            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>
                    </div>
                </PageHeader>
            </div>

            {/* 3. Primary HUD Counter Layer (Zoned for Mobile) */}
            {!showSummary && (
                <div className="relative flex-1 flex flex-col justify-between pointer-events-none z-[50] pt-2 pb-0 sm:pt-12 sm:pb-2 px-4">

                    {/* TOP ZONE */}
                    <div className="flex justify-center min-h-[30px] pointer-events-auto">
                        {!isAdmin && !isRemoteLocked && targetJumps && targetJumps > 0 && (
                            <div className="flex justify-center transition-all animate-in slide-in-from-top duration-500">
                                <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/5 shadow-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-white tabular-nums">
                                            {jumps} <span className="text-white/20 mx-0.5">/</span> <span className="text-blue-400">{targetJumps}</span>
                                        </span>
                                        <div className="w-16 sm:w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-400 rounded-full transition-all duration-700"
                                                style={{ width: `${Math.min(100, (jumps / targetJumps) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CENTER ZONE */}
                    <div className="relative flex-col flex items-center justify-center pt-2">
                        <div className="absolute inset-0 bg-blue-400/5 blur-[80px] rounded-full" />
                        <span className="text-blue-400 text-[8px] font-black uppercase tracking-[0.8em] mb-0 relative z-10 opacity-30">{t('smartTraining.jumps')}</span>
                        <span className="text-[7.5rem] sm:text-[180px] font-black leading-none tracking-tighter relative z-10 select-none text-white drop-shadow-2xl">
                            {jumps}
                        </span>

                        <div className="mt-1 flex items-center gap-2 relative z-10">
                            <div className="px-3 py-1 rounded-full border border-white/5 bg-white/[0.03] backdrop-blur-3xl flex items-center gap-2">
                                <Activity size={9} className="text-blue-400/50" />
                                <span className="font-black text-[9px] tracking-[0.1em] text-white/80">{rpm} {t('smartTraining.rpm')}</span>
                            </div>
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

                                {!isSessionActive ? (
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

                    {/* Session Lock / Scheduled Overlay (Perfectly Centered) */}
                    {isRemoteLocked && !isAdmin && (
                        <div className="absolute inset-0 z-[100] backdrop-blur-2xl flex flex-col items-center justify-center gap-8 text-center p-6 pointer-events-auto" style={{ background: 'rgba(10,10,20,0.55)' }}>
                            {activePlan?.status === 'scheduled' ? (
                                /* Emerald Mission Control / Scheduled Overlay */
                                <div className="w-full max-w-[380px] aspect-square flex flex-col items-center justify-center p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl animate-in zoom-in-95 duration-700 saturate-[1.2]" style={{ background: 'rgba(16,185,129,0.04)', backdropFilter: 'blur(40px)' }}>
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
                                            <span className="text-lg font-black text-white">{activePlan.target_jumps || '∞'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">{t('smartTraining.totalTime')}</span>
                                            <span className="text-lg font-black text-white">{activePlan.target_time ? `${activePlan.target_time}m` : '∞'}</span>
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
                                        <h2 className="text-white font-black text-xl uppercase tracking-[0.3em] leading-none drop-shadow-lg">{t('smartTraining.waitingForCoach')}</h2>
                                        <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em] leading-relaxed">
                                            {t('smartTraining.readyStart')}
                                        </p>
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
                        <div className="absolute inset-0 z-[100] backdrop-blur-2xl flex flex-col items-center justify-center gap-4 text-center pointer-events-auto" style={{ background: 'rgba(10,10,20,0.45)' }}>
                            <div className="flex flex-col items-center gap-6 px-10 py-10 rounded-[2.5rem] border border-white/10 shadow-2xl" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(40px)' }}>
                                <Pause size={36} className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" fill="currentColor" />
                                <p className="text-white font-black text-base uppercase tracking-widest">{t('smartTraining.sessionPaused')}</p>
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
                    studentId={selectedStudentId}
                    studentName={students?.find((s: any) => s.id === selectedStudentId)?.full_name || 'Athlete'}
                    isOpen={showPlanModal} onClose={() => setShowPlanModal(false)}
                />
            )}
        </div>
    );
}
