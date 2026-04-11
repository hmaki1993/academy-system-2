import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Zap, ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface AgendaItem {
    id: string;
    type: 'PT' | 'Consultation';
    title: string;
    student_name: string;
    date: string;
    time: string;
    status: string;
}

export default function UpcomingAgendaWidget() {
    const [items, setItems] = useState<AgendaItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAgenda = async () => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            const [ptRes, consultRes] = await Promise.all([
                supabase.from('pt_bookings')
                    .select('*')
                    .gte('booking_date', today)
                    .order('booking_date', { ascending: true })
                    .order('time_slot', { ascending: true })
                    .limit(10),
                supabase.from('consultation_requests')
                    .select('*')
                    .gte('booked_date', today)
                    .order('booked_date', { ascending: true })
                    .order('booked_time', { ascending: true })
                    .limit(10)
            ]);

            const ptItems: AgendaItem[] = (ptRes.data || []).map(b => ({
                id: b.id,
                type: 'PT',
                title: 'PT Session',
                student_name: b.student_name || 'Student',
                date: b.booking_date,
                time: b.time_slot,
                status: b.status
            }));

            const consultItems: AgendaItem[] = (consultRes.data || []).map(c => ({
                id: c.id,
                type: 'Consultation',
                title: 'Consultation',
                student_name: c.full_name || 'Student',
                date: c.booked_date,
                time: c.booked_time?.substring(0, 5) || '--:--',
                status: c.status
            }));

            // Combine and sort
            const combined = [...ptItems, ...consultItems].sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time.includes(':') ? a.time : '00:00'}`);
                const dateB = new Date(`${b.date}T${b.time.includes(':') ? b.time : '00:00'}`);
                return dateA.getTime() - dateB.getTime();
            }).slice(0, 8);

            setItems(combined);
        } catch (err) {
            console.error('Error fetching agenda:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgenda();

        // Subscribe to changes in both tables
        const ptChannel = supabase.channel('agenda-pt')
            .on('postgres_changes', { event: '*', table: 'pt_bookings', schema: 'public' }, () => fetchAgenda())
            .subscribe();

        const consultChannel = supabase.channel('agenda-consult')
            .on('postgres_changes', { event: '*', table: 'consultation_requests', schema: 'public' }, () => fetchAgenda())
            .subscribe();

        return () => {
            supabase.removeChannel(ptChannel);
            supabase.removeChannel(consultChannel);
        };
    }, []);

    const formatDisplayDate = (dateStr: string) => {
        const d = parseISO(dateStr);
        if (isToday(d)) return 'Today';
        if (isTomorrow(d)) return 'Tomorrow';
        return format(d, 'EEE, MMM dd');
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/[0.03]">
                <div className="flex items-center gap-4">
                    <div className="text-primary group-hover:scale-110 transition-transform">
                        <Calendar className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none">Upcoming Roster</h3>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Next 7 Days Agenda</p>
                    </div>
                </div>
                <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">{items.length} Booked</span>
                </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                {items.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center opacity-20">
                        <Zap className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No upcoming sessions</p>
                    </div>
                ) : (
                    items.map((item, idx) => (
                        <Link
                            key={`${item.type}-${item.id}`}
                            to={item.type === 'PT' ? `/app/schedule` : `/app/consultations`}
                            className={`group flex items-center justify-between py-4 transition-all duration-300 hover:bg-white/[0.02] px-2 rounded-xl border border-transparent hover:border-white/5 ${
                                idx !== items.length - 1 ? 'border-b border-white/[0.03]' : ''
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                                    item.type === 'PT' 
                                        ? 'bg-primary/5 text-primary' 
                                        : 'bg-emerald-500/5 text-emerald-400'
                                }`}>
                                    {item.type === 'PT' ? <Zap className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[140px]">
                                            {item.student_name}
                                        </p>
                                        <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'confirmed' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-none">
                                            {item.type} • {item.title}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-xs font-black text-white group-hover:text-primary transition-colors leading-none uppercase">
                                    {item.time}
                                </p>
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-2">
                                    {formatDisplayDate(item.date)}
                                </p>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {items.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/[0.03]">
                    <Link 
                        to="/app/schedule"
                        className="w-full py-2 flex items-center justify-center gap-2 text-[8px] font-black text-white/20 hover:text-white transition-colors uppercase tracking-[0.3em] group"
                    >
                        Live Schedule Hub
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            )}
        </div>
    );
}
