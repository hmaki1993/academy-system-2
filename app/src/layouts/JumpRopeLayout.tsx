import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Activity, Trophy, Settings } from 'lucide-react';
import { loadJrSettings, applyJrTheme } from '../pages/JumpRopeSettings';

/* ─── Bottom Navigation ──────────────────────────────────────── */
const navItems = [
    { to: '/jump-rope',             end: true,  icon: Home,     label: 'Home' },
    { to: '/jump-rope/training',    end: false, icon: Activity, label: 'Train' },
    { to: '/jump-rope/leaderboard', end: false, icon: Trophy,   label: 'Board' },
    { to: '/jump-rope/settings',    end: false, icon: Settings, label: 'Setup',  spin: true },
];

const MobileBottomNav = () => (
    <div className="fixed bottom-4 left-4 right-4 z-50">
        {/* Floating pill container */}
        <div
            className="relative flex items-center justify-around h-12 rounded-[1.75rem] overflow-hidden"
            style={{
                background: 'var(--nav-bg, rgba(6,6,18,0.75))',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                border: '1px solid var(--jr-border)',
                boxShadow: '0 20px 60px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
        >
            {/* Ambient glow strip at the top */}
            <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, var(--color-primary, #ff3b30) 40%, var(--color-primary, #ff3b30) 60%, transparent)' }}
            />

            {navItems.map(({ to, end, icon: Icon, label, spin }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                        `relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-300 group ${
                            isActive ? 'text-[var(--color-primary,#ff3b30)]' : 'text-[var(--jr-text-soft)] hover:text-[var(--jr-text-main)]'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            {/* Active indicator pill behind icon */}
                            {isActive && (
                                <div
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-10 rounded-2xl"
                                    style={{
                                        background: 'var(--color-primary, #ff3b30)',
                                        opacity: 0.1,
                                        boxShadow: '0 0 30px 10px var(--color-primary, #ff3b30)',
                                    }}
                                />
                            )}

                            <Icon
                                size={17}
                                className={`relative z-10 transition-all duration-300 ${
                                    isActive
                                        ? 'scale-115'
                                        : 'group-hover:scale-110'
                                } ${spin && isActive ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                                style={{ 
                                    color: isActive ? 'var(--color-primary)' : 'var(--jr-text-soft)',
                                    filter: isActive ? 'drop-shadow(0 0 10px var(--jr-glow))' : 'none'
                                }}
                            />
                            <span
                                className={`relative z-10 text-[9px] font-black uppercase tracking-[0.12em] transition-all duration-300 ${
                                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                                }`}
                                style={{ color: 'var(--jr-text-main)' }}
                            >
                                {label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </div>
    </div>
);

/* ─── Main Layout ────────────────────────────────────────────── */
export default function JumpRopeLayout() {
    const location = useLocation();
    const [settings, setSettings] = React.useState(loadJrSettings);

    // Hardcode THEMES directly in layout to ensure immediate access for local CSS vars
    const THEMES = [
        { id: 'ember',   name: 'Ember',   primary: '#ff3b30', glow: 'rgba(255,59,48,0.15)',   bg: '#0d0302', surface: 'rgba(255,59,48,0.04)', text: '#ffffff' },
        { id: 'ocean',   name: 'Ocean',   primary: '#0ea5e9', glow: 'rgba(14,165,233,0.15)',  bg: '#01090f', surface: 'rgba(14,165,233,0.04)', text: '#ffffff' },
        { id: 'aurora',  name: 'Aurora',  primary: '#a78bfa', glow: 'rgba(167,139,250,0.15)', bg: '#06020f', surface: 'rgba(167,139,250,0.04)', text: '#ffffff' },
        { id: 'lavender', name: 'Lavender', primary: '#c084fc', glow: 'rgba(192,132,252,0.15)', bg: '#0c0312', surface: 'rgba(192,132,252,0.04)', text: '#ffffff' },
        { id: 'mint',     name: 'Mint',     primary: '#4ade80', glow: 'rgba(74,222,128,0.15)',   bg: '#020d08', surface: 'rgba(74,222,128,0.04)', text: '#ffffff' },
        { id: 'rose',    name: 'Rose',    primary: '#f43f5e', glow: 'rgba(244,63,94,0.15)',   bg: '#0f0207', surface: 'rgba(244,63,94,0.04)', text: '#ffffff' },
    ];

    React.useEffect(() => {
        applyJrTheme(settings);
        const prevTitle = document.title;
        return () => {
            document.title = prevTitle;
            window.dispatchEvent(new Event('restoreGymTheme'));
        };
    }, [settings]);

    React.useEffect(() => {
        const handleSettingsChange = (e: Event) => {
            const ce = e as CustomEvent;
            if (ce.detail) {
                setSettings(ce.detail);
            }
        };
        window.addEventListener('jrSettingsChanged', handleSettingsChange);
        return () => window.removeEventListener('jrSettingsChanged', handleSettingsChange);
    }, []);

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const isTraining = location.pathname === '/jump-rope/training';

    return (
        <div
            className="h-screen w-full flex flex-col font-sans antialiased overflow-hidden relative transition-colors duration-700"
            style={{ 
                background: 'var(--jr-bg, #050505)', 
                color: '#ffffff',
                '--color-primary': THEMES.find(t => t.id === settings.themeId)?.primary || '#ff3b30',
                '--jr-glow': THEMES.find(t => t.id === settings.themeId)?.glow || 'rgba(255,59,48,0.15)',
                '--jr-bg': THEMES.find(t => t.id === settings.themeId)?.bg || '#0d0302',
                '--jr-surface': THEMES.find(t => t.id === settings.themeId)?.surface || 'rgba(255,59,48,0.04)',
                '--jr-text-main': '#ffffff',
                '--jr-text-soft': 'rgba(255,255,255,0.45)',
                '--jr-border': 'rgba(255,255,255,0.08)',
                '--nav-bg': 'rgba(6,6,18,0.75)',
            } as React.CSSProperties}
        >
            {/* ── Animated Ambient Orbs ────────────────────────────────── */}
            <div
                className="orb-primary absolute -top-[20%] -left-[15%] w-[60%] h-[60%] rounded-full blur-[130px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, var(--color-primary, #ff3b30) 0%, transparent 70%)', opacity: 0.22 }}
            />
            <div
                className="orb-accent absolute -bottom-[20%] -right-[15%] w-[55%] h-[55%] rounded-full blur-[120px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, var(--color-primary, #ff3b30) 0%, transparent 70%)', opacity: 0.12 }}
            />
            <div
                className="orb-small absolute top-[30%] right-[5%] w-[30%] h-[30%] rounded-full blur-[90px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
            />
            {/* Noise texture overlay for depth */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.025]"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")', backgroundSize: '200px 200px' }}
            />

            {/* ── Header (hidden during training for max space) ─────────── */}
            {!isTraining && (
                <header
                    className="relative z-40 shrink-0 flex items-center justify-between px-5 py-3"
                    style={{
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 100%)',
                        borderBottom: '1px solid var(--jr-border)',
                    }}
                >
                    {/* Top shimmer line */}
                    <div
                        className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, var(--color-primary, #ff3b30) 40%, var(--color-primary, #ff3b30) 60%, transparent 100%)', opacity: 0.5 }}
                    />

                    {/* Logo + Name */}
                    <div className="flex items-center gap-3">
                        {/* Logo container with glow ring */}
                        <div
                            className="w-10 h-10 rounded-[14px] flex items-center justify-center overflow-hidden shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 8px 32px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px var(--jr-glow)',
                            }}
                        >
                            {settings.logoDataUrl ? (
                                <img src={settings.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                                <Activity
                                    className="w-5 h-5"
                                    style={{ color: 'var(--color-primary, #ff3b30)', filter: 'drop-shadow(0 0 8px var(--color-primary, #ff3b30))' }}
                                />
                            )}
                        </div>

                        <div className="flex flex-col">
                            <h1 
                                className="font-black text-[15px] tracking-widest leading-none uppercase" 
                                style={{ 
                                    background: 'linear-gradient(to right, #ffffff, var(--jr-text-soft))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                }}
                            >
                                {settings.appName ? (
                                    settings.appName
                                ) : (
                                    <>
                                        Jump Rope{' '}
                                        <span style={{ 
                                            background: 'linear-gradient(135deg, var(--color-primary, #ff3b30), #ffffff)', 
                                            WebkitBackgroundClip: 'text', 
                                            WebkitTextFillColor: 'transparent',
                                            textShadow: '0 0 20px var(--jr-glow)' 
                                        }}>
                                            Pro
                                        </span>
                                    </>
                                )}
                            </h1>
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] mt-1" style={{ color: 'var(--color-primary, #ff3b30)', opacity: settings.themeId === 'pure-white' ? 1 : 0.8 }}>
                                Performance Tracker
                            </p>
                        </div>
                    </div>

                    {/* Right: Page indicator dots */}
                    <div className="flex items-center gap-1.5">
                        {navItems.slice(0, 3).map(({ to, end }) => (
                            <NavLink key={to} to={to} end={end}>
                                {({ isActive }) => (
                                    <div
                                        className="transition-all duration-300 rounded-full"
                                        style={{
                                            width: isActive ? '20px' : '5px',
                                            height: '5px',
                                            background: isActive ? 'var(--color-primary, #ff3b30)' : 'rgba(255,255,255,0.2)',
                                            boxShadow: isActive ? '0 0 8px var(--color-primary, #ff3b30)' : 'none',
                                        }}
                                    />
                                )}
                            </NavLink>
                        ))}
                    </div>
                </header>
            )}

            {/* ── Main Content ─────────────────────────────────────────── */}
            <main
                className={`flex-1 w-full flex flex-col mx-auto relative z-10 custom-scrollbar ${
                    isTraining
                        ? 'max-w-none overflow-hidden'
                        : 'max-w-md overflow-y-auto overflow-x-hidden scroll-smooth pb-20'
                }`}
            >
                {/* Per-page fade-in */}
                <div key={location.pathname} className="page-content flex-1 flex flex-col">
                    <Outlet />
                </div>
            </main>

            {/* ── Bottom Navigation ────────────────────────────────────── */}
            <div className="sm:hidden shrink-0">
                <MobileBottomNav />
            </div>
        </div>
    );
}
