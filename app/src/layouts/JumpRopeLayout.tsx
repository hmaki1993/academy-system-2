import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Activity, Trophy, Settings } from 'lucide-react';
import { loadJrSettings, applyJrTheme } from '../pages/JumpRopeSettings';

const MobileBottomNav = () => {
    // ... no changes to MobileBottomNav body ...
    return (
        <div className="fixed bottom-4 left-4 right-4 z-50">
            <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden relative">
                {/* Subtle Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/[0.02] to-transparent pointer-events-none" />
                
                <div className="flex items-center justify-around h-12 relative z-10 px-2">
                    <NavLink
                        to="/jump-rope"
                        end
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative group ${
                                isActive ? 'text-white' : 'text-zinc-500 hover:text-white/70'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute w-12 h-8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/[0.04] rounded-[1rem]" />
                                )}
                                <Home size={18} className={`transition-transform duration-300 relative z-10 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'group-hover:scale-110'}`} />
                            </>
                        )}
                    </NavLink>

                    <NavLink
                        to="/jump-rope/training"
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative group ${
                                isActive ? 'text-primary' : 'text-zinc-500 hover:text-rose-400/70'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute w-12 h-8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/[0.05] shadow-[inset_0_0_20px_rgba(255,59,48,0.1)] rounded-[1rem]" />
                                )}
                                <Activity size={18} className={`transition-transform duration-300 relative z-10 ${isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(255,59,48,0.6)]' : 'group-hover:scale-110'}`} />
                            </>
                        )}
                    </NavLink>

                    <NavLink
                        to="/jump-rope/leaderboard"
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative group ${
                                isActive ? 'text-orange-500' : 'text-zinc-500 hover:text-orange-400/70'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute w-12 h-8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500/[0.05] shadow-[inset_0_0_20px_rgba(249,115,22,0.1)] rounded-[1rem]" />
                                )}
                                <Trophy size={18} className={`transition-transform duration-300 relative z-10 ${isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]' : 'group-hover:scale-110'}`} />
                            </>
                        )}
                    </NavLink>

                    <NavLink
                        to="/jump-rope/settings"
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative group ${
                                isActive ? 'text-white/80' : 'text-zinc-500 hover:text-white/60'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute w-12 h-8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/[0.04] rounded-[1rem]" />
                                )}
                                <Settings size={18} className={`transition-transform duration-300 relative z-10 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] animate-[spin_3s_linear_infinite]' : 'group-hover:scale-110'}`} />
                            </>
                        )}
                    </NavLink>
                </div>
            </div>
        </div>
    );
};

export default function JumpRopeLayout() {
    const location = useLocation();
    const settings = loadJrSettings();

    // Load and apply standalone settings on mount
    React.useEffect(() => {
        applyJrTheme(settings);
        
        // Return to normal title on cleanup (if we navigate away from jump-rope)
        const prevTitle = document.title;
        return () => { document.title = prevTitle; };
    }, []);

    // Auto scroll to top on route change
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="h-screen w-full flex flex-col font-sans selection:bg-primary/30 antialiased overflow-hidden relative transition-colors duration-700" style={{ background: 'var(--jr-bg, #050505)', color: 'var(--color-text-base, #ffffff)' }}>
            
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-primary)]/10 rounded-full blur-[120px] pointer-events-none opacity-30" />

            {/* Minimal Header - Hidden in Training for more space */}
            {location.pathname !== '/jump-rope/training' && (
                <header className="sticky top-0 z-40 backdrop-blur-xl py-4 px-6 flex items-center justify-between shadow-sm transition-all duration-300 border-b border-white/5" style={{ background: 'var(--jr-surface, rgba(5,5,5,0.4))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden">
                            {settings.logoDataUrl ? (
                                <img src={settings.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                                <Activity className="w-4 h-4 text-primary drop-shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
                            )}
                        </div>
                        <div>
                            <h1 className="font-bold text-sm tracking-widest uppercase drop-shadow-md" style={{ color: 'var(--color-text-base)' }}>
                                {settings.appName ? settings.appName : (
                                    <>Jump Rope <span className="text-primary font-black">Pro</span></>
                                )}
                            </h1>
                        </div>
                    </div>
                </header>
            )}

            {/* Main Content Area - Scrollable */}
            {/* Main Content Area - Scrollable */}
            <main className={`flex-1 w-full flex flex-col ${location.pathname === '/jump-rope/training' ? 'max-w-none' : 'max-w-md overflow-y-auto overflow-x-hidden scroll-smooth pb-24'} mx-auto relative sm:pb-0 z-10 custom-scrollbar`}>
                <div className="flex-1 flex flex-col">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation Component */}
            <div className="sm:hidden">
                <MobileBottomNav />
            </div>
        </div>
    );
}
