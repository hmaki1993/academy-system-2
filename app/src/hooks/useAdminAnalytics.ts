import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format, startOfMonth } from 'date-fns';

export interface RevenueDetail {
    id: string;
    student_name: string;
    amount: number;
    date: string;
    type: 'PT' | 'Consultation' | 'Other';
    notes: string;
}

export interface ListDetail {
    id: string;
    name: string;
    date: string;
    status: string;
    extra?: string;
}

export function useAdminAnalytics() {
    return useQuery({
        queryKey: ['adminRevenueAnalytics'],
        queryFn: async () => {
            const startOfMonthDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');

            const [paymentsRes, consultationsRes, ptBookingsRes, studentsRes] = await Promise.all([
                supabase.from('payments').select('*, students(full_name)').gte('payment_date', startOfMonthDate),
                supabase.from('consultation_requests').select('*').gte('booked_date', startOfMonthDate),
                supabase.from('pt_bookings').select('*').gte('booking_date', startOfMonthDate),
                supabase.from('profiles').select('id, full_name, created_at').eq('role', 'student')
            ]);

            const rawPayments = paymentsRes.data || [];
            const rawConsultations = consultationsRes.data || [];
            const rawPtBookings = ptBookingsRes.data || [];
            const rawStudents = studentsRes.data || [];
            
            let ptRevenue = 0;
            let consultationRevenue = 0;
            let otherRevenue = 0;
            const revenueDetails: RevenueDetail[] = [];

            // 1. Process Revenue (Payments Table)
            rawPayments.forEach(p => {
                const amount = Number(p.amount);
                const notes = (p.notes || '').toLowerCase();
                const studentName = p.students?.full_name || p.notes?.split('-')[1]?.trim() || 'Guest';

                if (notes.includes('pt subscription') || notes.includes('pt adjustment')) {
                    ptRevenue += amount;
                    revenueDetails.push({ id: p.id, student_name: studentName, amount, date: p.payment_date, type: 'PT', notes: p.notes });
                } else if (notes.includes('consultation')) {
                    consultationRevenue += amount;
                    revenueDetails.push({ id: p.id, student_name: studentName, amount, date: p.payment_date, type: 'Consultation', notes: p.notes });
                } else {
                    otherRevenue += amount;
                    revenueDetails.push({ id: p.id, student_name: studentName, amount, date: p.payment_date, type: 'Other', notes: p.notes });
                }
            });

            // 2. Add entries from consultation_requests (Paid only for revenue)
            rawConsultations.filter(c => c.payment_status === 'paid').forEach(c => {
                const amount = Number(c.amount_paid);
                const exists = revenueDetails.some(d => d.type === 'Consultation' && d.amount === amount && d.student_name.includes(c.full_name.split(' ')[0]));
                if (!exists) {
                    consultationRevenue += amount;
                    revenueDetails.push({ id: c.id, student_name: c.full_name, amount, date: c.booked_date, type: 'Consultation', notes: 'Direct Booking' });
                }
            });

            // 3. Prepare specialized detail lists
            const consultationDetails: ListDetail[] = rawConsultations.map(c => ({
                id: c.id,
                name: c.full_name,
                date: c.booked_date,
                status: c.payment_status === 'paid' ? 'PAID' : 'PENDING',
                extra: c.booked_time
            }));

            const ptDetails: ListDetail[] = rawPtBookings.map(b => ({
                id: b.id,
                name: b.student_name,
                date: b.booking_date,
                status: b.status?.toUpperCase() || 'UNCONFIRMED',
                extra: b.time_slot
            }));

            const athleteDetails: ListDetail[] = rawStudents.map(s => ({
                id: s.id,
                name: s.full_name,
                date: format(new Date(s.created_at), 'yyyy-MM-dd'),
                status: 'ACTIVE',
                extra: 'Elite Student'
            }));

            return {
                ptRevenue,
                consultationRevenue,
                otherRevenue,
                totalRevenue: ptRevenue + consultationRevenue + otherRevenue,
                consultationCount: rawConsultations.length,
                ptCount: rawPtBookings.length,
                athleteCount: rawStudents.length,
                revenueDetails: revenueDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                consultationDetails: consultationDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                ptDetails: ptDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                athleteDetails: athleteDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            };
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });
}
