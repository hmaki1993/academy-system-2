import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { calcElapsedSeconds } from '../utils/dateUtils';
import { toast } from 'react-hot-toast';

// --- Students Hooks ---
export function useStudents() {
    return useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('*, coaches ( full_name ), subscription_plans ( name, price, sessions_limit ), training_groups ( name )')
                .order('created_at', { ascending: false });
            if (error) {
                console.error('Error fetching students:', error);
                throw error;
            }
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// --- Coaches Hooks ---
export function useCoaches() {
    return useQuery({
        queryKey: ['coaches'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];

            // Get coaches with roles
            const { data: coaches, error: coachesError } = await supabase
                .from('coaches')
                .select('id, full_name, email, phone, specialty, avatar_url, image_pos_x, image_pos_y, pt_rate, salary, role, created_at, profile_id, profiles(role)')
                .order('created_at', { ascending: false });

            if (coachesError) {
                console.error('Error fetching coaches:', coachesError);
                throw coachesError;
            }

            // Get today's attendance for status
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('coach_attendance')
                .select('coach_id, check_in_time, check_out_time, pt_sessions_count')
                .eq('date', today);

            if (attendanceError) console.error('Error fetching attendance status:', attendanceError);

            // Get today's PT sessions
            const { data: ptSessionsData, error: ptError } = await supabase
                .from('pt_sessions')
                .select('coach_id, sessions_count, student_name')
                .eq('date', today);

            if (ptError) console.error('Error fetching PT sessions:', ptError);

            // Safety check for map
            if (!coaches) return [];

            // Merge everything
            const enrichedCoaches = coaches?.map(coach => {
                const dayAttendance = attendanceData?.find(a => a.coach_id === coach.id);
                const coachPTs = ptSessionsData?.filter(s => s.coach_id === coach.id) || [];

                // Aggregated PT Sessions (from both tables)
                const totalSessions = (dayAttendance?.pt_sessions_count || 0) +
                    coachPTs.reduce((acc, curr) => acc + (curr.sessions_count || 0), 0);

                const studentNames = coachPTs.map(s => s.student_name).join(', ');

                // Determine Status and Calculate Duration
                let status = 'away';
                let dailyTotalSeconds = 0;

                if (dayAttendance) {
                    if (dayAttendance.check_in_time && !dayAttendance.check_out_time) {
                        status = 'working';
                        dailyTotalSeconds = calcElapsedSeconds(dayAttendance.check_in_time);
                    } else if (dayAttendance.check_out_time) {
                        status = 'done';
                        dailyTotalSeconds = calcElapsedSeconds(dayAttendance.check_in_time, dayAttendance.check_out_time);
                    }
                }

                return {
                    ...coach,
                    role: coach.role || (coach as any).profiles?.role,
                    pt_sessions_today: totalSessions,
                    pt_student_name: studentNames,
                    attendance_status: status,
                    check_in_time: dayAttendance?.check_in_time,
                    check_out_time: dayAttendance?.check_out_time,
                    daily_total_seconds: dailyTotalSeconds
                };
            });

            // --- 🛡️ ABSOLUTE UI DEDUPLICATION REGISTRY (v15) ---
            const uniqueList: any[] = [];
            const seenIds = new Set();
            const seenEmails = new Set();
            const seenProfileIds = new Set();
            const seenNames = new Set(); // Final fuzzy shield

            // Sort so we process those with profiles or check-ins first
            const sortedCoaches = [...enrichedCoaches].sort((a, b) => {
                if (a.profile_id && !b.profile_id) return -1;
                if (!a.profile_id && b.profile_id) return 1;
                if (a.attendance_status === 'working' && b.attendance_status !== 'working') return -1;
                return 0;
            });

            sortedCoaches.forEach(coach => {
                const email = coach.email?.toLowerCase().trim();
                const profileId = coach.profile_id;
                const name = coach.full_name?.toLowerCase().trim();

                const isDuplicate =
                    seenIds.has(coach.id) ||
                    (email && seenEmails.has(email)) ||
                    (profileId && seenProfileIds.has(profileId)) ||
                    (name && (!profileId || !email) && seenNames.has(name)); // Aggressive orphan block

                if (!isDuplicate) {
                    uniqueList.push(coach);
                    seenIds.add(coach.id);
                    if (email) seenEmails.add(email);
                    if (profileId) seenProfileIds.add(profileId);
                    if (name) seenNames.add(name);
                }
            });

            return uniqueList;
        },
        staleTime: 1000 * 30, // 30 seconds for live status
    });
}


// --- Training Assignments Hooks ---
export function useTrainingAssignment() {
    return useQuery({
        queryKey: ['training_assignment'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Get the student ID for this user
            const { data: student } = await supabase
                .from('students')
                .select('id')
                .eq('profile_id', user.id)
                .single();
            
            if (!student) return null;

            const { data, error } = await supabase
                .from('training_assignments')
                .select('*, coaches(full_name)')
                .eq('student_id', student.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error fetching assignment:', error);
                return null;
            }

            return data;
        },
        staleTime: 1000 * 60, // 1 minute
    });
}

// --- Training Videos Hooks ---
export function useTrainingVideos(level?: number | string) {
    return useQuery({
        queryKey: ['training_videos', level],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            // Get user role with maybeSingle to avoid errors
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            const role = profile?.role;
            const isAdmin = role === 'admin' || role === 'coach' || role === 'head_coach';
            
            let targetLevel: any = level;

            // Normalize 'all'/'الكل' to null for all-videos view
            if (targetLevel === 'all' || targetLevel === 'الكل') {
                targetLevel = null;
            }

            // If it's a student and no level specifically selected, default to their current level
            if (!isAdmin && !targetLevel) {
                const { data: student } = await supabase
                    .from('students')
                    .select('current_training_level')
                    .eq('profile_id', user.id)
                    .maybeSingle();
                targetLevel = student?.current_training_level || 1;
            }

            let query = supabase
                .from('training_videos')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (targetLevel) {
                const levelNum = typeof targetLevel === 'string' ? parseInt(targetLevel) : targetLevel;
                if (!isNaN(levelNum)) {
                    query = query.eq('level_number', levelNum);
                }
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching training videos:', error);
                throw error;
            }
            return data || [];
        },
        staleTime: 1000 * 60 * 5,
    });
}

// --- Level Access Hooks ---
export function useJumpRopeAccess() {
    return useQuery({
        queryKey: ['jump_rope_access'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { isLocked: true, reason: 'unauthenticated' };

            // 1. Get user role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            const role = profile?.role;
            const isAdmin = role === 'admin' || role === 'coach' || role === 'head_coach';

            // Admins/Coaches always have access
            if (isAdmin) return { isLocked: false, isAdmin: true, user };

            // 2. For students, check if they have at least one purchase
            // First get their student ID
            const { data: student } = await supabase
                .from('students')
                .select('id')
                .eq('profile_id', user.id)
                .maybeSingle();
            
            if (!student || !student.id) return { isLocked: true, reason: 'no_student_record', user };

            const { count } = await supabase
                .from('level_purchases')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', student.id);
            
            const hasPurchased = (count || 0) > 0;
            return {
                isLocked: !hasPurchased,
                reason: !hasPurchased ? 'no_purchases' : null,
                studentId: student.id,
                user
            };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useLevelAccess(studentId?: string | number | null) {
    return useQuery({
        queryKey: ['level_access', studentId],
        queryFn: async () => {
            // 🛡️ NUCLEAR GUARD: Ignore missing or stringified null/undefined IDs
            if (!studentId || studentId === 'null' || studentId === 'undefined') return [];
            
            const { data, error } = await supabase
                .from('level_purchases')
                .select('level_number')
                .eq('student_id', studentId);
            
            if (error) {
                console.error('Error fetching level access:', error);
                return [];
            }
            return data.map(lp => lp.level_number) as number[];
        },
        enabled: !!studentId && studentId !== 'null' && studentId !== 'undefined',
        staleTime: 1000 * 60 * 10,
    });
}

export function useLevelCosts() {
    return useQuery({
        queryKey: ['level_costs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('level_costs')
                .select('*')
                .order('level_number', { ascending: true });
            
            if (error) {
                console.error('Error fetching level costs:', error);
                return [];
            }
            return data;
        },
        staleTime: 1000 * 60 * 60,
    });
}

export function useUpdateLevelCost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ level_number, price }: { level_number: number, price: number }) => {
            const { data, error } = await supabase
                .from('level_costs')
                .update({ price })
                .eq('level_number', level_number)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['level_costs'] });
            toast.success('Price updated successfully');
        }
    });
}

export function useAllLevelPurchases() {
    return useQuery({
        queryKey: ['all_level_purchases'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('level_purchases')
                .select('*, students(full_name)')
                .order('purchased_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function usePayments() {
    return useQuery({
        queryKey: ['payments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('payments')
                .select('*, students(full_name)')
                .order('payment_date', { ascending: false });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes — avoids refetching on every Finance page visit
    });
}

// --- Subscription Plans Hook ---
export function useSubscriptionPlans() {
    return useQuery({
        queryKey: ['subscription_plans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('duration_months', { ascending: true });
            if (error) {
                console.error('Error fetching subscription plans:', error);
                throw error;
            }
            return data;
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 hours (plans change rarely)
    });
}

export function useAddPlan() {
    return useMutation({
        mutationFn: async (plan: { name: string, duration_months: number, price: number, sessions_per_week: number, sessions_limit?: number }) => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .insert([plan])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    });
}

export function useDeletePlan() {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('subscription_plans')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    });
}

export function useUpdatePlan() {
    return useMutation({
        mutationFn: async (plan: { id: string, name: string, duration_months: number, price: number, sessions_per_week: number, sessions_limit?: number }) => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .update({
                    name: plan.name,
                    duration_months: plan.duration_months,
                    price: plan.price,
                    sessions_per_week: plan.sessions_per_week,
                    sessions_limit: plan.sessions_limit
                })
                .eq('id', plan.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    });
}

// --- Dashboard Hooks ---
export function useDashboardStats(role?: string) {
    return useQuery({
        queryKey: ['dashboardStats'],
        enabled: !!role && role !== 'student',
        queryFn: async () => {
            const startOfMonthDate = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

            const [students, coaches, payments, refunds, groups, recent] = await Promise.all([
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('coaches').select('*', { count: 'exact', head: true }),
                supabase.from('payments').select('amount').gte('payment_date', startOfMonthDate),
                supabase.from('refunds').select('amount').gte('refund_date', startOfMonthDate),
                supabase.from('training_groups').select('*', { count: 'exact', head: true }),
                supabase.from('students').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(5)
            ]);

            const monthlyPaymentsTotal = (payments.data || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
            const monthlyRefundsTotal = (refunds.data || []).reduce((acc, curr) => acc + Number(curr.amount), 0);

            return {
                totalStudents: students.count || 0,
                activeCoaches: coaches.count || 0,
                totalGroups: groups.count || 0,
                monthlyRevenue: monthlyPaymentsTotal - monthlyRefundsTotal,
                recentActivity: recent.data || []
            };
        }
    });
}

// --- Smart Engine Context Hook ---
export function useGymData() {
    const { data: students } = useStudents();
    const { data: coaches } = useCoaches();
    const { data: payments } = usePayments();

    return {
        students: students || [],
        coaches: coaches || [],
        payments: payments || [],
        timestamp: new Date().toISOString()
    };
}

// --- Payroll Hook ---
export function useMonthlyPayroll(month: string) {
    return useQuery({
        queryKey: ['payroll', month],
        queryFn: async () => {
            // 1. Get all coaches
            const { data: coaches, error: coachError } = await supabase
                .from('coaches')
                .select('id, full_name, pt_rate, salary, role');

            if (coachError) throw coachError;

            // Filter out admins from payroll
            const filteredCoaches = (coaches || []).filter(c => c.role !== 'admin');

            // 2. Get attendance and PT sessions for the selected month
            const startOfMonth = `${month}-01`;
            const lastDay = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate();
            const endOfMonth = `${month}-${lastDay}`;

            const [attendanceRes, sessionsRes] = await Promise.all([
                supabase
                    .from('coach_attendance')
                    .select('coach_id, check_in_time, check_out_time, pt_sessions_count')
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth),
                supabase
                    .from('pt_sessions')
                    .select('id, coach_id, sessions_count, coach_share, student_name, date, created_at')
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth)
            ]);

            if (attendanceRes.error) throw attendanceRes.error;
            if (sessionsRes.error) throw sessionsRes.error;

            // 3. Aggregate data
            let totalPayroll = 0;
            const stats = filteredCoaches.map(coach => {
                const coachAttendance = attendanceRes.data?.filter(a => a.coach_id === coach.id) || [];
                const coachSessions = sessionsRes.data?.filter(s => s.coach_id === coach.id) || [];

                // Calculate total work hours
                let totalSeconds = 0;
                coachAttendance.forEach(record => {
                    if (record.check_in_time && record.check_out_time) {
                        const start = new Date(record.check_in_time).getTime();
                        const end = new Date(record.check_out_time).getTime();
                        totalSeconds += Math.max(0, (end - start) / 1000);
                    }
                });
                const totalHours = Number((totalSeconds / 3600).toFixed(1));

                // Calculate total PT sessions and earnings (using individual session shares)
                const totalSessions = coachSessions.reduce((sum, s) => sum + (Number(s.sessions_count ?? 1)), 0);

                const ptEarnings = coachSessions.reduce((sum, s) => {
                    const sessionCount = Number(s.sessions_count ?? 1);
                    const sessionShare = s.coach_share ?? coach.pt_rate ?? 0;
                    return sum + (sessionCount * sessionShare);
                }, 0);

                const salary = coach.salary || 0;
                const totalEarnings = ptEarnings + salary;

                totalPayroll += totalEarnings;

                return {
                    coach_id: coach.id,
                    coach_name: coach.full_name,
                    role: coach.role,
                    pt_rate: coach.pt_rate || 0,
                    salary: salary,
                    total_pt_sessions: totalSessions,
                    pt_earnings: ptEarnings,
                    pt_sessions: coachSessions, // ADDED: include raw sessions
                    total_hours: totalHours,
                    total_earnings: totalEarnings
                };
            });

            return {
                totalPayroll,
                payrollData: stats
            };
        },
        staleTime: 1000 * 60 * 5 // Cache for 5 minutes
    });
}

export function useGroups() {
    return useQuery({
        queryKey: ['groups'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('training_groups')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
}

// --- Refunds Hooks ---
export function useRefunds() {
    return useQuery({
        queryKey: ['refunds'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('refunds')
                .select('*, students ( full_name )')
                .order('refund_date', { ascending: false });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function useAddRefund() {
    return useMutation({
        mutationFn: async (refund: { student_id: string; amount: number; reason?: string; refund_date: string }) => {
            const { data: { user } } = await supabase.auth.getUser();

            // Get student name for notification
            const { data: studentData } = await supabase
                .from('students')
                .select('full_name')
                .eq('id', refund.student_id)
                .single();

            const { data, error } = await supabase
                .from('refunds')
                .insert([{ ...refund, created_by: user?.id }])
                .select()
                .single();
            if (error) throw error;

            // Create notification for admin
            if (studentData) {
                await supabase.from('notifications').insert({
                    type: 'payment',
                    title: 'Refund Issued',
                    message: `Refund: ${refund.amount.toFixed(2)} to ${studentData.full_name}`,
                    user_id: null,
                    is_read: false
                });
            }

            return data;
        },
    });
}

export function useDeleteRefund() {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('refunds')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
    });
}

// --- Expenses Hooks ---
export function useExpenses() {
    return useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('expense_date', { ascending: false });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function useAddExpense() {
    return useMutation({
        mutationFn: async (expense: { description: string; amount: number; category: string; expense_date: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('expenses')
                .insert([{ ...expense, created_by: user?.id }])
                .select()
                .single();
            if (error) throw error;

            // Create notification for admin
            await supabase.from('notifications').insert({
                type: 'payment',
                title: 'Expense Recorded',
                message: `Expense: ${expense.amount.toFixed(2)} - ${expense.description}`,
                user_id: null,
                is_read: false
            });

            return data;
        },
    });
}

export function useDeleteExpense() {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
    });
}
// --- Financial Trends Hook ---
export function useFinancialTrends(role?: string) {
    return useQuery({
        queryKey: ['financialTrends'],
        enabled: !!role && role !== 'student',
        queryFn: async () => {
            const today = new Date();
            const last6Months = Array.from({ length: 6 }, (_, i) => {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                return format(date, 'yyyy-MM');
            }).reverse();

            // Fetch all data for the last 6 months
            const startDate = `${last6Months[0]}-01`;

            const [payments, refunds, expenses, students, ptSessions] = await Promise.all([
                supabase.from('payments').select('amount, payment_date').gte('payment_date', startDate),
                supabase.from('refunds').select('amount, refund_date').gte('refund_date', startDate),
                supabase.from('expenses').select('amount, expense_date').gte('expense_date', startDate),
                supabase.from('students').select('created_at').gte('created_at', startDate),
                supabase.from('pt_sessions').select('sessions_count, date').gte('date', startDate)
            ]);

            // Group by month
            const trends = last6Months.map(month => {
                const monthPayments = (payments.data || [])
                    .filter(p => p.payment_date.startsWith(month))
                    .reduce((sum, p) => sum + Number(p.amount), 0);

                const monthRefunds = (refunds.data || [])
                    .filter(r => r.refund_date.startsWith(month))
                    .reduce((sum, r) => sum + Number(r.amount), 0);

                const monthExpenses = (expenses.data || [])
                    .filter(e => e.expense_date.startsWith(month))
                    .reduce((sum, e) => sum + Number(e.amount), 0);

                const newStudents = (students.data || [])
                    .filter(s => s.created_at.startsWith(month)).length;

                const ptCount = (ptSessions.data || [])
                    .filter(s => s.date.startsWith(month))
                    .reduce((sum, s) => sum + Number(s.sessions_count || 1), 0);

                const revenue = monthPayments - monthRefunds;
                const profit = revenue - monthExpenses;

                return {
                    month: format(new Date(month + '-01'), 'MMM'),
                    revenue,
                    expenses: monthExpenses,
                    profit,
                    students: newStudents,
                    ptSessions: ptCount
                };
            });

            return trends;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

// --- Jump Rope Training Hooks ---
export function useJumpRopeLeaderboard(filter: 'global' | 'weekly' = 'weekly') {
    return useQuery({
        queryKey: ['jump_rope_leaderboard', filter],
        queryFn: async () => {
            let query = supabase
                .from('jump_rope_sessions')
                .select('jumps, created_at, user_id, profiles(full_name)')
                .order('jumps', { ascending: false });

            if (filter === 'weekly') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setHours(0, 0, 0, 0);
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                query = query.gte('created_at', oneWeekAgo.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;

            // Group by user and sum jumps
            const userScores: Record<string, any> = {};
            data?.forEach(session => {
                const uid = session.user_id;
                if (!uid) return;
                
                if (!userScores[uid]) {
                    userScores[uid] = {
                        name: (session.profiles as any)?.full_name || 'Anonymous',
                        jumps: 0,
                        sessions: 0
                    };
                }
                userScores[uid].jumps += session.jumps;
                userScores[uid].sessions += 1;
            });

            return Object.values(userScores)
                .sort((a, b) => b.jumps - a.jumps)
                .slice(0, 10);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

const LOCAL_STORAGE_KEY = 'jr_standalone_sessions';

export function useJumpRopeStats() {
    return useQuery({
        queryKey: ['jump_rope_stats'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            let sessions = [];

            // 1. Fetch from Supabase (Source of Truth)
            if (user) {
                const { data, error } = await supabase
                    .from('jump_rope_sessions')
                    .select('*')
                    .eq('user_id', user.id);
                
                if (!error && data) {
                    sessions = data;
                }
            }

            // 2. If empty or offline, check localStorage
            if (sessions.length === 0) {
                const sessionsStr = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
                sessions = JSON.parse(sessionsStr);
            }

            const today = new Date().toISOString().split('T')[0];
            const totalJumps = sessions.reduce((sum: number, s: any) => sum + (s.jumps || 0), 0);
            const todayJumps = sessions
                .filter((s: any) => s.created_at?.startsWith(today) || s.date?.startsWith(today))
                .reduce((sum: number, s: any) => sum + (s.jumps || 0), 0);
            
            const maxRpm = sessions.reduce((max: number, s: any) => Math.max(max, s.rpm || 0), 0);
            const recentSessions = sessions.slice(0, 5);

            return {
                totalJumps,
                todayJumps,
                maxRpm,
                recentSessions,
                sessionCount: sessions.length
            };
        },
    });
}


export function useJumpRopeHistory() {
    return useQuery({
        queryKey: ['jump_rope_history'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            
            // 1. Fetch from Supabase if logged in (Source of Truth)
            if (user) {
                const { data, error } = await supabase
                    .from('jump_rope_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                
                if (!error && data && data.length > 0) {
                    return data;
                }
            }

            // 2. Fallback to localStorage (Legacy/Offline support)
            const sessionsStr = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
            return JSON.parse(sessionsStr);
        },
    });
}


export interface JrAdminStat {
    userId: string;
    studentId?: string; // Add true students.id
    name: string;
    avatarUrl: string;
    email?: string;
    phone?: string;
    role: string;
    totalJumps: number;
    sessionsCount: number;
    lastSession: string | null;
    lastActiveAt: string | null;
}

export function useJumpRopeAdminStats() {
    return useQuery({
        queryKey: ['jump_rope_admin_stats'],
        queryFn: async () => {
            // 1. Fetch official students with 'student' role
            const { data: students, error: sError } = await supabase
                .from('students')
                .select('id, profile_id, parent_contact, full_name, email, profiles!inner ( avatar_url, last_active_at, role )')
                .eq('profiles.role', 'student');

            if (sError) throw sError;

            // 2. Fetch all jump rope sessions
            const { data: sessionsData } = await supabase
                .from('jump_rope_sessions')
                .select('jumps, created_at, user_id, student_id')
                .order('created_at', { ascending: false });

            // Build athlete stats lookup registries
            const userStats: Record<string, JrAdminStat> = {};
            const studentIdToProfileId: Record<string, string> = {};

            students?.forEach(student => {
                const uid = student.profile_id;
                if (!uid) return;

                studentIdToProfileId[student.id] = uid;
                const prof = student.profiles as any;

                userStats[uid] = {
                    userId: uid,
                    studentId: student.id,
                    name: student.full_name || 'Unknown Athlete',
                    avatarUrl: prof?.avatar_url || '',
                    email: student.email || '',
                    phone: student.parent_contact || '',
                    role: 'student',
                    totalJumps: 0,
                    sessionsCount: 0,
                    lastSession: null,
                    lastActiveAt: prof?.last_active_at || null
                };
            });

            // Accumulate session data for active students (Dual-ID Aggregation)
            sessionsData?.forEach(session => {
                const sid = session.student_id;
                const uid = session.user_id;
                
                // Priority 1: Match by explicit student_id (Used in Coach-Led/Remote sessions)
                let targetUid = sid ? studentIdToProfileId[sid] : null;
                
                // Priority 2: Fallback to user_id (Used in standard Student-Led sessions)
                if (!targetUid && uid) {
                    targetUid = uid;
                }

                if (!targetUid || !userStats[targetUid]) return;

                const stat = userStats[targetUid];
                stat.totalJumps += (session.jumps || 0);
                stat.sessionsCount += 1;
                
                if (!stat.lastSession || new Date(session.created_at) > new Date(stat.lastSession)) {
                    stat.lastSession = session.created_at;
                }
            });

            return Object.values(userStats).sort((a, b) => b.totalJumps - a.totalJumps);
        },
        staleTime: 1000 * 10,
        refetchInterval: 1000 * 30,
    });
}

export function useDeleteAthlete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: string) => {
            // 1. Delete from students table
            const { error: sError } = await supabase
                .from('students')
                .delete()
                .eq('profile_id', userId);
            
            if (sError) console.error('Error deleting student record:', sError);

            // 2. Delete profile record (Trigger will handle auth deletion if configured)
            const { error: pError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);
            
            if (pError) throw pError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jump_rope_admin_stats'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            toast.success('Athlete removed from system successfully');
        },
        onError: (error: any) => {
            console.error('Error deleting athlete:', error);
            toast.error('فشل مسح اللاعب: ' + error.message);
        }
    });
}

export function useAthleteActivityHistory(userId?: string) {
    return useQuery({
        queryKey: ['athlete_activity_history', userId],
        queryFn: async () => {
            // 🛡️ NUCLEAR GUARD: Ignore missing or stringified null/undefined IDs
            if (!userId || userId === 'null' || userId === 'undefined') return [];
            
            const { data, error } = await supabase
                .from('jump_rope_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data;
        },
        enabled: !!userId && userId !== 'null' && userId !== 'undefined',
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

export function useAddJumpRopeSession() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (session: { jumps: number; duration: number; rpm: number; work_duration?: number; rest_duration?: number; student_id?: string }) => {
            const sessionsStr = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
            const sessions = JSON.parse(sessionsStr);
            
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || 'anonymous_user';

            const newSession = {
                id: Date.now().toString(),
                created_at: new Date().toISOString(),
                user_id: userId,
                ...session
            };
            
            sessions.unshift(newSession);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions.slice(0, 500)));

            // Sync to Supabase
            if (user) {
                const { error } = await supabase.from('jump_rope_sessions').insert([{
                    user_id: user.id,
                    student_id: session.student_id || null,
                    jumps: session.jumps,
                    duration: session.duration,
                    rpm: session.rpm,
                    work_duration: session.work_duration ?? session.duration,
                    rest_duration: session.rest_duration ?? 0
                }]);
                if (error) {
                    console.error('Failed to sync jump rope session:', error);
                    throw error;
                }
            }
            
            return newSession;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jump_rope_stats'] });
            queryClient.invalidateQueries({ queryKey: ['jump_rope_history'] });
        },
    });
}

export function useDeleteJumpRopeSession() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (sessionId: string) => {
            const sessionsStr = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
            const sessions = JSON.parse(sessionsStr);
            const filtered = sessions.filter((s: any) => s.id !== sessionId);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jump_rope_history'] });
            queryClient.invalidateQueries({ queryKey: ['jump_rope_stats'] });
        },
    });
}

export function useDeleteMultipleJumpRopeSessions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (sessionIds: string[]) => {
            const sessionsStr = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
            const sessions = JSON.parse(sessionsStr);
            const filtered = sessions.filter((s: any) => !sessionIds.includes(s.id));
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jump_rope_history'] });
            queryClient.invalidateQueries({ queryKey: ['jump_rope_stats'] });
        },
    });
}

export function useAssignTraining() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (assignment: { student_id: string; target_jumps: number; target_duration_minutes: number }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Unauthorized');

            // Find the coach ID for this user profile
            const { data: coach } = await supabase
                .from('coaches')
                .select('id')
                .eq('profile_id', user.id)
                .maybeSingle();

            const { data, error } = await supabase
                .from('training_assignments')
                .insert([{
                    student_id: assignment.student_id,
                    coach_id: coach?.id,
                    target_jumps: assignment.target_jumps,
                    target_duration_minutes: assignment.target_duration_minutes,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['training_assignment'] });
            toast.success('تم إرسال التكليف للمتدرب بنجاح');
        },
        onError: (error: any) => {
            console.error('Error assigning training:', error);
            toast.error('فشل إرسال التكليف: ' + error.message);
        }
    });
}

export function useTrainingPlanHistory(possibleId?: string | null) {
    return useQuery({
        queryKey: ['training_plan_history', possibleId],
        queryFn: async () => {
            // 🛡️ NUCLEAR GUARD: Ignore missing or stringified null/undefined IDs
            if (!possibleId || possibleId === 'null' || possibleId === 'undefined') return [];

            // First identify the true student.id (it could be a profile_id)
            let trueStudentId: any = possibleId;
            const { data: stData } = await supabase
                .from('students')
                .select('id')
                .or(`id.eq.${possibleId},profile_id.eq.${possibleId}`)
                .maybeSingle();
            
            if (stData?.id) {
                trueStudentId = stData.id;
            }

            const { data, error } = await supabase
                .from('training_plans')
                .select('*')
                .eq('student_id', trueStudentId)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error fetching plan history:', error);
                throw error;
            }
            return data;
        },
        enabled: !!possibleId && possibleId !== 'null' && possibleId !== 'undefined',
        staleTime: 1000 * 60 * 5,
    });
}
