import { useState, useEffect } from 'react';
import { Users, Activity, Clock, Zap, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { usePresence } from '../hooks/usePresence';

interface Student {
    id: string;
    full_name: string;
    coach_id?: string;
}

interface Group {
    id: string;
    name: string;
    schedule_key: string;
    students: Student[];
}

export default function LiveStudentsWidget({ onlineStudents = [] }: { onlineStudents?: any[] }) {

    return (
        <div className="relative w-full">
            {/* Dedicated Online Athletes Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {onlineStudents.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4 opacity-20 group animate-in fade-in duration-1000">
                        <div className="relative">
                            <Users className="w-16 h-16 text-white/5 group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Stationary Pulse</p>
                            <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest italic">Matrix is clear. No athletes detected.</p>
                        </div>
                    </div>
                ) : (
                    onlineStudents.map(user => (
                        <div 
                            key={user.id} 
                            className="relative group p-4 rounded-3xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all duration-700 cursor-default animate-in fade-in zoom-in-95"
                        >
                            {/* Matrix Glow Ring (Elite) */}
                            <div className="absolute -inset-1 bg-emerald-500/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
                            
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-2xl bg-[#0a0c10] border border-white/10 flex items-center justify-center font-black text-rose-500 text-lg transition-all group-hover:scale-110 group-hover:border-emerald-500/40 shadow-2xl">
                                        {user.full_name?.charAt(0)}
                                        {/* Internal HUD scan line */}
                                        <div className="absolute inset-x-2 top-0 h-px bg-white/10 animate-scan pointer-events-none" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-[3px] border-[#0a0c10] shadow-[0_0_15px_rgba(16,185,129,1)]" />
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="font-black text-white text-[12px] uppercase tracking-tight truncate group-hover:text-emerald-400 transition-colors">
                                            {user.full_name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Live Signal</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bottom Pulse Line */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-emerald-500/40 group-hover:w-1/2 transition-all duration-700 rounded-full" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

