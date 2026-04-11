import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export function useConsultationAvailability() {
    return useQuery({
        queryKey: ['consultation_availability'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('consultation_availability')
                .select('*')
                .order('specific_date', { ascending: true })
                .order('start_time', { ascending: true });
            
            if (error) throw error;
            return data;
        }
    });
}

export function useUpdateConsultationAvailability() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, specific_date, start_time, end_time, is_active } : any) => {
            let res;
            if (id) {
                res = await supabase.from('consultation_availability')
                    .update({ start_time, end_time, is_active })
                    .eq('id', id);
            } else {
                res = await supabase.from('consultation_availability')
                    .insert({ specific_date, start_time, end_time, is_active });
            }
            if (res.error) throw res.error;
            return res.data;
        },
        onSuccess: (_data, variables: any) => {
            queryClient.invalidateQueries({ queryKey: ['consultation_availability'] });
            if (!variables.silent) {
                toast.success('Availability updated!');
            }
        }
    });
}

export function useConsultationRequests() {
    return useQuery({
        queryKey: ['consultation_requests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('consultation_requests')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data;
        }
    });
}

export function useUpdateConsultationRequestStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase
                .from('consultation_requests')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consultation_requests'] });
        }
    });
}

export function useConsultationSettings() {
    return useQuery({
        queryKey: ['consultation_settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gym_settings')
                .select('consultation_fee, consultation_duration_mins')
                .single();
            if (error) throw error;
            return data;
        }
    });
}
export function useDeleteConsultationRequests() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (ids: string | string[]) => {
            const idList = Array.isArray(ids) ? ids : [ids];
            const { error } = await supabase
                .from('consultation_requests')
                .delete()
                .in('id', idList);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consultation_requests'] });
        }
    });
}
