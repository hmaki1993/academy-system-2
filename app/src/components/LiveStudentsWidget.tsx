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
                        <Users className="w-12 h-12 text-white/10 group-hover:scale-110 transition-transform duration-500" />
                        <div className="text-center space-y-1">
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-white">No Athletes Online</p>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest italic">Awaiting digital pulse from the matrix...</p>
                        </div>
                    </div>
                ) : (
                    onlineStudents.map(user => (
                        <div 
                            key={user.id} 
                            className="flex items-center gap-4 py-4 transition-all cursor-default group hover:translate-x-1 animate-in fade-in slide-in-from-left-4 zoom-in-95 duration-500"
                        >
                            <div className="relative">
                                {/* Rocket Entry Glow */}
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl animate-pulse group-hover:bg-primary/20 transition-all duration-700" />
                                
                                <div className="relative w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center font-black text-rose-500 text-[14px] transition-all group-hover:bg-primary/5 group-hover:text-primary transition-all shadow-inner">
                                    {user.full_name?.charAt(0)}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-4 border-[#0a0c10] shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-black text-white text-[11px] sm:text-xs uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                    {user.full_name}
                                </p>
                                <div className="flex items-center gap-2 mt-1 border-l-2 border-emerald-500/40 pl-2">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">Live Pulse</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

