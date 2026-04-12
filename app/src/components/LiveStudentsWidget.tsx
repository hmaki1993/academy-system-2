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
            {/* Minimalist Linear Online Athletes - No Backgrounds, Sleek Separators */}
            <div className="flex flex-wrap items-center gap-x-12 gap-y-8 animate-in fade-in duration-500">
                {onlineStudents.length === 0 ? (
                    <div className="py-10 opacity-20 flex items-center gap-4">
                        <Users size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em]">No Intelligence Detected</span>
                    </div>
                ) : (
                    onlineStudents.map((user, idx) => (
                        <div key={user.id} className="flex items-center gap-8 relative">
                            {/* The Signal - Now the focal point */}
                            <div className="flex items-center gap-4 group cursor-default">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/20 flex items-center justify-center font-black text-rose-500 text-sm transition-all group-hover:border-emerald-500/50 shadow-inner">
                                        {user.full_name?.charAt(0)}
                                    </div>
                                    {/* The Glow Core */}
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-[#0a0c10] shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
                                </div>

                                <div className="flex flex-col">
                                    <p className="font-black text-white text-[11px] uppercase tracking-[0.2em] group-hover:text-emerald-400 transition-colors">
                                        {user.full_name}
                                    </p>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                        <span className="text-[7px] font-black text-emerald-500/60 uppercase tracking-widest">Live Signal</span>
                                    </div>
                                </div>
                            </div>

                            {/* Minimal Diagonal Separator */}
                            {idx < onlineStudents.length - 1 && (
                                <div className="hidden sm:block w-[1px] h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent rotate-[15deg] ml-4" />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

