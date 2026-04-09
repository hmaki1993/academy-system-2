
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Users, Trophy, Activity, Calendar, User, Sparkles, Search, Filter, LayoutDashboard, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJumpRopeAdminStats } from '../../hooks/useData';
import { formatDistanceToNow } from 'date-fns';
import SmartPlanModal from './components/SmartPlanModal';

export default function JumpRopeAdmin() {
    const navigate = useNavigate();
    const { data: athletes, isLoading } = useJumpRopeAdminStats();
    const [selectedAthlete, setSelectedAthlete] = useState<{id: string, name: string} | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    const filteredAthletes = useMemo(() => {
        if (!athletes) return [];
        return athletes.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
            const daysSinceLast = a.lastSession ? (Date.now() - new Date(a.lastSession).getTime()) / (1000 * 60 * 60 * 24) : 999;
            const matchesFilter = filterType === 'ALL' || (filterType === 'ACTIVE' && daysSinceLast < 7) || (filterType === 'INACTIVE' && daysSinceLast >= 7);
            return matchesSearch && matchesFilter;
        });
    }, [athletes, searchQuery, filterType]);

    return (
        <div className="flex-1 flex flex-col w-full text-white font-sans antialiased px-4 sm:px-8 pt-6 pb-6 relative overflow-hidden bg-[#050505]">
            {/* Background Aesthetic */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-orange-500/5 rounded-full blur-[150px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col flex-1 max-w-7xl mx-auto w-full">
                {/* Header Workplace */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[1.5rem] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-2xl">
                            <LayoutDashboard size={28} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Strategy Workplace</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60 mt-2 flex items-center gap-2">
                                <Sparkles size={12} /> AI Training Management
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/jump-rope/training')}
                        className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 group shadow-xl backdrop-blur-3xl"
                    >
                        <PlayCircle size={18} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Switch to Training HUD</span>
                    </button>
                </div>

                {/* Sub-Header Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><Users size={40} /></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Total Athletes</span>
                        <span className="text-3xl font-black tracking-tighter">{athletes?.length || 0}</span>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl flex flex-col gap-2 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-10 text-orange-500"><Sparkles size={40} /></div>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Strategies Assigned</span>
                         <span className="text-3xl font-black tracking-tighter text-orange-500">{athletes?.length || 0} <span className="text-xs text-white/20">TOTAL</span></span>
                    </div>
                     <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl flex flex-col gap-2 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-10 text-blue-400"><Trophy size={40} /></div>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Collective Jumps</span>
                         <span className="text-3xl font-black tracking-tighter text-blue-400">
                             {athletes?.reduce((sum, a) => sum + a.totalJumps, 0).toLocaleString() || 0}
                         </span>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <input 
                            type="text" 
                            placeholder="SEARCH ATHLETES..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-sm font-black tracking-widest focus:ring-2 focus:ring-orange-500/50 transition-all outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl overflow-hidden shrink-0">
                        {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(f => (
                            <button 
                                key={f}
                                onClick={() => setFilterType(f)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === f ? 'bg-orange-500 text-black shadow-lg' : 'hover:bg-white/5 text-white/40'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Athlete Management List */}
                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 pb-10">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Activity className="w-10 h-10 text-orange-500 animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Syncing Athlete Data...</p>
                        </div>
                    ) : filteredAthletes.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">No matching athletes in this workplace</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAthletes.map((athlete, idx) => (
                                <div 
                                    key={athlete.userId}
                                    className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md flex flex-col gap-6 relative overflow-hidden group hover:bg-white/[0.08] hover:border-orange-500/30 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                            {athlete.avatarUrl ? (
                                                <img src={athlete.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={24} className="text-white/20" />
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.1em] mb-1">Last Active</span>
                                            <span className="text-[10px] font-black text-orange-500/80 uppercase tracking-tighter">
                                                {athlete.lastSession ? formatDistanceToNow(new Date(athlete.lastSession), { addSuffix: false }) : 'NEVER'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-black tracking-tight text-white mb-2">
                                            {athlete.name?.toUpperCase()}
                                        </h3>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Trophy size={14} className="text-blue-400" />
                                                <span className="text-xs font-black text-white/60">{athlete.totalJumps.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Activity size={14} className="text-white/30" />
                                                <span className="text-xs font-black text-white/40">{athlete.sessionsCount}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                                        <button 
                                            onClick={() => setSelectedAthlete({ id: athlete.userId, name: athlete.name })}
                                            className="flex-1 h-12 rounded-xl bg-orange-500 text-black font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-xl"
                                        >
                                            <Sparkles size={14} /> Generate Strategy
                                        </button>
                                        <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                            <AlertCircle size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Strategy Management Integration */}
            {selectedAthlete && (
                <SmartPlanModal 
                    studentId={selectedAthlete.id}
                    studentName={selectedAthlete.name}
                    isOpen={!!selectedAthlete}
                    onClose={() => setSelectedAthlete(null)}
                />
            )}
        </div>
    );
}
