import React, { useEffect, useState } from 'react';
import { Play, Activity, History, Flame, Trophy, Loader2, Dumbbell, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJumpRopeStats } from '../hooks/useData';
import { format } from 'date-fns';
import { loadJrSettings } from './JumpRopeSettings';
import { supabase } from '../lib/supabase';

export default function JumpRopeHub() {
    const navigate = useNavigate();
    const { data: stats, isLoading } = useJumpRopeStats();
    const settings = loadJrSettings();
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase.from('profiles').select('role').eq('id', user.id).single()
                    .then(({ data }) => setUserRole(data?.role));
            }
        });
    }, []);

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
            <div className="flex flex-col items-start gap-4 pt-1 pb-6 relative group px-1">
                
                {/* Avatar & Level Badge */}
                <div className="relative">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.2)]" style={{ background: 'var(--jr-surface)', border: '1px solid var(--jr-border)' }}>
                        {settings.profileDataUrl ? (
                            <img src={settings.profileDataUrl} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-primary/40" />
                        )}
                    </div>
                    {/* Level Badge overlapping bottom right */}
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border border-primary/50 flex flex-col items-center justify-center shadow-[0_0_10px_rgba(255,59,48,0.2)] overflow-hidden" style={{ background: 'var(--jr-bg)' }}>
                        <span className="text-[8px] font-black text-primary drop-shadow-[0_0_5px_rgba(255,59,48,0.8)] z-10">{playerLevel}</span>
                        <div className="absolute inset-x-0 bottom-0 bg-primary/20" style={{ height: `${((stats?.totalJumps || 0) % 5000) / 50}%` }} />
                    </div>
                </div>

                {/* Text Content */}
                <div className="flex flex-col items-start space-y-1">
                    <h2 className="text-xl font-black tracking-tight leading-none" style={{ color: 'var(--jr-text-main)' }}>
                        Hello,{' '}
                        <span 
                            style={{ 
                                background: settings.themeId === 'pure-white' ? 'none' : 'linear-gradient(135deg, var(--color-primary, #0ea5e9) 0%, #ffffff 100%)',
                                backgroundColor: settings.themeId === 'pure-white' ? 'transparent' : 'transparent',
                                color: settings.themeId === 'pure-white' ? 'var(--color-primary)' : 'inherit',
                                WebkitBackgroundClip: settings.themeId === 'pure-white' ? 'none' : 'text',
                                WebkitTextFillColor: settings.themeId === 'pure-white' ? 'initial' : 'transparent',
                                textShadow: '0 0 20px var(--jr-glow)',
                            }}
                        >
                            {settings.userName || 'Athlete'}
                        </span>
                        !
                    </h2>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--jr-text-soft)' }}>Ready for today?</p>
                </div>
            </div>

            {/* Primary Action Button - Premium Glass Pill */}
            <div className="flex justify-center pt-2">
                <button
                    onClick={() => navigate('/jump-rope/training')}
                    className="relative group px-8 py-3.5 rounded-full border border-white/10 transition-all duration-500 hover:scale-[0.98] active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-3xl overflow-hidden"
                    style={{ background: 'var(--jr-surface)', borderColor: 'var(--jr-border)' }}
                >
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="absolute -inset-px rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-x-125 pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center transition-all duration-500 overflow-hidden">
                            <Play className="w-6 h-6 text-primary drop-shadow-[0_0_10px_rgba(255,59,48,0.8)] ml-1" fill="currentColor" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.5em] group-hover:opacity-100 transition-all duration-500" style={{ color: 'var(--jr-text-main)', opacity: 0.5 }}>Launch Session</span>
                    </div>
                </button>
            </div>

            {/* Quick Stats Grid — Premium Glass (Simpler) */}
            <div className="grid grid-cols-2 gap-3.5">
                <button 
                    onClick={() => navigate('/jump-rope/leaderboard')}
                    className="relative group overflow-hidden rounded-[2rem] p-5 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.15)] transition-all hover:opacity-80 text-center"
                    style={{ background: 'var(--jr-surface)', border: '1px solid var(--jr-border)' }}
                >
                    <div className="w-9 h-9 mx-auto flex items-center justify-center border border-orange-500/15 rounded-xl bg-orange-500/[0.05] group-hover:bg-orange-500/10 transition-colors shadow-inner mb-3">
                        <Trophy className="w-3.5 h-3.5 text-orange-500/50 group-hover:text-orange-500 transition-colors drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                    </div>
                    <div>
                        <div className="text-xl font-black drop-shadow-sm tabular-nums tracking-tight leading-none mb-1" style={{ color: 'var(--jr-text-main)' }}>{stats?.totalJumps?.toLocaleString() || 0}</div>
                        <div className="text-[7.5px] font-black tracking-[0.2em] uppercase transition-colors" style={{ color: 'var(--jr-text-soft)' }}>Total Jumps</div>
                    </div>
                </button>

                <button 
                    onClick={() => navigate('/jump-rope/leaderboard')}
                    className="relative group overflow-hidden rounded-[2rem] p-5 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.15)] transition-all hover:opacity-80 text-center"
                    style={{ background: 'var(--jr-surface)', border: '1px solid var(--jr-border)' }}
                >
                    <div className="w-9 h-9 mx-auto flex items-center justify-center border border-blue-500/15 rounded-xl bg-blue-500/[0.05] group-hover:bg-blue-500/10 transition-colors shadow-inner mb-3">
                        <Activity className="w-3.5 h-3.5 text-blue-500/50 group-hover:text-blue-500 transition-colors drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    </div>
                    <div>
                        <div className="text-xl font-black drop-shadow-sm tabular-nums tracking-tight leading-none mb-1" style={{ color: 'var(--jr-text-main)' }}>{stats?.maxRpm || 0}</div>
                        <div className="text-[7.5px] font-black tracking-[0.2em] uppercase transition-colors" style={{ color: 'var(--jr-text-soft)' }}>Max RPM</div>
                    </div>
                </button>
            </div>

            

            {/* Recent Activity Section */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase">Recent Activity</h3>
                    <button 
                        onClick={() => navigate('/jump-rope/history')}
                        className="text-[10px] font-black tracking-widest uppercase text-primary hover:opacity-70 transition-colors"
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
                                className="w-full flex items-center justify-between p-5 backdrop-blur-2xl rounded-[2rem] hover:opacity-80 transition-all group text-left shadow-[0_15px_35px_rgba(0,0,0,0.1)]"
                                style={{ background: 'var(--jr-surface)', border: '1px solid var(--jr-border)' }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-105 group-hover:border-primary/40 transition-all">
                                        <History className="w-5 h-5 text-white/10 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                        <div className="font-black text-[11px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--jr-text-main)' }}>Jump Session</div>
                                        <div className="text-[9px] font-black uppercase tracking-[0.2em] transition-colors" style={{ color: 'var(--jr-text-soft)' }}>
                                            {format(new Date(session.created_at), 'PPP')}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black transition-colors tabular-nums leading-none" style={{ color: 'var(--jr-text-main)' }}>{session.jumps}</div>
                                    <div className="text-[8px] font-black tracking-[0.2em] uppercase" style={{ color: 'var(--jr-text-soft)' }}>Jumps</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
