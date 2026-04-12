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

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            const filteredData = data?.filter((n: any) => !n.user_id || n.user_id === user.id);

            if (filteredData) {
                setNotifications(filteredData);
                filteredData.forEach((n: any) => processedIds.current.add(n.id));
            }
        };

        fetchNotifications();

        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                async (payload) => {
                    const newNote = payload.new as any;
                    const { data: { user } = {} } = await supabase.auth.getUser();
                    if (!user) return;

                    const isSelfBroadcast = newNote.related_coach_id && newNote.related_coach_id === user.id;
                    if (isSelfBroadcast && !newNote.user_id) return;

                    if (!newNote.user_id || newNote.user_id === user.id) {
                        if (processedIds.current.has(newNote.id)) return;

                        const now = Date.now();
                        if (now - lastToastTime.current > 2000) {
                            toastCount.current = 0;
                            lastToastTime.current = now;
                        }

                        const isDuplicate = Array.from(processedToasts.current).some(msg =>
                            msg === newNote.message || msg.includes(newNote.message) || newNote.message.includes(msg)
                        );

                        if (toastCount.current < 3) {
                            const shouldShowToast =
                                (newNote.type === 'payment' && settings.notify_payments !== false) ||
                                (newNote.type === 'attendance_absence' && settings.notify_absences !== false) ||
                                (newNote.type === 'student' && settings.notify_registrations !== false) ||
                                (!['payment', 'attendance_absence', 'student'].includes(newNote.type));

                            if (shouldShowToast && !isDuplicate) {
                                toastCount.current++;
                                processedToasts.current.add(newNote.message);
                                setTimeout(() => processedToasts.current.delete(newNote.message), 10000);

                                toast.success(`${newNote.message}`, {
                                    icon: '🔔',
                                    duration: 5000,
                                    style: {
                                        backdropFilter: 'blur(25px)',
                                        background: 'rgba(15, 23, 42, 0.95)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#fff',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        padding: '16px 24px',
                                        borderRadius: '24px'
                                    }
                                });
                            }
                        }

                        setNotifications(prev => {
                            if (prev.some(n => n.id === newNote.id)) return prev;
                            const updated = [newNote, ...prev];
                            return updated.slice(0, 50);
                        });
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [settings]);

    // GLOBAL AI TRACKER MONITOR (USER-SPECIFIC)
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

                const { data: plan } = await supabase
                    .from('training_plans')
                    .select('status, scheduled_start')
                    .eq('student_id', student.id)
                    .maybeSingle();

                if (plan) {
                    setScheduledStart(plan.scheduled_start);
                    setPlanStatus(plan.status);
                }

                channel = supabase.channel(`layout-session-sync-${student.id}`)
                    .on('postgres_changes' as any, {
                        event: '*',
                        table: 'training_plans',
                        filter: `student_id=eq.${student.id}`
                    }, (payload: any) => {
                        setScheduledStart(payload.new?.scheduled_start || null);
                        setPlanStatus(payload.new?.status || null);
                    }).subscribe();
            } catch (err) {
                console.error('Timer Sync Error:', err);
            }
        };

        setupSessionMonitor();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
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

    const normalizedRole = role?.toLowerCase().trim().replace(/\s+/g, '_');

    const allNavItems = [
        { to: '/app', icon: LayoutDashboard, label: t('common.dashboard'), roles: ['admin', 'head_coach', 'coach', 'reception', 'cleaner', 'student'] },
        {
            to: (normalizedRole === 'admin' || normalizedRole === 'head_coach' || normalizedRole === 'coach') ? '/app/pt-availability' : '/app/pt-booking',
            icon: CreditCard,
            label: (normalizedRole === 'admin' || normalizedRole === 'head_coach' || normalizedRole === 'coach') ? t('common.ptManagement', 'PT Management') : t('common.ptHub', 'PT HUB'),
            roles: ['admin', 'head_coach', 'coach', 'reception', 'student']
        },
        { to: '/app/communications', icon: MessageSquare, label: t('common.communications', 'Chats'), roles: ['admin', 'head_coach', 'coach', 'reception', 'cleaner', 'student'] },
        {
            to: (normalizedRole === 'student') ? '/app/book-consultation' : '/app/consultations',
            icon: Video,
            label: (normalizedRole === 'student') ? t('common.bookConsultation', 'Book Consultation') : t('common.consultations', 'Consultations'),
            roles: ['admin', 'student']
        },
        { to: '/app/strategy-hub', icon: Sparkles, label: 'Strategy Hub', roles: ['admin', 'head_coach', 'coach'] },
        { to: '/app/smart-training', icon: Activity, label: 'AI Camera Tracker', roles: ['admin', 'head_coach', 'coach', 'student'] },
        { to: '/app/video-library', icon: Film, label: t('common.videoLibrary'), roles: ['admin', 'head_coach', 'coach', 'student'] },
        { to: '/app/settings', icon: Settings, label: t('common.settings'), roles: ['admin', 'head_coach', 'coach', 'reception', 'cleaner', 'student'] },
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
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
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
                    <div className={`flex flex-col items-center transition-all duration-700 ${isHoveringSidebar ? 'pt-12 mb-10 min-h-[100px]' : 'pt-8 mb-4 min-h-[40px]'}`}>
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
                                        ${isActive ? 'bg-white/5 border-l-2 border-primary text-white' : 'text-white/20 hover:text-white'}`}
                                >
                                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'opacity-40'}`} />
                                    <span className={`font-black uppercase tracking-[0.3em] text-[10px] ml-4 transition-all duration-700 whitespace-nowrap overflow-hidden ${isHoveringSidebar ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className={`p-6 flex flex-col gap-4 shrink-0 transition-all ${isHoveringSidebar ? 'px-8' : 'items-center'}`}>
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
                            <div className="relative">
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
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-3 sm:p-5 overflow-y-auto no-scrollbar">
                    <div key={location.pathname} className="page-content h-full">
                        <Outlet context={{ role, fullName, userId, userEmail }} />
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
        </div>
    );
}
