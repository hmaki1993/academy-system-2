import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Activity, Trophy } from 'lucide-react';

const MobileBottomNav = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#050505]/40 backdrop-blur-xl pb-safe z-50 shadow-sm shadow-black/50">
            <div className="flex items-center justify-around h-16">
                <NavLink
                    to="/jump-rope"
                    end
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-primary' : 'text-zinc-500'
                        }`
                    }
                >
                    <Home size={18} />
                    <span className="text-[9px] font-bold tracking-widest uppercase">Hub</span>
                </NavLink>

                <NavLink
                    to="/jump-rope/training"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-primary' : 'text-zinc-500'
                        }`
                    }
                >
                    <Activity size={18} />
                    <span className="text-[9px] font-bold tracking-widest uppercase">Training</span>
                </NavLink>

                <NavLink
                    to="/jump-rope/leaderboard"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-primary' : 'text-zinc-500'
                        }`
                    }
                >
                    <Trophy size={18} />
                    <span className="text-[9px] font-bold tracking-widest uppercase">Ranks</span>
                </NavLink>
            </div>
        </div>
    );
};

export default function JumpRopeLayout() {
    const location = useLocation();

    // Auto scroll to top on route change
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="h-screen w-full bg-[#050505] text-white flex flex-col font-sans selection:bg-primary/30 antialiased overflow-hidden relative">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Minimal Header - Hidden in Training for more space */}
            {location.pathname !== '/jump-rope/training' && (
                <header className="sticky top-0 z-40 bg-[#050505]/40 backdrop-blur-xl py-4 px-6 flex items-center justify-between shadow-sm shadow-black/50 transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/40 shadow-[0_0_15px_rgba(255,59,48,0.2)]">
                            <Activity className="w-4 h-4 text-primary drop-shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
                        </div>
                        <div>
                            <h1 className="font-bold text-sm tracking-widest text-white uppercase drop-shadow-md">
                                Jump Rope <span className="text-primary font-black">Pro</span>
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
