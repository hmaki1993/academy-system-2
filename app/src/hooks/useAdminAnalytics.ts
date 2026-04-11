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

export function useAdminAnalytics() {
    return useQuery({
        queryKey: ['adminRevenueAnalytics'],
        queryFn: async () => {
            const startOfMonthDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');

            const [paymentsRes, consultationsRes, studentsRes] = await Promise.all([
                supabase.from('payments').select('*, students(full_name)').gte('payment_date', startOfMonthDate),
                supabase.from('consultation_requests').select('*').eq('payment_status', 'paid').gte('booked_date', startOfMonthDate),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student')
            ]);

            const rawPayments = paymentsRes.data || [];
            const rawConsultations = consultationsRes.data || [];
            
            let ptRevenue = 0;
            let consultationRevenue = 0;
            let otherRevenue = 0;
            const details: RevenueDetail[] = [];

            // Parse Payments Table
            rawPayments.forEach(p => {
                const amount = Number(p.amount);
                const notes = (p.notes || '').toLowerCase();
                const studentName = p.students?.full_name || p.notes?.split('-')[1]?.trim() || 'Guest';

                if (notes.includes('pt subscription') || notes.includes('pt adjustment')) {
                    ptRevenue += amount;
                    details.push({ id: p.id, student_name: studentName, amount, date: p.payment_date, type: 'PT', notes: p.notes });
                } else if (notes.includes('consultation')) {
                    consultationRevenue += amount;
                    details.push({ id: p.id, student_name: studentName, amount, date: p.payment_date, type: 'Consultation', notes: p.notes });
                } else {
                    otherRevenue += amount;
                    details.push({ id: p.id, student_name: studentName, amount, date: p.payment_date, type: 'Other', notes: p.notes });
                }
            });

            // Add entries from consultation_requests strictly (to catch direct bookers who might not be in payments yet)
            // Deduplicate logic: if a payment notes already contains the request_id, skip it here.
            rawConsultations.forEach(c => {
                const amount = Number(c.amount_paid);
                // Check if already added via payments notes
                const exists = details.some(d => d.type === 'Consultation' && d.amount === amount && d.student_name.includes(c.full_name.split(' ')[0]));
                if (!exists) {
                    consultationRevenue += amount;
                    details.push({ id: c.id, student_name: c.full_name, amount, date: c.booked_date, type: 'Consultation', notes: 'System Direct Booking' });
                }
            });

            return {
                ptRevenue,
                consultationRevenue,
                otherRevenue,
                totalRevenue: ptRevenue + consultationRevenue + otherRevenue,
                athleteCount: studentsRes.count || 0,
                details: details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            };
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });
}
