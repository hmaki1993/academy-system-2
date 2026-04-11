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

    // Derived states from unified userProfile
    const userId = userProfile?.id || null; // Wait, I didn't add id to userProfile in ThemeContext. I should.
    const role = userProfile?.role || null;
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

    // Track processed IDs to prevent duplicate toasts/state updates
    // This persists across renders and isn't affected by fresh closures or StrictMode double-invokes
    const processedIds = useRef(new Set<string>());
    const processedToasts = useRef(new Set<string>());
    const lastToastTime = useRef<number>(0);
    const toastCount = useRef<number>(0);

    useEffect(() => {
        // Fetch initial notifications
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get role from profile to filter target_role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const userRole = profile?.role?.toLowerCase().trim();

            let query = supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            // Filter by user_id if needed (using separate filter instead of complex OR)
            const { data } = await query;
            const filteredData = data?.filter((n: any) => !n.user_id || n.user_id === user.id);

            if (filteredData) {
                setNotifications(filteredData);
                filteredData.forEach((n: any) => processedIds.current.add(n.id));
            }
        };

        fetchNotifications();

        // Subscribe to realtime notifications
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                async (payload) => {
                    console.log('🔔 Notification Realtime Payload:', payload);
                    const newNote = payload.new as any;

                    const { data: { user } = {} } = await supabase.auth.getUser(); // Destructure with default empty object
                    if (!user) {
                        console.warn('🔔 Notification Realtime: No user found');
                        return;
                    }


                    // Filter Out Self-Referential Broadcasts
                    // If this is a check-in/out message about THIS user, ignore it (they get a personal confirmation)
                    const isSelfBroadcast = newNote.related_coach_id && newNote.related_coach_id === user.id;
                    if (isSelfBroadcast && !newNote.user_id) {
                        console.log('🔔 Notification: Ignoring self-broadcast', newNote);
                        return;
                    }

                    // Only add if it's for this user OR global
                    // Note: target_role filtering happens in the render filter
                    if (!newNote.user_id || newNote.user_id === user.id) {
                        if (processedIds.current.has(newNote.id)) {
                            console.log('🔔 Notification: Already processed', newNote.id);
                            return;
                        }

                        // Throttling Logic: Prevent toast storms (max 3 toasts every 2 seconds)
                        const now = Date.now();
                        if (now - lastToastTime.current > 2000) {
                            toastCount.current = 0;
                            lastToastTime.current = now;
                        }

                        const isDuplicate = Array.from(processedToasts.current).some(msg =>
                            msg === newNote.message || msg.includes(newNote.message) || newNote.message.includes(msg)
                        );

                        if (toastCount.current < 3) {
                            // Check user preferences before showing toast
                            const shouldShowToast =
                                (newNote.type === 'payment' && settings.notify_payments !== false) ||
                                (newNote.type === 'attendance_absence' && settings.notify_absences !== false) ||
                                (newNote.type === 'student' && settings.notify_registrations !== false) ||
                                (!['payment', 'attendance_absence', 'student'].includes(newNote.type));

                            if (shouldShowToast && !isDuplicate) {
                                toastCount.current++;
                                processedToasts.current.add(newNote.message);
                                // Clear from memory after 10 seconds to allow same action later
                                setTimeout(() => processedToasts.current.delete(newNote.message), 10000);

                                toast.success(`${newNote.message}`, {
                                    icon: '🔔',
                                    duration: 5000,
                                    style: {
                                        backdropFilter: 'blur(25px)',
                                        background: 'rgba(15, 23, 42, 0.95)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.7)',
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
                            return updated.slice(0, 50); // Keep it clean
                        });
                    } else {
                        console.log('🔔 Notification: Ignore (Targeted to another user)', newNote.user_id);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    const updatedNote = payload.new as any;
                    setNotifications(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    const deletedId = (payload.old as any).id;
                    if (deletedId) {
                        setNotifications(prev => prev.filter(n => n.id !== deletedId));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Supabase Presence (Global Tracking)
    useEffect(() => {
        if (!userId) return;
        const channel = supabase.channel('global-presence', {
            config: { presence: { key: userId } }
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    online_at: new Date().toISOString(),
                    user_id: userId
                });
            }
        });

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    useEffect(() => {
        if (userProfile?.avatar_url) {
            setAvatarUrl(userProfile.avatar_url);
        } else if (userId) {
            // If avatar is missing in profile, try fetching from coaches table (linked by profile_id)
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
        const fetchStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserStatus(user.user_metadata?.status || 'online');
        };
        fetchStatus();

        const handleProfileUpdate = () => {
            // No need to fetch from localStorage anymore, ThemeContext handles it
        };

        // Debugging: Monitor Role
        console.log('🛡️ DashboardLayout: Render check', { role, userId, userEmail, fullName });

        if (role) console.log('Current User Role:', role);

        // Also refresh user profile on event
        window.addEventListener('gymProfileUpdated', handleProfileUpdate);

        const handleOpenSidebar = () => setSidebarOpen(true);
        window.addEventListener('openMobileSidebar', handleOpenSidebar);

        return () => {
            window.removeEventListener('gymProfileUpdated', handleProfileUpdate);
            window.removeEventListener('openMobileSidebar', handleOpenSidebar);
        };
    }, []);

    // Global Search Logic
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
                // Search Students
                const { data: students } = await supabase
                    .from('students')
                    .select('id, full_name')
                    .ilike('full_name', `%${searchTerm}%`)
                    .limit(5);

                // Search Coaches
                const { data: coaches } = await supabase
                    .from('coaches')
                    .select('id, full_name, role, specialty')
                    .ilike('full_name', `%${searchTerm}%`)
                    .limit(5);

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

    const handleResultClick = (result: any) => {
        setShowResults(false);
        setSearchTerm('');
        if (result.type === 'student') {
            navigate('/app/students', { state: { openStudentId: result.id } });
        } else {
            navigate('/app/coaches', { state: { query: result.full_name } });
        }
    };


    useEffect(() => {
        const handleClickOutside = () => {
            setNotificationsOpen(false);
            // Don't close logo modal on outside click here, the modal backdrop will handle it
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Prevent background scrolling when mobile sidebar is open
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [sidebarOpen]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleStatusChange = async (status: 'online' | 'busy') => {
        const { error } = await supabase.auth.updateUser({
            data: { status }
        });
        if (!error) {
            setUserStatus(status);
        }
    };

    const normalizedRole = role?.toLowerCase().trim().replace(/\s+/g, '_');

    const allNavItems: { to: string; icon: any; label: string; roles: string[]; isPremium?: boolean; }[] = [
        { to: '/app', icon: LayoutDashboard, label: t('common.dashboard'), roles: ['admin', 'head_coach', 'coach', 'reception', 'cleaner', 'student'] },
        { to: (normalizedRole === 'admin' || normalizedRole === 'head_coach' || normalizedRole === 'coach') ? '/app/pt-availability' : '/app/pt-booking', 
          icon: CreditCard, 
          label: (normalizedRole === 'admin' || normalizedRole === 'head_coach' || normalizedRole === 'coach') ? t('common.ptManagement', 'PT Management') : t('common.ptHub', 'PT HUB'), 
          roles: ['admin', 'head_coach', 'coach', 'reception', 'student'] },
        { to: '/app/my-work', icon: UserCircle, label: t('dashboard.myWork', 'My Work'), roles: ['head_coach'] },
        { to: '/app/communications', icon: MessageSquare, label: t('common.communications', 'Chats'), roles: ['admin', 'head_coach', 'coach', 'reception', 'cleaner', 'student'] },
        { to: (normalizedRole === 'student') ? '/app/book-consultation' : '/app/consultations', 
          icon: Video, 
          label: (normalizedRole === 'student') ? t('common.bookConsultation', 'Book Consultation') : t('common.consultations', 'Consultations'), 
          roles: ['admin', 'student'] },
        { to: '/app/strategy-hub', icon: Sparkles, label: 'Strategy Hub', roles: ['admin', 'head_coach', 'coach'] },
        { to: '/app/smart-training', icon: Activity, label: 'AI Camera Tracker', roles: ['admin', 'head_coach', 'coach', 'student'] },
        { to: '/app/video-library', icon: Film, label: t('common.videoLibrary'), roles: ['admin', 'head_coach', 'coach', 'student'] },
        { to: '/app/settings', icon: Settings, label: t('common.settings'), roles: ['admin', 'head_coach', 'coach', 'reception', 'cleaner', 'student'] },
    ];

    const navItems = allNavItems.filter(item => {
        if (!normalizedRole) return false; 
        // Debug: console.log('Checking item:', item.to, 'for role:', normalizedRole);
        return item.roles.includes(normalizedRole);
    });

    console.log('🛡️ Sidebar debug:', { normalizedRole, navCount: navItems.length });

    // Filter notifications based on role and user_id
    const filteredNotifications = notifications.filter(note => {
        if (!normalizedRole || !userId) return false;

        // 1. User-specific override: Only the specific user sees these
        if (note.user_id) {
            const isMatch = note.user_id === userId;
            if (!isMatch) console.log('🔔 Notification Filter: user_id mismatch', { noteUser: note.user_id, currentUserId: userId });
            return isMatch;
        }

        // 🛑 STRICT PRIVACY: Head Coach never sees financial alerts
        if (normalizedRole === 'head_coach' && (note.type === 'payment' || note.type === 'pt_subscription')) {
            console.log('🔔 Notification Filter: STRICT BLOCK (Head Coach / Financial)', note.type);
            return false;
        }

        // 2. Target Role Filtering
        if (note.target_role) {
            if (normalizedRole === 'admin') return true; // Admin sees all role-targeted notes

            const target = note.target_role.toLowerCase().trim();

            // Handle consolidated roles (reception / receptionist)
            if (target === 'reception' && (normalizedRole === 'reception' || normalizedRole === 'receptionist')) {
                return true;
            }

            // Handle joint staff roles (Admin, Head Coach, Receptionist)
            if (target === 'admin_head_reception') {
                return ['admin', 'head_coach', 'reception', 'receptionist'].includes(normalizedRole);
            }

            if (target === normalizedRole) return true;

            // Special case for shared roles
            if (target === 'admin_reception' && (normalizedRole === 'admin' || normalizedRole === 'reception' || normalizedRole === 'receptionist')) {
                return true;
            }

            if (target === 'admin_head_reception' && (normalizedRole === 'admin' || normalizedRole === 'head_coach' || normalizedRole === 'reception' || normalizedRole === 'receptionist')) {
                return true;
            }

            console.log('🔔 Notification Filter: target_role mismatch', { target, normalizedRole });
            return false;
        }

        // 3. Global Notification Type Filtering (for notes without a target_role)
        if (normalizedRole === 'admin') return true; // Admin sees all global notes

        if (normalizedRole === 'head_coach') {
            const allowedTypes: string[] = ['coach', 'check_in', 'check_out', 'attendance_absence', 'student'];
            return allowedTypes.includes(note.type);
        }

        if (normalizedRole === 'coach') {
            const allowedTypes: string[] = ['student', 'schedule', 'pt_subscription', 'check_in', 'check_out', 'attendance_absence'];
            return allowedTypes.includes(note.type);
        }

        if (normalizedRole === 'reception' || normalizedRole === 'receptionist') {
            const allowedTypes: string[] = ['payment', 'student', 'check_in', 'check_out', 'attendance_absence', 'pt_subscription'];
            return allowedTypes.includes(note.type);
        }

        if (normalizedRole === 'student') {
            const allowedTypes: string[] = ['student', 'schedule', 'coach'];
            return allowedTypes.includes(note.type);
        }

        return true; // Fallback for general types
    });

    const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

    const handleClearAllNotifications = async () => {
        if (!filteredNotifications.length) return;

        const oldNotifications = [...notifications];

        // Optimistic update: Clear the current view entirely
        const idsToClear = filteredNotifications.map(n => n.id);
        setNotifications(prev => prev.filter(n => !idsToClear.includes(n.id)));

        try {
            console.log('🗑️ Clearing all relevant notifications for role:', normalizedRole);

            let query = supabase.from('notifications').delete();

            // Use the explicit list of IDs we want to clear.
            // This guarantees we delete exactly what the user sees, instead of guessing types/roles.
            query = query.in('id', idsToClear);

            // Safety check: ensure we only delete things targeted to us or global
            // This prevents role filters from accidentally deleting other roles' private notes
            // UPDATE: For 'Clear All', if the user sees it (in idsToClear), they should be able to delete it.
            // Especially for Admin who sees everything.
            if (normalizedRole !== 'admin') {
                query = query.or(`user_id.eq.${userId},user_id.is.null,target_role.eq.${normalizedRole}`);
            }

            const { error, count } = await query;

            if (error) throw error;
            console.log('✅ Successfully cleared notifications from DB. Count:', count);
            toast.success(t('common.notificationsCleared') || 'Notifications cleared');
        } catch (error: any) {
            console.error('Error clearing notifications:', error);
            setNotifications(oldNotifications);
            toast.error(`Failed to clear: ${error.message}`);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    return (
        <div className="fixed inset-0 w-full flex bg-background font-cairo overflow-hidden">
            {/* Animated Cosmic Background Orbs */}
            <div className="orb-primary fixed -top-[25%] -left-[10%] w-[55%] h-[55%] rounded-full blur-[140px] pointer-events-none z-0 opacity-20" style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}></div>
            <div className="orb-accent fixed -bottom-[25%] -right-[10%] w-[55%] h-[55%] rounded-full blur-[140px] pointer-events-none z-0 opacity-15" style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}></div>
            <div className="orb-small fixed top-[40%] right-[20%] w-[25%] h-[25%] rounded-full blur-[100px] pointer-events-none z-0 opacity-10" style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}></div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] lg:hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Hover Trigger Area for Chat View */}
            {isChatView && (
                <div
                    className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} w-4 z-[45] pointer-events-auto`}
                    onMouseEnter={() => setIsHoveringSidebar(true)}
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
                style={{ zIndex: 300 }}
            >
                {/* Intrinsic Sidebar Glow */}
                <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ background: 'radial-gradient(circle at 50% 30%, var(--color-primary), transparent 65%)' }} />

                {/* ---- MOBILE LAYOUT: Full-Screen Elite Glass Navigation ---- */}
                <div className="lg:hidden flex flex-col h-[100dvh] bg-black/60 backdrop-blur-3xl pt-safe pb-safe overflow-hidden border-t border-white/5">
                    {/* Mobile Header: Signature Branding + Drag Indicator */}
                    <div className="relative flex flex-col items-center justify-center pt-3 pb-2 shrink-0 px-6">
                        {/* Center Drag Indicator */}
                        <div className="w-12 h-1.5 bg-white/10 rounded-full cursor-pointer mb-6 active:bg-white/20 transition-colors" onClick={() => setSidebarOpen(false)} />

                        {/* Signature Brand Identity - High Authority Transformation */}
                        <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
                            <h1 className="flex flex-col items-center gap-1 font-[var(--font-orbitron)] leading-none text-center">
                                <span className="text-[28px] font-black uppercase tracking-[0.4em] text-white drop-shadow-[0_10px_30px_rgba(255,255,255,0.3)]">SKIPPY</span>
                                <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-primary to-transparent my-2" />
                                <span className="text-[10px] font-black uppercase tracking-[0.8em] text-primary/80">TOES Q8</span>
                            </h1>
                        </div>
                    </div>

                    {/* Main Nav List - Minimalist elite sequence */}
                    <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
                        <div className="flex flex-col pb-8">
                            {navItems.map((item, index) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.to;
                                return (
                                    <React.Fragment key={item.to}>
                                        <Link
                                            to={item.to}
                                            onClick={() => setSidebarOpen(false)}
                                            style={{ 
                                                animationDelay: `${index * 40}ms`,
                                                opacity: 0,
                                                animation: 'mobile-item-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                                            }}
                                            className={`flex items-center gap-5 px-4 py-4 rounded-2xl transition-all duration-500 active:scale-98 group relative
                                                ${isActive ? 'bg-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.03)]' : 'hover:bg-white/[0.02]'}`}
                                        >
                                            {/* Active Side Indicator */}
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full blur-[1px] animate-pulse" />
                                            )}
                                            
                                            {/* Icon Layout */}
                                            <div className="relative shrink-0 flex items-center justify-center w-8 h-8 z-10 transition-transform duration-500 group-active:scale-110">
                                                {isActive && (
                                                    <div className="absolute inset-0 blur-xl opacity-30 bg-primary scale-125" />
                                                )}
                                                <Icon className={`w-6 h-6 transition-all duration-500 relative z-10 ${isActive ? 'text-primary' : 'text-white/30'}`} />
                                            </div>

                                            {/* Label Layout */}
                                            <div className="flex flex-col">
                                                <span className={`font-black text-[12px] uppercase tracking-[0.3em] leading-none transition-all duration-500 relative z-10
                                                    ${isActive ? 'text-white' : 'text-white/40 group-active:text-white/70'}`}>
                                                    {item.label}
                                                </span>
                                                {item.isPremium && (
                                                    <span className="text-[7px] font-black uppercase tracking-[0.4em] text-primary mt-1 opacity-80">Premium Access</span>
                                                )}
                                            </div>

                                            {/* Right Indicator (Minimal) */}
                                            <div className={`ml-auto transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0 group-active:opacity-30'}`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 blur-[1px]"></div>
                                            </div>
                                        </Link>
                                        
                                        {/* Minimalist Divider */}
                                        {index < navItems.length - 1 && (
                                            <div className="w-full h-px bg-white/[0.04] mx-4" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* Elite Mobile Footer - Minimalist Actions */}
                    <div className="px-6 pb-12 pt-6 flex flex-col gap-2 shrink-0 bg-gradient-to-t from-black/60 to-transparent border-t border-white/[0.05]">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const newLang = i18n.language === 'en' ? 'ar' : 'en';
                                    i18n.changeLanguage(newLang);
                                    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
                                    updateSettings({ language: newLang });
                                }}
                                className="flex-1 flex items-center justify-center gap-3 py-3 hover:bg-white/[0.03] rounded-xl active:scale-95 transition-all group"
                            >
                                <Globe className="w-4 h-4 text-white/30 group-active:text-white transition-colors" />
                                <span className="font-black text-[10px] uppercase tracking-[0.4em] text-white/40 group-active:text-white">
                                    {i18n.language === 'en' ? 'Arabic' : 'English'}
                                </span>
                            </button>
                            
                            <div className="w-px h-4 bg-white/[0.05]" />

                            <button
                                onClick={handleLogout}
                                className="flex-1 flex items-center justify-center gap-3 py-3 hover:bg-rose-500/[0.03] rounded-xl active:scale-95 transition-all group"
                            >
                                <LogOut className="w-4 h-4 text-rose-500/30 group-active:text-rose-500 transition-colors" />
                                <span className="font-black text-[10px] uppercase tracking-[0.4em] text-rose-500/40 group-active:text-rose-500">
                                    {t('common.logout')}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ---- DESKTOP LAYOUT: Unchanged sidebar ---- */}
                <div className="hidden lg:flex w-full flex-1 flex-col relative no-scrollbar pb-6 lg:pb-0">
                    {/* Sidebar Header - logo/branding removed for elite minimalism */}
                    <div className={`flex flex-col items-center transition-all duration-700 ${isHoveringSidebar ? 'pt-12 mb-10 min-h-[100px]' : 'pt-8 mb-4 min-h-[40px]'}`}>
                        {isHoveringSidebar && (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
                                <h1 className="flex flex-col items-center gap-1 font-[var(--font-orbitron)] leading-none text-center">
                                    <span className="text-[24px] font-black uppercase tracking-[0.4em] text-white drop-shadow-[0_10px_30px_rgba(255,255,255,0.2)]">SKIPPY</span>
                                    <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-primary to-transparent my-3" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.9em] text-primary/70">TOES Q8</span>
                                </h1>
                            </div>
                        )}
                    </div>

                    <div className={`flex-1 flex flex-col items-center py-4 px-0 w-full overflow-y-auto no-scrollbar transition-all duration-700 ${isHoveringSidebar ? 'space-y-1' : 'space-y-4'}`}>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.to;
                            const isSettings = item.to === '/app/settings';

                            return (
                                <React.Fragment key={item.to}>
                                    {isSettings && (
                                        <div className="w-full lg:w-8 h-px bg-white/10 rounded-full my-4 lg:my-2"></div>
                                    )}

                                    <Link
                                        to={item.to}
                                        onClick={() => setSidebarOpen(false)}
                                        onMouseEnter={playHoverSound}
                                        className={`relative group grid w-full ${isHoveringSidebar ? 'grid-cols-[80px_1fr] items-center' : 'place-items-center'} p-2 rounded-2xl transition-all duration-500 
                                            ${isActive ? 'bg-white/5 border-l-2 border-primary' : 'hover:bg-white/[0.03]'}`}
                                    >
                                        {/* Neon Glimmer for Active State */}
                                        {isActive && (
                                            <div className={`absolute inset-0 bg-gradient-to-r ${isRtl ? 'from-transparent to-primary/5' : 'from-primary/5 to-transparent'} pointer-events-none`} />
                                        )}

                                        <div
                                            className={`nav-icon-container shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 mx-auto relative z-10 
                                                ${isActive ? 'text-primary scale-110 drop-shadow-[0_0_10px_rgba(var(--primary-rgb,16,185,129),0.4)]' 
                                                : 'text-white/20 group-hover:text-white group-hover:scale-110'}`}
                                            style={{ color: isActive ? 'var(--color-primary)' : '' }}
                                        >
                                            <Icon className={`w-4 h-4 transition-all duration-500 ${isActive ? 'rotate-[360deg]' : 'opacity-40 group-hover:opacity-100 group-hover:rotate-12'}`} />
                                        </div>

                                        {/* Desktop Label - Elite Typography */}
                                        <span 
                                            className={`font-black uppercase tracking-[0.3em] text-[10px] transition-all duration-700 whitespace-nowrap overflow-hidden relative z-10 ${isHoveringSidebar ? 'w-40 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4'} 
                                            ${isActive ? 'text-white' : 'text-white/10 group-hover:text-white/40 group-hover:translate-x-1'}`}
                                        >
                                            {item.label}
                                        </span>

                                        {/* Desktop Tooltip - Premium Style */}
                                        {!isHoveringSidebar && (
                                            <div 
                                                className={`absolute ${isRtl ? 'right-full mr-6' : 'left-full ml-6'} px-4 py-2 rounded-xl bg-black/90 backdrop-blur-2xl border border-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-white opacity-0 pointer-events-none transition-all duration-500 group-hover:opacity-100 z-[400] whitespace-nowrap shadow-2xl scale-90 group-hover:scale-100`}
                                            >
                                                {item.label}
                                            </div>
                                        )}
                                    </Link>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <div className={`flex flex-col gap-3 pb-6 border-none pt-4 mt-auto shrink-0 ${isHoveringSidebar ? 'items-start px-6' : 'items-center'}`}>
                        <button
                            onClick={() => {
                                const newLang = i18n.language === 'en' ? 'ar' : 'en';
                                i18n.changeLanguage(newLang);
                                document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
                                updateSettings({ language: newLang });
                            }}
                            onMouseEnter={playHoverSound}
                            className={`grid w-full transition-all duration-500 group relative ${isHoveringSidebar ? 'grid-cols-[60px_1fr] items-center' : 'place-items-center'}`}
                            title="Change Language"
                        >
                            <div className="w-8 h-8 flex items-center justify-center rounded-xl shrink-0 mx-auto transition-all duration-500 group-hover:scale-110 text-white/20 group-hover:text-primary relative z-10">
                                <Globe className="w-4 h-4" />
                            </div>
                            <span className={`font-black uppercase tracking-[0.3em] text-[9px] whitespace-nowrap transition-all duration-500 overflow-hidden relative z-10 ${isHoveringSidebar ? 'w-40 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4'} text-white/10 group-hover:text-white/40 group-hover:translate-x-1`}>
                                {i18n.language === 'en' ? 'Arabic' : 'English'}
                            </span>
                        </button>

                        <button
                            onClick={handleLogout}
                            onMouseEnter={playHoverSound}
                            className={`grid w-full transition-all duration-500 group relative ${isHoveringSidebar ? 'grid-cols-[60px_1fr] items-center' : 'place-items-center'}`}
                            title="Logout"
                        >
                            <div className="w-8 h-8 flex items-center justify-center rounded-xl shrink-0 mx-auto transition-all duration-500 group-hover:scale-110 text-rose-500/20 group-hover:text-rose-500 relative z-10">
                                <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            </div>
                            <span className={`font-black uppercase tracking-[0.3em] text-[9px] whitespace-nowrap transition-all duration-500 overflow-hidden relative z-10 ${isHoveringSidebar ? 'w-40 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4'} text-white/10 group-hover:text-rose-400 group-hover:translate-x-1`}>
                                {t('common.logout')}
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-500 bg-transparent ${isChatView && !isHoveringSidebar ? 'lg:m-0' : (isRtl ? 'lg:mr-20' : 'lg:ml-20')}`}>
                {/* Header - Branding */}
                {!location.pathname.includes('/communications') && (
                    <header className={`premium-header-strip relative z-20 w-full pt-4 lg:pt-0 px-4 sm:px-6 lg:px-0 flex flex-col items-center lg:items-center`}>
                        <div className="w-full max-w-7xl lg:max-w-none h-18 lg:h-12 flex items-center justify-between px-2 sm:px-6 relative">
                            {/* Left Side Section - Minimal Mobile Toggle Only */}
                            <div className="flex items-center gap-4 lg:w-72">
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="lg:hidden w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95"
                                >
                                    <Menu className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Center Section - Free Horizontal Space (Branding moved to Sidebar) */}
                            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none w-fit z-10 opacity-0 lg:opacity-0">
                                {/* Brand removed from center to reduce clutter in elite view */}
                            </div>

                            {/* Right Section - Profile/Actions */}
                            <div className="flex items-center gap-4 sm:gap-6 justify-end lg:w-72">

                                {/* Search Results Dropdown */}
                                {showResults && (searchResults.length > 0 || isSearching) && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                                            {isSearching && searchResults.length === 0 ? (
                                                <div className="px-4 py-8 flex flex-col items-center justify-center gap-2">
                                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] text-center">Searching Directory...</div>
                                                </div>
                                            ) : (
                                                searchResults.map((result) => {
                                                    const role = result.type === 'student' ? 'student' : (result.role?.toLowerCase() || 'coach');

                                                    const roleColor: Record<string, string> = {
                                                        admin: 'from-rose-500 to-pink-600',
                                                        head_coach: 'from-violet-500 to-purple-600',
                                                        coach: 'from-blue-500 to-indigo-600',
                                                        student: 'from-emerald-500 to-teal-600',
                                                        reception: 'from-amber-500 to-orange-600',
                                                        receptionist: 'from-amber-500 to-orange-600',
                                                        cleaner: 'from-slate-400 to-slate-600',
                                                    };

                                                    const currentRoleColor = roleColor[role] || 'from-primary to-accent';

                                                    const roleBadgeColor: Record<string, string> = {
                                                        admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                                                        head_coach: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                                                        coach: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                                                        student: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                                        reception: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                                        receptionist: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                                        cleaner: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                                                    };

                                                    const currentRoleBadgeColor = roleBadgeColor[role] || 'bg-primary/10 text-primary border-primary/20';

                                                    return (
                                                        <button
                                                            key={`${result.type}-${result.id}`}
                                                            onClick={() => handleResultClick(result)}
                                                            onMouseEnter={playHoverSound}
                                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] rounded-2xl transition-all duration-200 group cursor-pointer active:scale-[0.98] text-left"
                                                        >
                                                            {/* Avatar */}
                                                            <div className="relative flex-shrink-0">
                                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${currentRoleColor} flex items-center justify-center font-black text-white text-[10px] shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-200`}>
                                                                    {result.full_name?.[0]?.toUpperCase()}
                                                                </div>
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 text-left min-w-0">
                                                                <p className="text-white/90 font-black text-sm leading-tight truncate group-hover:text-white transition-colors">
                                                                    {result.full_name}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${currentRoleBadgeColor}`}>
                                                                        {role.replace('_', ' ')}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Arrow */}
                                                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className={`flex items-center gap-2 sm:gap-4 group/header relative ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Quick Action Hub - Reveal on Hover (Desktop) / Always Visible (Mobile) */}
                                    <div className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-700 ease-out ${notificationsOpen ? 'opacity-100 translate-x-0 pointer-events-auto' : `opacity-100 lg:opacity-0 ${isRtl ? 'lg:translate-x-10' : 'lg:-translate-x-10'} lg:pointer-events-none lg:group-hover/header:opacity-100 lg:group-hover/header:translate-x-0 lg:group-hover/header:pointer-events-auto translate-z-0`}`}>
                                        {role === 'admin' && (
                                            <a
                                                href="/register"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onMouseEnter={playHoverSound}
                                                className="relative group/reg flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-500 hover:bg-emerald-500/10 active:scale-95"
                                                title={t('common.registrationPage')}
                                            >
                                                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl opacity-0 group-hover/reg:opacity-100 transition-opacity duration-700"></div>
                                                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 group-hover/reg:scale-110 transition-transform duration-500 relative z-10" />
                                                <span className="absolute -top-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-emerald-500 rounded-full border-2 border-[#0E1D21] shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse z-20"></span>
                                            </a>
                                        )}

                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); }}
                                                onMouseEnter={playHoverSound}
                                                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full transition-all relative ${notificationsOpen ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'text-violet-300/70 hover:bg-violet-500/10 hover:text-violet-200'}`}
                                            >
                                                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform" />
                                                {unreadCount > 0 && (
                                                    <>
                                                        <span className="absolute -top-1 -right-1 min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] px-1 bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[8px] sm:text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-violet-500/40 border-2 border-background z-10">
                                                            {unreadCount > 9 ? '9+' : unreadCount}
                                                        </span>
                                                        <span className="absolute -top-1 -right-1 w-[16px] sm:w-[18px] h-[16px] sm:h-[18px] rounded-full bg-violet-500 animate-notification-ping opacity-75"></span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {userId && <WalkieTalkie role={normalizedRole || 'coach'} userId={userId || ''} />}
                                    </div>

                                    {/* Profile Trigger */}
                                    <div className="relative z-20">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsAvatarModalOpen(true);
                                            }}
                                            onMouseEnter={playHoverSound}
                                            className={`w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 p-[2px] hover:scale-110 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-500 relative cursor-pointer`}
                                        >
                                            <div className="w-full h-full rounded-full bg-[#08081a] flex items-center justify-center overflow-hidden border border-indigo-500/20">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-white font-black text-sm">
                                                        {(fullName || role)?.[0]?.toUpperCase() || 'A'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {/* Page Content */}
                <main className={`flex-1 min-h-0 ${location.pathname.includes('/communications') ? 'p-0 overflow-hidden' : 'p-3 sm:p-5 overflow-y-auto overflow-x-hidden'}`}>
                    <div key={location.pathname} className="page-content h-full">
                        <Outlet context={{ role, fullName, userId, userEmail }} />
                    </div>
                </main>
            </div >

            {/* Avatar Lightbox Modal */}
            {
                isAvatarModalOpen && (
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500"
                        onClick={() => setIsAvatarModalOpen(false)}
                    >
                        <div className="relative max-w-2xl max-h-[80vh] w-full flex items-center justify-center px-4">
                            <div className="relative group/lightbox">
                                {/* Premium Glow around image */}
                                <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-accent/30 rounded-[3rem] blur-3xl opacity-50 group-hover/lightbox:opacity-100 transition-opacity duration-1000"></div>

                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Profile"
                                        className="relative z-10 max-w-full max-h-[70vh] object-contain rounded-[3rem] shadow-2xl border-2 border-white/20 animate-in zoom-in-95 duration-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <div className="relative z-10 w-64 h-64 bg-background rounded-[3rem] border-2 border-white/20 flex items-center justify-center shadow-2xl animate-in zoom-in-95 duration-500">
                                        <span className="text-white font-black text-8xl uppercase">
                                            {(fullName || role)?.[0] || 'A'}
                                        </span>
                                    </div>
                                )}

                                {/* Info card in lightbox */}
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/10 backdrop-blur-3xl border border-white/20 px-8 py-4 rounded-[2rem] shadow-2xl text-center min-w-[240px] animate-in slide-in-from-bottom-4 duration-700 delay-200">
                                    <h3 className="text-white font-black text-xl tracking-tight leading-none mb-1">{fullName}</h3>
                                    <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">{t(`roles.${role}`)}</p>
                                </div>

                                <button
                                    onClick={() => setIsAvatarModalOpen(false)}
                                    className="absolute -top-12 right-0 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-sm border border-white/10 scale-90 hover:scale-100 active:scale-95 duration-300"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Logo Lightbox Modal */}
            {
                isLogoModalOpen && (
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
                        onClick={() => setIsLogoModalOpen(false)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                            <img
                                src={settings.logo_url || "/logo.png"}
                                alt="Academy Logo"
                                className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <button
                                onClick={() => setIsLogoModalOpen(false)}
                                className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )
            }
            {/* UI Portals - Move outside of transform containers for fixed positioning stability */}
            {
                notificationsOpen && (
                    <div
                        className="fixed top-16 right-4 sm:right-6 md:right-10 w-[min(calc(100%-2rem),480px)] bg-surface/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500 flex flex-col max-h-[85vh]"
                    >
                        <div className="p-6 md:p-10 border-b border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent flex-shrink-0">
                            <h3 className="font-black text-white uppercase tracking-tighter text-xl md:text-2xl flex items-center gap-3">
                                <div className="w-2 h-8 bg-primary rounded-full blur-[2px] animate-pulse"></div>
                                {t('common.notifications') || t('common.recentActivity')}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                            {filteredNotifications.length === 0 ? (
                                <div className="p-10 md:p-12 text-center text-white/10 font-black uppercase tracking-[0.3em] text-[10px]">
                                    {t('common.noNotifications')}
                                </div>
                            ) : (
                                filteredNotifications.map(note => {
                                    let Icon = Bell;
                                    let color = 'text-white';

                                    if (note.type === 'student') { Icon = Users; color = 'text-primary'; }
                                    else if (note.type === 'payment') { Icon = Wallet; color = 'text-emerald-400'; }
                                    else if (note.type === 'schedule') { Icon = Calendar; color = 'text-accent'; }
                                    else if (note.type === 'coach') { Icon = UserCircle; color = 'text-purple-400'; }
                                    else if (note.type === 'check_in') { Icon = Calendar; color = 'text-green-400'; }
                                    else if (note.type === 'check_out') { Icon = Calendar; color = 'text-rose-500'; }
                                    else if (note.type === 'attendance_absence') { Icon = Calendar; color = 'text-red-400'; }
                                    else if (note.type === 'pt_subscription') { Icon = Wallet; color = 'text-amber-400'; }

                                    const timeAgo = (dateStr: string) => {
                                        const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000 / 60;
                                        if (diff < 60) return `${Math.floor(diff)}${t('common.minutesAgoShort')}`;
                                        if (diff < 1440) return `${Math.floor(diff / 60)}${t('common.hoursAgoShort')}`;
                                        return `${Math.floor(diff / 1440)}${t('common.daysAgoShort')}`;
                                    };

                                    return (
                                        <div
                                            key={note.id}
                                            onClick={() => handleMarkAsRead(note.id)}
                                            onMouseEnter={playHoverSound}
                                            className={`p-6 border-b border-white/[0.05] hover:bg-white/[0.08] transition-all group cursor-pointer relative ${!note.is_read ? 'bg-primary/5' : ''}`}
                                        >
                                            {!note.is_read && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)]"></div>
                                            )}
                                            <div className="flex gap-5">
                                                <div className={`w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 shadow-inner ${color} group-hover:scale-110 transition-transform duration-500 border border-white/5`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1.5">
                                                        <h4 className={`font-black tracking-tight text-[13px] ${!note.is_read ? 'text-white' : 'text-white/60'}`}>{note.title}</h4>
                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full">{timeAgo(note.created_at)}</span>
                                                    </div>
                                                    <p className={`text-xs leading-relaxed line-clamp-2 font-medium transition-colors ${!note.is_read ? 'text-white/80' : 'text-white/40'}`}>
                                                        {note.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="p-5 bg-white/[0.03] border-t border-white/10 flex-shrink-0">
                            {filteredNotifications.length > 0 && (
                                <button
                                    onClick={handleClearAllNotifications}
                                    className="w-full py-4 rounded-[2rem] bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-red-500/10 group/btn"
                                >
                                    <span className="group-hover:scale-105 transition-transform inline-block">{t('common.notificationsClearAll')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                )
            }


            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
                @keyframes mobile-item-in {
                    from { 
                        opacity: 0; 
                        transform: translateY(20px) scale(0.95); 
                        filter: blur(10px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                        filter: blur(0);
                    }
                }
            `}</style>
        </div >
    );
}
