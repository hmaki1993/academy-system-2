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
                background: 'rgba(6,6,18,0.75)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 20px 60px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
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
                            isActive ? 'text-[var(--color-primary,#ff3b30)]' : 'text-white/35 hover:text-white/60'
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
                                        ? 'scale-115 drop-shadow-[0_0_10px_var(--color-primary,#ff3b30)]'
                                        : 'group-hover:scale-110'
                                } ${spin && isActive ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                            />
                            <span
                                className={`relative z-10 text-[9px] font-black uppercase tracking-[0.12em] transition-all duration-300 ${
                                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                                }`}
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
    const settings = loadJrSettings();

    React.useEffect(() => {
        applyJrTheme(settings);
        const prevTitle = document.title;
        return () => { document.title = prevTitle; };
    }, []);

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const isTraining = location.pathname === '/jump-rope/training';

    return (
        <div
            className="h-screen w-full flex flex-col font-sans antialiased overflow-hidden relative transition-colors duration-700"
            style={{ background: 'var(--jr-bg, #050505)', color: 'var(--color-text-base, #ffffff)' }}
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
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
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
                            className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 0 6px rgba(255,255,255,0.06), 0 0 6px color-mix(in srgb, var(--color-primary, #ff3b30), transparent 60%)',
                            }}
                        >
                            {settings.logoDataUrl ? (
                                <img src={settings.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                                <Activity
                                    className="w-4 h-4"
                                    style={{ color: 'var(--color-primary, #ff3b30)', filter: 'drop-shadow(0 0 6px var(--color-primary, #ff3b30))' }}
                                />
                            )}
                        </div>

                        <div>
                            <h1 className="font-black text-sm tracking-wide leading-none" style={{ color: 'var(--color-text-base, #fff)' }}>
                                {settings.appName ? (
                                    settings.appName
                                ) : (
                                    <>
                                        Jump Rope{' '}
                                        <span style={{ color: 'var(--color-primary, #ff3b30)', textShadow: '0 0 12px var(--color-primary, #ff3b30)' }}>
                                            Pro
                                        </span>
                                    </>
                                )}
                            </h1>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
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
                        : 'max-w-md overflow-y-auto overflow-x-hidden scroll-smooth pb-28'
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
