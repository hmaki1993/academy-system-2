import { Play, Activity, History, Flame, Trophy, Loader2, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJumpRopeStats } from '../hooks/useData';
import { format } from 'date-fns';
import { loadJrSettings } from './JumpRopeSettings';

export default function JumpRopeHub() {
    const navigate = useNavigate();
    const { data: stats, isLoading } = useJumpRopeStats();
    const settings = loadJrSettings();

    if (isLoading) {
// ... existing loader ...
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Loading Your Stats...</p>
            </div>
        );
    }

    // Calculate Dynamic Level based on Total Jumps
    const calculateLevel = (jumps: number) => {
        if (jumps >= 25000) return 'L5';
        if (jumps >= 10000) return 'L4';
        if (jumps >= 5000) return 'L3';
        if (jumps >= 1000) return 'L2';
        return 'L1';
    };
    const playerLevel = calculateLevel(stats?.totalJumps || 0);

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 relative z-10">
            
            {/* User Profile Summary */}
            <div className="flex items-center justify-between p-6 rounded-[2rem] border backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.1)] relative overflow-hidden group" style={{ background: 'var(--jr-surface, rgba(10,10,10,0.8))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                {/* Subtle Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/20 transition-colors duration-700" />
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden">
                        {settings.logoDataUrl ? (
                            <img src={settings.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
                        ) : (
                            <Dumbbell className="w-5 h-5 text-primary/40" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-black tracking-tight leading-none mb-1" style={{ color: 'var(--color-text-base)' }}>
                            Hello, {settings.userName || 'Athlete'}!
                        </h2>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--jr-text-low, #71717a)' }}>Ready to break your record?</p>
                    </div>
                </div>

                <div className="w-14 h-14 rounded-full bg-[#050505] flex flex-col items-center justify-center border border-primary/30 relative z-10 shadow-[0_0_20px_rgba(255,59,48,0.2)] glow-border overflow-hidden">
                    <span className="text-base font-black text-primary drop-shadow-[0_0_10px_rgba(255,59,48,0.5)] z-10">{playerLevel}</span>
                    <div className="absolute inset-x-0 bottom-0 bg-primary/20" style={{ height: `${((stats?.totalJumps || 0) % 5000) / 50}%` }} />
                </div>
            </div>

            {/* Primary Action Button */}
            <button
                onClick={() => navigate('/jump-rope/training')}
                className="w-full relative overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:scale-[0.98] active:scale-95 border backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                style={{ background: 'var(--jr-surface, rgba(255,255,255,0.02))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}
            >
                {/* Hover Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative py-8 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#0a0a0a] border border-primary/30 flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-[0_0_30px_rgba(255,59,48,0.2)] group-hover:shadow-[0_0_40px_rgba(255,59,48,0.4)] group-hover:border-primary/50 relative overflow-hidden">
                        <Play className="w-6 h-6 text-primary drop-shadow-[0_0_15px_rgba(255,59,48,0.8)] ml-1 relative z-10" fill="currentColor" />
                    </div>
                    
                    <div className="text-center">
                        <h3 className="text-[10px] font-black tracking-[0.3em] uppercase transition-colors" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.5))' }}>Start Training</h3>
                    </div>
                </div>
            </button>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => navigate('/jump-rope/leaderboard')}
                    className="relative overflow-hidden p-5 flex flex-col items-center justify-center gap-3 group transition-all duration-300 text-center border rounded-[2rem] backdrop-blur-2xl shadow-[0_0_30px_rgba(0,0,0,0.1)]"
                    style={{ background: 'var(--jr-surface, rgba(10,10,10,0.8))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' }}
                >
                    <div className="w-12 h-12 flex items-center justify-center border border-orange-500/20 rounded-[1.2rem] bg-orange-500/[0.05] group-hover:bg-orange-500/10 transition-colors shadow-inner">
                        <Trophy className="w-5 h-5 text-orange-500/60 group-hover:text-orange-500 transition-colors drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                    </div>
                    <div>
                        <div className="text-2xl font-black drop-shadow-md tabular-nums tracking-tighter leading-none mb-1" style={{ color: 'var(--color-text-base)' }}>{stats?.totalJumps?.toLocaleString() || 0}</div>
                        <div className="text-[8px] font-black tracking-[0.2em] uppercase" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.3))' }}>Total Jumps</div>
                    </div>
                </button>

                <button 
                    onClick={() => navigate('/jump-rope/leaderboard')}
                    className="relative overflow-hidden p-5 flex flex-col items-center justify-center gap-3 group transition-all duration-300 text-center border rounded-[2rem] backdrop-blur-2xl shadow-[0_0_30px_rgba(0,0,0,0.1)]"
                    style={{ background: 'var(--jr-surface, rgba(10,10,10,0.8))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' }}
                >
                    <div className="w-12 h-12 flex items-center justify-center border border-blue-500/20 rounded-[1.2rem] bg-blue-500/[0.05] group-hover:bg-blue-500/10 transition-colors shadow-inner">
                        <Activity className="w-5 h-5 text-blue-500/60 group-hover:text-blue-500 transition-colors drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    </div>
                    <div>
                        <div className="text-2xl font-black drop-shadow-md tabular-nums tracking-tighter leading-none mb-1" style={{ color: 'var(--color-text-base)' }}>{stats?.maxRpm || 0}</div>
                        <div className="text-[8px] font-black tracking-[0.2em] uppercase" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.3))' }}>Max RPM</div>
                    </div>
                </button>
            </div>
            
            {/* Recent Activity Section */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase">Recent Activity</h3>
                    <button 
                        onClick={() => navigate('/jump-rope/history')}
                        className="text-[10px] font-black tracking-widest uppercase text-primary hover:text-primary/80 transition-colors"
                    >
                        View All
                    </button>
                </div>
                
                <div className="space-y-3">
                    {stats?.recentSessions?.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No sessions yet. Start jumping!</p>
                        </div>
                    ) : (
                        stats?.recentSessions?.map((session: any) => (
                            <button 
                                key={session.id} 
                                onClick={() => navigate('/jump-rope/history')}
                                className="w-full flex items-center justify-between p-4 bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/5 hover:border-white/10 transition-colors group text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                                        <History className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white">Jump Session</div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mt-1">
                                            {format(new Date(session.created_at), 'PPP')}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-white">{session.jumps}</div>
                                    <div className="text-[9px] font-bold tracking-widest text-primary uppercase">Jumps</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
