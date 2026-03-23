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
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                        {settings.profileDataUrl ? (
                            <img src={settings.profileDataUrl} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-primary/40" />
                        )}
                    </div>
                    {/* Level Badge overlapping bottom right */}
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#050505] border border-primary/50 flex flex-col items-center justify-center shadow-[0_0_10px_rgba(255,59,48,0.2)] overflow-hidden">
                        <span className="text-[8px] font-black text-primary drop-shadow-[0_0_5px_rgba(255,59,48,0.8)] z-10">{playerLevel}</span>
                        <div className="absolute inset-x-0 bottom-0 bg-primary/20" style={{ height: `${((stats?.totalJumps || 0) % 5000) / 50}%` }} />
                    </div>
                </div>

                {/* Text Content */}
                <div className="flex flex-col items-start space-y-1">
                    <h2 className="text-xl font-black tracking-tight leading-none" style={{ color: 'var(--color-text-base)' }}>
                        Hello,{' '}
                        <span 
                            style={{ 
                                background: 'linear-gradient(135deg, var(--color-primary, #0ea5e9) 0%, #ffffff 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textShadow: '0 0 20px var(--jr-glow)',
                            }}
                        >
                            {settings.userName || 'Athlete'}
                        </span>
                        !
                    </h2>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--jr-text-low, #71717a)' }}>Ready for today?</p>
                </div>
            </div>

            {/* Primary Action Button - Minimal Pill Design */}
            <div className="flex justify-center pt-1">
                <button
                    onClick={() => navigate('/jump-rope/training')}
                    className="relative group px-8 py-3.5 rounded-full border transition-all duration-500 hover:scale-[0.98] active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
                    style={{ 
                        background: 'var(--jr-surface, rgba(255,255,255,0.03))', 
                        borderColor: 'var(--jr-text-low, rgba(255,255,255,0.08))',
                        boxShadow: '0 0 25px rgba(0,0,0,0.08), inset 0 0 15px rgba(255,59,48,0.02)'
                    }}
                >
                    {/* Hover Active Background Glow */}
                    <div className="absolute inset-0 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="absolute -inset-px rounded-full bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-x-110 pointer-events-none" />

                    <div className="relative flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#050505] border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(255,59,48,0.2)] group-hover:border-primary group-hover:shadow-[0_0_20px_rgba(255,59,48,0.3)] transition-all duration-500 overflow-hidden">
                            <Play className="w-3 h-3 text-primary drop-shadow-[0_0_5px_rgba(255,59,48,0.8)] ml-0.5" fill="currentColor" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 group-hover:text-white transition-all duration-500">Training</span>
                    </div>
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => navigate('/jump-rope/leaderboard')}
                    className="relative overflow-hidden p-4 flex flex-col items-center justify-center gap-2 group transition-all duration-300 text-center border rounded-3xl backdrop-blur-xl shadow-md"
                    style={{ background: 'var(--jr-surface, rgba(10,10,10,0.8))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' }}
                >
                    <div className="w-8 h-8 flex items-center justify-center border border-orange-500/20 rounded-xl bg-orange-500/[0.05] group-hover:bg-orange-500/10 transition-colors shadow-inner">
                        <Trophy className="w-3.5 h-3.5 text-orange-500/60 group-hover:text-orange-500 transition-colors drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                    </div>
                    <div>
                        <div className="text-lg font-black drop-shadow-sm tabular-nums tracking-tight leading-none mb-0.5" style={{ color: 'var(--color-text-base)' }}>{stats?.totalJumps?.toLocaleString() || 0}</div>
                        <div className="text-[7px] font-black tracking-[0.2em] uppercase" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.3))' }}>Total Jumps</div>
                    </div>
                </button>

                <button 
                    onClick={() => navigate('/jump-rope/leaderboard')}
                    className="relative overflow-hidden p-4 flex flex-col items-center justify-center gap-2 group transition-all duration-300 text-center border rounded-3xl backdrop-blur-xl shadow-md"
                    style={{ background: 'var(--jr-surface, rgba(10,10,10,0.8))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' }}
                >
                    <div className="w-8 h-8 flex items-center justify-center border border-blue-500/20 rounded-xl bg-blue-500/[0.05] group-hover:bg-blue-500/10 transition-colors shadow-inner">
                        <Activity className="w-3.5 h-3.5 text-blue-500/60 group-hover:text-blue-500 transition-colors drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    </div>
                    <div>
                        <div className="text-lg font-black drop-shadow-sm tabular-nums tracking-tight leading-none mb-0.5" style={{ color: 'var(--color-text-base)' }}>{stats?.maxRpm || 0}</div>
                        <div className="text-[7px] font-black tracking-[0.2em] uppercase" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.3))' }}>Max RPM</div>
                    </div>
                </button>
            </div>

            {/* Admin Dashboard Protected Entry */}
            {(userRole === 'admin' || userRole === 'coach') && (
                <div className="pt-2">
                    <button
                        onClick={() => navigate('/jump-rope/admin')}
                        className="w-full relative group overflow-hidden flex items-center justify-center gap-3 py-4 rounded-[1.25rem] border transition-all duration-500 hover:scale-[0.98] active:scale-95 shadow-lg backdrop-blur-xl"
                        style={{ background: 'rgba(255, 59, 48, 0.05)', borderColor: 'rgba(255, 59, 48, 0.2)' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(255,59,48,0.1)] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <Users size={16} className="text-primary drop-shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Admin Dashboard</span>
                    </button>
                </div>
            )}
            
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
