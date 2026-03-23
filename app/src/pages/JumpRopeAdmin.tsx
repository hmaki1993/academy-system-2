import React from 'react';
import { ChevronLeft, Users, Trophy, Activity, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJumpRopeAdminStats } from '../hooks/useData';
import { formatDistanceToNow } from 'date-fns';

export default function JumpRopeAdmin() {
    const navigate = useNavigate();
    const { data: athletes, isLoading } = useJumpRopeAdminStats();

    return (
        <div className="flex-1 flex flex-col w-full text-white font-sans antialiased px-5 pt-6 pb-6 relative overflow-hidden" style={{ background: 'var(--jr-bg, #050505)' }}>
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8 shrink-0">
                    <button
                        onClick={() => navigate('/jump-rope')}
                        className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95 shadow-lg backdrop-blur-3xl"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black tracking-widest uppercase leading-none">Admin</h2>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/80 mt-1">Athlete Tracking</p>
                    </div>
                </div>

                {/* Sub-Header Stats */}
                {!isLoading && athletes && (
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Total Athletes</span>
                            <span className="text-2xl font-black">{athletes.length}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Total Jumps</span>
                            <span className="text-2xl font-black text-primary">
                                {athletes.reduce((sum, a) => sum + a.totalJumps, 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}

                {/* Athlete List */}
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pb-20">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Activity className="w-8 h-8 text-primary/50 animate-pulse" />
                        </div>
                    ) : athletes?.length === 0 ? (
                        <div className="text-center py-20 text-white/40 font-black uppercase tracking-widest text-xs">
                            No Athletes Found
                        </div>
                    ) : (
                        athletes?.map((athlete, idx) => (
                            <div 
                                key={athlete.userId}
                                className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 backdrop-blur-md flex items-center gap-4 relative overflow-hidden group hover:bg-white/[0.04] transition-all"
                            >
                                {/* Rank */}
                                <div className="absolute top-0 right-0 w-8 h-8 bg-black/20 rounded-bl-2xl flex items-center justify-center">
                                    <span className="text-[10px] font-black text-white/30">#{idx + 1}</span>
                                </div>

                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                    {athlete.avatarUrl ? (
                                        <img src={athlete.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={20} className="text-white/20" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex flex-col flex-1">
                                    <h3 className="text-sm font-black tracking-wide text-white/90">
                                        {athlete.name}
                                    </h3>
                                    
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Trophy size={10} className="text-primary/70" />
                                            <span className="text-[10px] font-black tracking-widest text-primary">
                                                {athlete.totalJumps.toLocaleString()}
                                            </span>
                                        </div>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <div className="flex items-center gap-1.5">
                                            <Activity size={10} className="text-white/30" />
                                            <span className="text-[10px] font-bold tracking-wider text-white/40">
                                                {athlete.sessionsCount} Sess
                                            </span>
                                        </div>
                                    </div>

                                    {athlete.lastSession && (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <Calendar size={10} className="text-white/20" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-white/20">
                                                Active: {formatDistanceToNow(new Date(athlete.lastSession), { addSuffix: true })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
