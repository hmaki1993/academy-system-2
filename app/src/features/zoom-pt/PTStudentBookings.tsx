import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import {
    Clock,
    Calendar,
    User,
    AlertCircle,
    CheckCircle2,
    XCircle,
    X,
    ArrowRight
} from 'lucide-react';
import StudentPTCalendar from './StudentPTCalendar';
import NewPTBookingFlow from './NewPTBookingFlow';
import { Plus, LayoutDashboard } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function PTStudentBookings() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'schedule' | 'book'>('book');

    useEffect(() => {
        fetchMyBookings();

        // Realtime Subscription removed to prevent 400 Bad Request connection limit errors.
        // Component relies on fetch on mount.
        return () => { };
    }, []);

    const fetchMyBookings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('pt_bookings')
                .select('*')
                .eq('student_id', user.id)
                .order('booking_date', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteBooking = async (id: string) => {
        // Optimistic update
        setBookings(prev => prev.filter(b => b.id !== id));

        const { error } = await supabase.from('pt_bookings').delete().eq('id', id);
        if (error) {
            console.error('Delete failed:', error);
            fetchMyBookings(); // Rollback
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                        PT <span className="text-primary">HUB</span>
                    </h1>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
                        Manage your sessions
                    </p>
                </div>

                {/* Tab Switcher - Aligned with details card column on desktop */}
                <div className="lg:w-64 flex bg-transparent border border-white/10 rounded-2xl p-1 backdrop-blur-md justify-center">
                    <button
                        onClick={() => setActiveTab('book')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'book' ? 'bg-primary/20 text-primary border border-primary/50 shadow-lg shadow-primary/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Book Now
                    </button>
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'schedule' ? 'bg-primary/20 text-primary border border-primary/50 shadow-lg shadow-primary/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        My Schedule
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : activeTab === 'schedule' ? (
                bookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-white/20 bg-white/[0.02] border border-white/5 rounded-[2rem] animate-in fade-in duration-500">
                        <Calendar className="w-16 h-16 mb-4 opacity-10" />
                        <span className="text-sm font-black uppercase tracking-[0.4em] mb-8 text-center px-4">No sessions found in your history</span>
                        <button
                            onClick={() => setActiveTab('book')}
                            className="px-8 py-4 bg-primary text-white font-black rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-primary/20 flex items-center gap-2 uppercase tracking-widest text-[10px]"
                        >
                            Start Booking Now
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        <StudentPTCalendar 
                            bookings={bookings} 
                            onDelete={deleteBooking}
                        />
                    </div>
                )
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <NewPTBookingFlow 
                        onSuccess={() => {
                            setActiveTab('schedule');
                            fetchMyBookings();
                        }} 
                        onBack={() => setActiveTab('schedule')}
                    />
                </div>
            )}
        </div>
    );
}
