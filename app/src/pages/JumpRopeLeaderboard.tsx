import React, { useState } from 'react';
import { Trophy, Medal, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useJumpRopeLeaderboard } from '../hooks/useData';

const MOCK_LEADERBOARD = [
    { id: 1, name: "Ali Ahmed", jumps: 8540, sessions: 15 },
    { id: 2, name: "Omar Hassan", jumps: 7200, sessions: 12 },
    { id: 3, name: "Youssef Tarek", jumps: 6950, sessions: 11 },
    { id: 4, name: "Ziad Magdy", jumps: 5120, sessions: 9 },
    { id: 5, name: "Ahmed Samir", jumps: 4800, sessions: 8 },
    { id: 6, name: "Mohamed Kareem", jumps: 4100, sessions: 7 },
    { id: 7, name: "Khaled Saied",  jumps: 3800, sessions: 6 },
    { id: 8, name: "Mahmoud Nabil",  jumps: 3200, sessions: 5 },
    { id: 9, name: "Hassan Ali",  jumps: 2900, sessions: 5 },
    { id: 10, name: "Ibrahim Saad", jumps: 2100, sessions: 3 },
];

export default function JumpRopeLeaderboard() {
    const [filter, setFilter] = useState<'global' | 'weekly'>('weekly');
    // Temporarily overriding the hook for testing UI with 10 players
    const { data: realLeaderboard, isLoading: realIsLoading } = useJumpRopeLeaderboard(filter);
    
    const isLoading = false;
    const leaderboard = MOCK_LEADERBOARD;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Calculating Rankings...</p>
            </div>
        );
    }

    const topThree = leaderboard?.slice(0, 3) || [];
    const others = leaderboard?.slice(3) || [];

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-2xl font-black tracking-tight leading-none" style={{ color: 'var(--color-text-base)' }}>Top Jumpers</h2>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-none mt-1" style={{ color: 'var(--jr-text-low, #71717a)' }}>Academy Rankings</p>
                </div>
                <div className="w-12 h-12 rounded-[1.2rem] bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                    <Trophy className="w-5 h-5 text-orange-500" />
                </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex p-1.5 backdrop-blur-xl rounded-[1.2rem] border shadow-inner relative z-10 mx-auto max-w-sm w-full" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.02))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' }}>
                <button 
                    onClick={() => setFilter('global')}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 ${
                        filter === 'global' ? 'shadow-[0_4px_12px_rgba(0,0,0,0.1)] border' : 'hover:text-primary transition-colors'
                    }`}
                    style={filter === 'global' ? { background: 'var(--jr-surface, rgba(255,255,255,0.08))', color: 'var(--color-text-base)', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' } : { color: 'var(--jr-text-low)' }}
                >
                    Global
                </button>
                <button 
                    onClick={() => setFilter('weekly')}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 ${
                        filter === 'weekly' ? 'shadow-[0_4px_12px_rgba(0,0,0,0.1)] border' : 'hover:text-primary transition-colors'
                    }`}
                    style={filter === 'weekly' ? { background: 'var(--jr-surface, rgba(255,255,255,0.08))', color: 'var(--color-text-base)', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' } : { color: 'var(--jr-text-low)' }}
                >
                    Weekly
                </button>
            </div>

            {/* Podium (Top 3) */}
            <div className="flex items-end justify-center gap-3 pt-12 pb-6 relative z-10">
                 {/* Background Ambient Glow */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/5 rounded-full blur-[80px] pointer-events-none" />

                 {/* 2nd Place */}
                 {topThree[1] && (
                     <div className="flex flex-col items-center gap-3 relative shrink-0">
                        <div className="w-14 h-14 rounded-full bg-[#0a0a0a] border-2 border-zinc-400 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(161,161,170,0.15)] glow-border overflow-hidden">
                            <div className="text-xl font-black text-zinc-300 drop-shadow-md">2</div>
                        </div>
                        <div className="w-20 h-28 border-x border-t flex flex-col items-center pt-3 backdrop-blur-xl relative overflow-hidden group rounded-t-[1.5rem]" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.05))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-400/50 to-transparent" />
                            <span className="text-[9px] font-black uppercase tracking-widest truncate w-16 text-center" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.5))' }}>{topThree[1].name.split(' ')[0]}</span>
                            <span className="text-sm font-black mt-1.5 tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ color: 'var(--color-text-base)' }}>{topThree[1].jumps.toLocaleString()}</span>
                        </div>
                     </div>
                 )}

                 {/* 1st Place */}
                 {topThree[0] && (
                     <div className="flex flex-col items-center gap-3 relative -mt-10 shrink-0">
                          <div className="absolute -top-7 z-20 animate-[bounce_3s_ease-in-out_infinite] shadow-[0_0_30px_rgba(250,204,21,0.3)] rounded-full bg-yellow-400/10 p-2 border border-yellow-400/30 backdrop-blur-md">
                              <Medal className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
                          </div>
                        <div className="w-20 h-20 rounded-full bg-yellow-500/[0.05] border border-yellow-500/30 flex items-center justify-center z-10 shadow-[0_0_40px_rgba(234,179,8,0.2),inset_0_0_20px_rgba(234,179,8,0.1)] backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-yellow-500/20 to-transparent pointer-events-none opacity-50" />
                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">1</div>
                        </div>
                        <div className="w-24 h-40 border-x border-t flex flex-col items-center pt-5 backdrop-blur-xl relative overflow-hidden rounded-t-[2rem]" style={{ background: 'var(--jr-surface, rgba(234,179,8,0.08))', borderColor: 'var(--jr-text-low, rgba(234,179,8,0.2))' }}>
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none" />
                            <span className="text-[11px] font-black text-yellow-500/90 uppercase tracking-[0.2em] truncate w-20 text-center relative z-10 drop-shadow-sm">{topThree[0].name.split(' ')[0]}</span>
                            <span className="text-xl font-black text-yellow-500 mt-1.5 tracking-tighter drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] relative z-10">{topThree[0].jumps.toLocaleString()}</span>
                        </div>
                     </div>
                 )}

                 {/* 3rd Place */}
                 {topThree[2] && (
                     <div className="flex flex-col items-center gap-3 relative shrink-0">
                        <div className="w-14 h-14 rounded-full bg-[#0a0a0a] border-2 border-orange-700/80 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(194,65,12,0.15)] glow-border overflow-hidden">
                            <div className="text-xl font-black text-orange-600 drop-shadow-md">3</div>
                        </div>
                        <div className="w-20 h-24 border-x border-t flex flex-col items-center pt-3 backdrop-blur-xl relative overflow-hidden group rounded-t-[1.5rem]" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.05))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                            <span className="text-[9px] font-black uppercase tracking-widest truncate w-16 text-center" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.5))' }}>{topThree[2].name.split(' ')[0]}</span>
                            <span className="text-sm font-black mt-1.5 tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ color: 'var(--color-text-base)' }}>{topThree[2].jumps.toLocaleString()}</span>
                        </div>
                     </div>
                 )}
            </div>

            {/* List View (4th and below) */}
            <div className="space-y-3 relative z-10">
                {others.map((user, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 border rounded-2xl transition-colors shadow-[0_4px_24px_-8px_rgba(0,0,0,0.1)]" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.02))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' }}>
                        <div className="w-6 text-center font-black text-[11px] uppercase" style={{ color: 'var(--jr-text-low, #71717a)' }}>{idx + 4}</div>
                        
                        <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] flex items-center justify-center text-[10px] font-black text-white uppercase border border-white/10 shadow-inner">
                            {user.name.charAt(0)}
                        </div>
                        
                        <div className="flex-1">
                            <div className="font-black text-sm tracking-tight leading-none mb-1 drop-shadow-sm" style={{ color: 'var(--color-text-base)' }}>{user.name}</div>
                            <div className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--jr-text-low, #71717a)' }}>{user.sessions} Sessions</div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                             <div className="font-black tracking-tighter text-lg leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{ color: 'var(--color-text-base)' }}>{user.jumps.toLocaleString()}</div>
                             <div className="text-[7px] font-black tracking-[0.3em] uppercase mt-1" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.3))' }}>Jumps</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
