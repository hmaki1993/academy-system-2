import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
    User,
    Calendar,
    CheckCircle,
    XCircle,
    ArrowLeft,
    Clock,
    MessageSquare,
    Shield,
    Key,
    UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function StudentDetails() {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [student, setStudent] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    useEffect(() => {
        if (id) fetchStudentData();
    }, [id, selectedMonth]);

    const fetchStudentData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Student Info
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('*, coaches(full_name), subscription_plans(name)')
                .eq('id', id)
                .single();

            if (studentError) throw studentError;
            setStudent(studentData);

            // 2. Fetch Attendance for selected month
            const start = startOfMonth(selectedMonth).toISOString();
            const end = endOfMonth(selectedMonth).toISOString();

            const { data: attendanceData, error: attendanceError } = await supabase
                .from('student_attendance')
                .select('*')
                .eq('student_id', id)
                .gte('date', start)
                .lte('date', end)
                .order('date', { ascending: false });

            if (attendanceError) throw attendanceError;
            setAttendance(attendanceData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: attendance.length,
        present: attendance.filter(a => a.status === 'present' || a.status === 'completed').length,
        absent: attendance.filter(a => a.status === 'absent').length,
    };

    const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

    if (loading) return <div className="p-8 text-center text-white/50">Loading Profile...</div>;
    if (!student) return <div className="p-8 text-center text-white/50">Student not found</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
                        {student.full_name}
                    </h1>
                    <p className="text-white/50 font-bold uppercase tracking-wide flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {student.subscription_plans?.name || 'No Plan'} • {student.coaches?.full_name || 'No Coach'}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-3xl border border-white/10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Attendance Rate</p>
                            <h3 className="text-2xl font-black text-white">{attendanceRate}%</h3>
                        </div>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${attendanceRate}%` }}></div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-3xl border border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Present Days</p>
                            <h3 className="text-2xl font-black text-white">{stats.present}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-3xl border border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <XCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Absent Days</p>
                            <h3 className="text-2xl font-black text-white">{stats.absent}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Portal Access Card */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center ${student.user_id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'}`}>
                            <Shield className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                Portal Access
                                {student.user_id ? (
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Active</span>
                                ) : (
                                    <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full border border-white/10">Disabled</span>
                                )}
                            </h2>
                            <p className="text-white/40 text-sm font-medium">
                                {student.user_id
                                    ? 'Student can log in to view their performance and chat with you.'
                                    : 'Grant this student access to their own portal to track sessions and chat.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {student.user_id ? (
                            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
                                <Key className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-black text-white/60 tracking-widest uppercase">Account Linked</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/register', { state: { prefill: { email: student.email, full_name: student.full_name, student_id: student.id, role: 'student' } } })}
                                className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-105 transition-all"
                            >
                                <UserPlus className="w-5 h-5" />
                                Create Portal Access
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Attendance History List */}
            <div className="glass-card rounded-[2.5rem] border border-white/10 p-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Clock className="w-6 h-6 text-primary" />
                        Attendance History ({format(selectedMonth, 'MMMM yyyy')})
                    </h2>
                    {/* Suggestion: Month picker could go here */}
                </div>

                <div className="space-y-3">
                    {attendance.length === 0 ? (
                        <div className="text-center py-20 opacity-30">
                            <Calendar className="w-12 h-12 mx-auto mb-4" />
                            <p className="uppercase tracking-widest font-bold">No Records Found</p>
                        </div>
                    ) : (
                        attendance.map(record => (
                            <div key={record.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${record.status === 'absent' ? 'bg-rose-500/5 border-rose-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black ${record.status === 'absent' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                        <span className="text-sm font-bold uppercase">{format(new Date(record.date), 'dd')}</span>
                                        <span className="text-xs opacity-50">{format(new Date(record.date), 'MMM')}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg flex items-center gap-2">
                                            {format(new Date(record.date), 'EEEE')}
                                            {record.status === 'absent' && <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-md">ABSENT</span>}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/40">
                                            {record.check_in_time && (
                                                <span>In: {format(new Date(record.check_in_time), 'HH:mm')}</span>
                                            )}
                                            {record.check_out_time && (
                                                <>
                                                    <span className="opacity-50">•</span>
                                                    <span>Out: {format(new Date(record.check_out_time), 'HH:mm')}</span>
                                                    <span className="opacity-50">•</span>
                                                    <span className="text-emerald-400">
                                                        {(() => {
                                                            const start = new Date(record.check_in_time).getTime();
                                                            const end = new Date(record.check_out_time).getTime();
                                                            const diff = end - start;
                                                            const hours = Math.floor(diff / (1000 * 60 * 60));
                                                            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                            return `${hours}h ${minutes}m`;
                                                        })()}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {record.note && (
                                    <div className="bg-yellow-400/10 text-yellow-400 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" />
                                        {record.note}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
