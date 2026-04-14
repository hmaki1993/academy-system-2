import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
    LayoutDashboard,
    Users,
    UserCircle,
    Calendar,
    Wallet,
    Settings,
    Video,
    CreditCard,
    Menu,
    X,
    LogOut,
    Wrench,
    Building2,
    Bell,
    ChevronDown,
    MessageSquare,
    Globe,
    UserPlus,
    ExternalLink,
    ClipboardCheck,
    Activity,
    Sparkles,
    Search,
    Loader2,
    Film,
    Medal
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import PremiumClock from '../components/PremiumClock';
import MinimalCountdown from '../components/MinimalCountdown';
import WalkieTalkie from '../components/WalkieTalkie';
import { playHoverSound } from '../utils/audio';
import { playNotificationSound, resumeAudioContext } from '../utils/notifications';
import { usePresenceContext } from '../context/PresenceContext';
import { PushNotificationPrompt } from '../components/PushNotificationPrompt';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout() {
    const { t, i18n } = useTranslation();
    const { settings, updateSettings, userProfile } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
    const isChatView = location.pathname.includes('/communications');
    const isSidebarRevealed = !isChatView || isHoveringSidebar;

    // AI TRACKER REAL-TIME STATE (GLOBAL)
    const [scheduledStart, setScheduledStart] = useState<string | null>(null);
    const [planStatus, setPlanStatus] = useState<string | null>(null);

    // Derived states from unified userProfile
    const userId = userProfile?.id || null;
    const role = userProfile?.role?.toLowerCase() || null;
    const normalizedRole = role?.toLowerCase().trim().replace(/\s+/g, '_');
    const fullName = userProfile?.full_name?.trim() || null;
    const userEmail = userProfile?.email?.trim() || null;
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userStatus, setUserStatus] = useState<'online' | 'busy'>('online');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const [isVerifiedStudent, setIsVerifiedStudent] = useState<boolean | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const isRtl = i18n.language === 'ar' || document.dir === 'rtl';

    // Real notifications state
    const [notifications, setNotifications] = useState<{
        id: string;
        title: string;
        message: string;
        created_at: string;
        type: 'student' | 'payment' | 'schedule' | 'coach' | 'check_in' | 'check_out' | 'attendance_absence' | 'pt_subscription';
        is_read: boolean;
        user_id?: string;
        related_coach_id?: string;
        related_student_id?: string;
        target_role?: string;
    }[]>([]);

    const processedIds = useRef(new Set<string>());
    const processedToasts = useRef(new Set<string>());
    const lastToastTime = useRef<number>(0);
    const toastCount = useRef<number>(0);

    const fetchNotifications = async () => {
        if (!userId) return;

        // Fetch only relevant notifications (for me OR global for my role)
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .or(`user_id.eq.${userId},target_role.eq.${normalizedRole},target_role.eq.admin_head_reception`)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            setNotifications(data);
            data.forEach((n: any) => processedIds.current.add(n.id));
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [userId, normalizedRole]);

    const [syncStatus, setSyncStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
    const syncStatusRef = useRef<'connected' | 'reconnecting' | 'disconnected'>('disconnected');

    // 🔔 GLOBAL NOTIFICATION & SYNC ENGINE (V2 ROCKET)
    useEffect(() => {
        if (!userId) return;

        let notificationChannel: any = null;
        let athleteMonitor: any = null;

        const setupGlobalSync = async () => {
            // Ensure auth session is synced with realtime
            const { data: { session } } = await supabase.auth.getSession();
            if (session) supabase.realtime.setAuth(session.access_token);

            // 1. V2 ROCKET BROADCAST (Aggressive Heartbeat)
            notificationChannel = supabase.channel(`athlete_rocket_v2_${userId}`)
                .on('broadcast', { event: 'ROCKET_NOTIFICATION' }, async (rawPayload) => {
                    const payload = rawPayload.payload || rawPayload;
                    console.log('🚀 ROCKET_V2: Received Instant Payload:', payload);
                    
                    playNotificationSound('bell');
                    
                    if (payload.notification) {
                        setNotifications(prev => {
                            if (prev.some(n => n.id === payload.notification.id)) return prev;
                            const newList = [payload.notification, ...prev].slice(0, 20);
                            processedIds.current.add(payload.notification.id);
                            return newList;
                        });
                    }

                    // Instant Toast with branding (Deduplicated)
                    const toastMsg = payload.notification?.message || "Tactical Update Received!";
                    const toastKey = payload.notification?.id || toastMsg;
                    
                    if (!processedToasts.current.has(toastKey)) {
                        processedToasts.current.add(toastKey);
                        setTimeout(() => processedToasts.current.delete(toastKey), 10000); // Clear after 10s
                        
                        toast.success(toastMsg, {
                            icon: '🚀',
                            style: { background: '#050510', color: '#fff', border: '1px solid #10b981' },
                            duration: 6000
                        });
                    }

                    // Background re-sync (Backup)
                    setTimeout(() => fetchNotifications(), 2000);

                    // 🔔 NATIVE SYSTEM NOTIFICATION (WhatsApp-style drop from top of OS)
                    if (Notification.permission === 'granted') {
                        navigator.serviceWorker.ready.then(registration => {
                            registration.showNotification(payload.notification?.title || "Strategic Update", {
                                body: payload.notification?.message || "Tactical instruction received from Bridge.",
                                icon: '/logo-premium.png',
                                badge: '/logo-premium.png',
                                vibrate: [200, 100, 200],
                                data: { url: '/app' }
                            });
                        });
                    } else if (Notification.permission === 'default') {
                        // Optional: Request if not yet asked (though Prompt usually handles this)
                        Notification.requestPermission();
                    }
                })
                .subscribe((status) => {
                    console.log(`🚀 ROCKET_V2: Connection Status for [${userId}]:`, status);
                    if ((status as string) === 'SUBSCRIBED') {
                        setSyncStatus('connected');
                        syncStatusRef.current = 'connected';
                    } else if (((status as any) as string) === 'JOINING') {
                        setSyncStatus('reconnecting');
                        syncStatusRef.current = 'reconnecting';
                    } else {
                        setSyncStatus('disconnected');
                        syncStatusRef.current = 'disconnected';
                    }
                });

            // 2. DB MONITOR (Fallback)
            athleteMonitor = supabase.channel('db-notifications')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notifications', 
                    filter: `user_id=eq.${userId}` 
                }, (payload) => {
                    console.log('🔔 DB_FALLBACK: Record Detected:', payload.new);
                    fetchNotifications();
                })
                .subscribe();
        };

        setupGlobalSync();

        // Heartbeat Monitor
        const checkInterval = setInterval(() => {
            if (syncStatusRef.current === 'disconnected' && userId) {
                console.warn('🚀 ROCKET_V2: Connection Lost. Force Re-syncing...');
                setupGlobalSync();
            }
        }, 30000);

        return () => {
            clearInterval(checkInterval);
            if (notificationChannel) supabase.removeChannel(notificationChannel);
            if (athleteMonitor) supabase.removeChannel(athleteMonitor);
        };
    }, [userId]);


    // PRE-RESUME AUDIO
    useEffect(() => {
        const resumeAudio = () => {
            // ✅ MUST be synchronous — async callbacks (dynamic import .then) are rejected by browser autoplay policy
            resumeAudioContext();
            window.removeEventListener('mousedown', resumeAudio);
            window.removeEventListener('touchstart', resumeAudio);
        };
        window.addEventListener('mousedown', resumeAudio);
        window.addEventListener('touchstart', resumeAudio);
        return () => {
            window.removeEventListener('mousedown', resumeAudio);
            window.removeEventListener('touchstart', resumeAudio);
        };
    }, []);

    useEffect(() => {
        let channel: any = null;

        const setupSessionMonitor = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: student } = await supabase
                    .from('students')
                    .select('id')
                    .eq('profile_id', user.id)
                    .maybeSingle();

                if (!student) {
                    setIsVerifiedStudent(false);
                    const { data: plan } = await supabase
                        .from('training_plans')
                        .select('status, scheduled_start')
                        .order('scheduled_start', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (plan) {
                        setScheduledStart(plan.scheduled_start);
                        setPlanStatus(plan.status);
                    }
                    return;
                }

                setIsVerifiedStudent(true);
                const { data: plan } = await supabase
                    .from('training_plans')
                    .select('status, scheduled_start')
                    .eq('student_id', student.id)
                    .maybeSingle();
                if (plan) {
                    setScheduledStart(plan.scheduled_start);
                    setPlanStatus(plan.status);
                }
            } catch (err) {
                console.error('Session monitor initialization failed:', err);
            }
        };

        const init = async () => {
            await setupSessionMonitor();
        };

        init();
        return () => { };
    }, []);

    useEffect(() => {
        if (userProfile?.avatar_url) {
            setAvatarUrl(userProfile.avatar_url);
        } else if (userId) {
            const fetchCoachAvatar = async () => {
                const { data: coachData } = await supabase
                    .from('coaches')
                    .select('avatar_url')
                    .eq('profile_id', userId)
                    .maybeSingle();
                setAvatarUrl(coachData?.avatar_url || null);
            };
            fetchCoachAvatar();
        }
    }, [userProfile, userId]);

    // ─── Live Floor data (unchanged) ────────────────────────────────────────────
    const { onlineStudents } = usePresenceContext();


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        const fetchResults = async () => {
            setIsSearching(true);
            try {
                const { data: students } = await supabase.from('students').select('id, full_name').ilike('full_name', `%${searchTerm}%`).limit(5);
                const { data: coaches } = await supabase.from('coaches').select('id, full_name, role, specialty').ilike('full_name', `%${searchTerm}%`).limit(5);
                const formattedResults = [
                    ...(students?.map(s => ({ ...s, type: 'student' })) || []),
                    ...(coaches?.map(c => ({ ...c, type: 'coach' })) || [])
                ];
                setSearchResults(formattedResults);
                setShowResults(true);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    const handleLogout = async () => {
        if (userId) {
            // Force status to "offline" by setting last_active_at to an old date
            const oldDate = new Date(Date.now() - 3600000).toISOString();
            await supabase.from('profiles').update({ last_active_at: oldDate }).eq('id', userId);
        }
        await supabase.auth.signOut();
        navigate('/login');
    };


    const allNavItems = [
        { to: '/app', icon: LayoutDashboard, label: t('common.dashboard'), roles: ['admin', 'head_coach', 'coach', 'reception', 'student'] },
        {
            to: (normalizedRole === 'admin' || normalizedRole === 'head_coach' || normalizedRole === 'coach') ? '/app/pt-availability' : '/app/pt-booking',
            icon: CreditCard,
            label: (normalizedRole === 'admin' || normalizedRole === 'head_coach' || normalizedRole === 'coach') ? t('common.ptManagement') : t('common.ptHub'),
            roles: ['admin', 'head_coach', 'coach', 'reception', 'student']
        },
        { to: '/app/communications', icon: MessageSquare, label: t('common.communications'), roles: ['admin', 'head_coach', 'coach', 'reception', 'student'] },
        {
            to: (normalizedRole === 'student') ? '/app/book-consultation' : '/app/consultations',
            icon: Video,
            label: (normalizedRole === 'student') ? t('common.bookConsultation') : t('common.consultations'),
            roles: ['admin', 'student']
        },
        { to: '/app/strategy-hub', icon: Sparkles, label: t('common.strategyHub', 'Strategy Hub'), roles: ['admin', 'head_coach', 'coach'] },
        { to: '/app/smart-training', icon: Activity, label: t('common.smartTraining', 'AI Camera Tracker'), roles: ['admin', 'head_coach', 'coach', 'student'] },
        { to: '/app/video-library', icon: Film, label: t('common.videoLibrary'), roles: ['admin', 'head_coach', 'coach', 'student'] },
        { to: '/app/settings', icon: Settings, label: t('common.settings'), roles: ['admin', 'head_coach', 'coach', 'reception', 'student'] },
    ];

    const navItems = allNavItems.filter(item => normalizedRole && item.roles.includes(normalizedRole));

    const filteredNotifications = notifications.filter(note => {
        if (!normalizedRole || !userId) return false;
        if (note.user_id) return note.user_id === userId;
        if (normalizedRole === 'head_coach' && (note.type === 'payment' || note.type === 'pt_subscription')) return false;
        if (note.target_role) {
            if (normalizedRole === 'admin') return true;
            const target = note.target_role.toLowerCase().trim();
            if (target === 'reception' && (normalizedRole === 'reception' || normalizedRole === 'receptionist')) return true;
            if (target === 'admin_head_reception' && ['admin', 'head_coach', 'reception', 'receptionist'].includes(normalizedRole)) return true;
            if (target === normalizedRole) return true;
            return false;
        }
        if (normalizedRole === 'admin') return true;
        return true;
    });

    const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

    const handleMarkAsRead = async (id: string) => {
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) { }
    };

    const handleDeleteAll = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            // Delete all notifications for this admin
            await supabase.from('notifications').delete().or(`user_id.eq.${user.id},target_role.eq.admin,target_role.eq.admin_head_reception`);
            setNotifications([]);
            toast.success('All notifications cleared', {
                style: { background: '#050510', color: '#fff', border: '1px solid rgba(212,175,55,0.3)' }
            });
            setNotificationsOpen(false);
        } catch (e) { }
    };

    return (
        <div className="fixed inset-0 w-full flex bg-background font-cairo overflow-hidden">
            {/* Cosmic Background Orbs */}
            <div className="orb-primary fixed -top-[25%] -left-[10%] w-[55%] h-[55%] rounded-full blur-[140px] pointer-events-none z-0 opacity-20" style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}></div>
            <div className="orb-accent fixed -bottom-[25%] -right-[10%] w-[55%] h-[55%] rounded-full blur-[140px] pointer-events-none z-0 opacity-15" style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}></div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] lg:hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                onMouseEnter={() => setIsHoveringSidebar(true)}
                onMouseLeave={() => setIsHoveringSidebar(false)}
                className={`fixed z-[300] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col no-print
                    bottom-0 left-0 right-0 w-full h-[100dvh]
                    lg:top-0 lg:bottom-0 lg:h-full lg:rounded-none
                    ${isRtl ? 'lg:right-0 lg:left-auto lg:border-l' : 'lg:left-0 lg:right-auto lg:border-r'}
                    ${isHoveringSidebar
                        ? 'lg:w-64 lg:bg-black/20 lg:backdrop-blur-[60px] lg:border-white/5 lg:shadow-[40px_0_100px_-20px_rgba(0,0,0,0.9)]'
                        : 'lg:w-20 lg:bg-black/10 lg:backdrop-blur-[40px] lg:border-transparent lg:shadow-none'
                    }
                    transform ${sidebarOpen
                        ? 'translate-y-0 lg:translate-x-0'
                        : isSidebarRevealed
                            ? 'translate-y-full lg:translate-y-0 lg:translate-x-0'
                            : `translate-y-full lg:translate-y-0 ${isRtl ? 'lg:translate-x-12 lg:opacity-0' : 'lg:-translate-x-12 lg:opacity-0'}`
                    }
                `}
            >
                {/* DESKTOP SIDEBAR */}
                <div className="hidden lg:flex w-full flex-1 flex-col relative no-scrollbar pb-6 lg:pb-0">
                    <div className={`flex flex-col items-center transition-all duration-700 ${isHoveringSidebar ? 'pt-6 mb-4 min-h-[80px]' : 'pt-4 mb-2 min-h-[30px]'}`}>
                        {isHoveringSidebar && (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
                                <h1 className="flex flex-col items-center gap-1 font-[var(--font-orbitron)] leading-none text-center">
                                    <span className="text-[24px] font-black uppercase tracking-[0.4em] text-white">SKIPPY</span>
                                    <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-primary to-transparent my-3" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.9em] text-primary/70">TOES Q8</span>
                                </h1>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col items-center py-4 px-0 w-full overflow-y-auto no-scrollbar space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.to;
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setSidebarOpen(false)}
                                className={`relative group w-full flex items-center p-4 transition-all duration-500 
                                    ${isActive 
                                        ? 'bg-white/5 border-l-2 border-primary text-white shadow-[inset_10px_0_30px_-10px_rgba(239,68,68,0.05)]' 
                                        : 'text-white/20 hover:text-white hover:bg-white/[0.03] hover:translate-x-1'}`}
                                >
                                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'opacity-40'}`} />
                                    <span className={`font-black uppercase tracking-[0.3em] text-[10px] ml-4 transition-all duration-700 whitespace-nowrap overflow-hidden ${isHoveringSidebar ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className={`p-6 flex flex-col gap-5 shrink-0 transition-all ${isHoveringSidebar ? 'px-8' : 'items-center'}`}>
                        {/* Language Switcher */}
                        <button
                            onClick={() => {
                                const newLang = i18n.language === 'ar' ? 'en' : 'ar';
                                i18n.changeLanguage(newLang);
                                document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
                            }}
                            className="flex items-center gap-4 text-white/20 hover:text-primary transition-all group"
                            title={i18n.language === 'ar' ? 'Switch to English' : 'Switch to Arabic'}
                        >
                            <Globe className="w-5 h-5 shrink-0" />
                            {isHoveringSidebar && (
                                <span className="font-black uppercase tracking-[0.3em] text-[10px] whitespace-nowrap">
                                    {i18n.language === 'ar' ? 'English' : 'العربية'}
                                </span>
                            )}
                        </button>

                        <button onClick={handleLogout} className="flex items-center gap-4 text-rose-500/30 hover:text-rose-500 transition-all group">
                            <LogOut className="w-5 h-5 shrink-0" />
                            {isHoveringSidebar && <span className="font-black uppercase tracking-[0.3em] text-[10px] whitespace-nowrap">{t('common.logout')}</span>}
                        </button>
                    </div>
                </div>

                {/* MOBILE SIDEBAR - REINVENTED ELITE UI */}
                <div className="lg:hidden flex flex-col h-[100dvh] bg-black/40 backdrop-blur-[40px] p-8 border-r border-white/5 animate-in slide-in-from-left duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]">
                    {/* Header: Minimal & Sharp */}
                    <div className="flex justify-between items-center mb-16 px-2">
                        <div className="space-y-1.5">
                            <h1 className="flex items-baseline gap-2 font-black italic leading-none tracking-tight">
                                <span className="text-2xl text-white tracking-[0.2em] drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">SKIPPY</span>
                                <span className="text-[11px] sm:text-xs text-primary font-black tracking-[0.3em] uppercase opacity-100 font-[var(--font-orbitron)]">Toes Q8</span>
                            </h1>
                            <div className="h-[1px] w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="w-8 h-8 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/30 hover:text-white transition-all active:scale-90"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Navigation: Fluid & Weightless Units */}
                    <div className="flex-1 space-y-2.5 overflow-y-auto no-scrollbar custom-scrollbar pr-2">
                        {navItems.map((item, idx) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.to;
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-500 relative overflow-hidden backdrop-blur-md
                                        ${isActive
                                            ? 'bg-primary/10 border border-primary/20 text-white shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]'
                                            : 'bg-white/[0.02] border border-white/[0.03] text-white/30 hover:bg-white/[0.05] hover:text-white hover:translate-x-1'
                                        }
                                    `}
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`transition-all duration-500 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'opacity-40 group-hover:opacity-100'}`}>
                                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-primary' : ''}`} />
                                        </div>
                                        <span className="font-black uppercase tracking-[0.3em] text-[9px] sm:text-[10px]">{item.label}</span>
                                    </div>

                                    {isActive && (
                                        <div className="absolute right-6 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--color-primary)]" />
                                    )}

                                    {/* Subtle Ambient Glow on Active */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Footer: Tactical Actions - Split Row */}
                    <div className="mt-4 pt-4 border-t border-white/[0.03] grid grid-cols-2 gap-2">
                        {/* Language Switcher */}
                        <button
                            onClick={() => {
                                const newLang = i18n.language === 'ar' ? 'en' : 'ar';
                                i18n.changeLanguage(newLang);
                                document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
                                setSidebarOpen(false);
                            }}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 hover:text-white transition-all active:scale-95 group"
                        >
                            <Globe className="w-3 h-3 text-primary" />
                            <span className="font-black uppercase tracking-[0.2em] text-[8px]">
                                {i18n.language === 'ar' ? 'EN' : 'AR'}
                            </span>
                        </button>

                        {/* Compact Logout */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/10 bg-red-500/[0.02] text-red-500/30 font-black uppercase tracking-[0.2em] text-[8px] hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
                        >
                            <LogOut className="w-3 h-3" />
                            {t('common.logout')}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-500 bg-transparent ${isRtl ? 'lg:mr-20' : 'lg:ml-20'}`}>
                <header className="premium-header-strip relative z-20 w-full pt-4 lg:pt-0 px-4 flex flex-col items-center">
                    <div className="w-full h-18 lg:h-12 flex items-center justify-between px-2 sm:px-6 relative">
                        <div className="flex items-center gap-4 lg:w-72">
                            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-10 h-10 flex items-center justify-center text-white/70 hover:text-white"><Menu className="w-6 h-6" /></button>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 justify-end lg:w-72">
                            {/* Registration Button (Admin/Coach/Reception) */}
                            {(role === 'admin' || role === 'head_coach' || role === 'coach' || role === 'reception') && (
                                <Link 
                                    to="/register"
                                    className="w-9 h-9 flex items-center justify-center rounded-full text-red-500/70 hover:bg-red-500/10 transition-all"
                                    title={t('common.registration', 'Registration')}
                                >
                                    <UserPlus className="w-4 h-4" />
                                </Link>
                            )}

                            {/* Broadcast WalkieTalkie */}
                            <WalkieTalkie role={role || ''} userId={userId || ''} />

                            {/* Notifications Center */}
                            <div className="relative group/bell flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); }}
                                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative ${notificationsOpen ? 'bg-primary/20 text-primary' : 'text-violet-300/70 hover:bg-violet-500/10'}`}
                                >
                                    <Bell className="w-4 h-4" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-background">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* ELITE NOTIFICATION DROPDOWN */}
                                <AnimatePresence>
                                    {notificationsOpen && (
                                        <motion.div 
                                            ref={notificationRef}
                                            initial={{ y: -20, opacity: 0, scale: 0.95 }}
                                            animate={{ y: 0, opacity: 1, scale: 1 }}
                                            exit={{ y: -20, opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                            className={`absolute top-full mt-4 w-80 sm:w-96 bg-[#050510]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] p-4 sm:p-6 z-[1000]
                                                ${isRtl ? 'left-0 sm:-left-32' : 'right-0 sm:-right-8'}
                                            `}
                                            onClick={e => e.stopPropagation()}
                                        >
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex flex-col">
                                                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">
                                                    {normalizedRole === 'student' ? `Hello ${fullName?.split(' ')[0] || 'Athlete'}` : 'Intelligence Center'}
                                                </h3>
                                                <span className="text-[10px] font-black text-primary uppercase">{unreadCount} New</span>
                                            </div>
                                            {filteredNotifications.length > 0 && (
                                                <button 
                                                    onClick={handleDeleteAll}
                                                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-[450px] overflow-y-auto no-scrollbar space-y-3">
                                            {filteredNotifications.length === 0 ? (
                                                <div className="py-12 text-center text-white/10 italic text-[10px] font-black uppercase tracking-widest">
                                                    Systems Clear. No Incoming Alerts.
                                                </div>
                                            ) : (
                                                filteredNotifications.map((note) => (
                                                    <div 
                                                        key={note.id}
                                                        onClick={() => handleMarkAsRead(note.id)}
                                                        className={`p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden
                                                            ${note.is_read 
                                                                ? 'bg-transparent border-white/5 opacity-40' 
                                                                : 'bg-white/[0.03] border-white/10 hover:border-primary/40 shadow-lg shadow-black/20'
                                                            }
                                                        `}
                                                    >
                                                        {!note.is_read && <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--color-primary)]" />}
                                                        <div className="flex gap-4 relative z-10">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                                                                ${note.type === 'student' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}
                                                            `}>
                                                                <Bell className="w-4 h-4" />
                                                            </div>
                                                            <div className="space-y-1.5 flex-1 bg-white/[0.01] p-1 rounded-xl">
                                                                <div className="flex justify-between items-start">
                                                                    <p className="text-[12px] font-black text-white uppercase tracking-[0.15em] group-hover:text-primary transition-colors font-[var(--font-outfit)] leading-none">
                                                                        {(() => {
                                                                            if (note.message.startsWith('JSON_NOTIF:')) {
                                                                                try {
                                                                                    const data = JSON.parse(note.message.replace('JSON_NOTIF:', ''));
                                                                                    return t(data.titleKey || 'common.notifications') as string;
                                                                                } catch (e) { return note.title; }
                                                                            }
                                                                            return note.title;
                                                                        })()}
                                                                    </p>
                                                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest font-[var(--font-orbitron)]">
                                                                        {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                                <p className="text-[11px] leading-relaxed text-white/80 font-medium font-[var(--font-outfit)] bg-white/[0.02] p-2 rounded-lg border border-white/5">
                                                                    {(() => {
                                                                        if (note.message.startsWith('JSON_NOTIF:')) {
                                                                            try {
                                                                                const data = JSON.parse(note.message.replace('JSON_NOTIF:', ''));
                                                                                return t(data.key, data.params || {}) as string;
                                                                            } catch (e) { return note.message; }
                                                                        }
                                                                        return note.message.split(' ').map((word: string, i: number) => {
                                                                            const isName = i < 3 && (word.toLowerCase() === 'trainee' || word.toLowerCase() === 'athlete' || (i > 0 && note.message.toLowerCase().split(' ')[i-1] === 'trainee'));
                                                                            return (
                                                                                <span key={i} className={isName ? "text-primary font-black" : ""}>
                                                                                    {word}{' '}
                                                                                </span>
                                                                            );
                                                                        });
                                                                    })()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-3 sm:p-5 overflow-y-auto no-scrollbar">
                    <div className="page-content h-full">
                        <Outlet context={{ role, fullName, userId, userEmail, isVerifiedStudent }} />
                    </div>
                </main>
            </div>

            {/* Lightbox Modals... */}
            {isAvatarModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setIsAvatarModalOpen(false)}>
                    <div className="relative max-w-2xl w-full flex flex-col items-center">
                        <div className="p-1 rounded-[3rem] bg-gradient-to-br from-primary via-accent to-primary shadow-2xl">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Profile" className="w-64 h-64 object-cover rounded-[3rem] border-4 border-[#08081a]" onClick={e => e.stopPropagation()} />
                            ) : (
                                <div className="w-64 h-64 bg-[#08081a] rounded-[3rem] flex items-center justify-center">
                                    <span className="text-white font-black text-8xl uppercase">{fullName?.[0] || 'A'}</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 text-center bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl animate-in slide-in-from-bottom-4 duration-700">
                            <h3 className="text-white font-black text-2xl tracking-tight">{fullName}</h3>
                            <p className="text-primary text-[10px] font-black uppercase tracking-[0.5em] mt-1">{t(`roles.${role}`)}</p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <PushNotificationPrompt userId={userId || undefined} />
        </div>
    );
}
