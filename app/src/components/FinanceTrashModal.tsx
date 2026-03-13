import { useState, useEffect } from 'react';
import { X, History, RotateCcw, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { useCurrency } from '../context/CurrencyContext';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

interface TrashModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestore: () => void;
}

export default function FinanceTrashModal({ isOpen, onClose, onRestore }: TrashModalProps) {
    const { currency } = useCurrency();
    const [deletedItems, setDeletedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchDeletedItems();
        }
    }, [isOpen]);

    const fetchDeletedItems = async () => {
        setLoading(true);
        try {
            // We'll fetch from a hypothetical 'finance_audit_log' or simply items marked as deleted if we had soft delete.
            // Since we don't have soft delete yet, we'll look for a 'deleted_at' field if it exists, 
            // OR we'll use a specialized audit table. 
            // For now, I'll simulate by checking if there's a 'finance_history' table or similar.
            // If none, I'll recommend creating one.

            const { data, error } = await supabase
                .from('finance_history')
                .select('*')
                .eq('action', 'DELETE')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching trash:', error);
                if (error.code === '42P01') { // undefined_table
                    toast.error('Recycle Bin table missing. Please run the SQL command provided.', { duration: 5000 });
                }
                setDeletedItems([]);
            } else {
                setDeletedItems(data || []);
            }
        } catch (e) {
            console.error('Error fetching trash:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (item: any) => {
        const toastId = toast.loading('Restoring transaction...');
        try {
            // Logic to re-insert the item into its original table
            const { table_name, row_data } = item;
            const { error } = await supabase
                .from(table_name)
                .insert([row_data]);

            if (error) throw error;

            // Remove from history
            await supabase.from('finance_history').delete().eq('id', item.id);

            toast.success('Transaction restored!', { id: toastId });
            fetchDeletedItems();
            onRestore();
        } catch (error: any) {
            toast.error(error.message || 'Restore failed', { id: toastId });
        }
    };

    const handleEmptyTrash = async () => {
        const toastId = toast.loading('Permanently clearing trash...');
        try {
            const { error } = await supabase
                .from('finance_history')
                .delete()
                .eq('action', 'DELETE');

            if (error) throw error;

            toast.success('Recycle Bin emptied!', { id: toastId });
            setDeletedItems([]);
            onRestore();
        } catch (error: any) {
            toast.error(error.message || 'Clear failed', { id: toastId });
        } finally {
            setShowClearConfirm(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-4xl max-h-[90dvh] md:max-h-[85vh] flex flex-col rounded-2xl md:rounded-[3rem] border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden">
                {/* Header */}
                <div className="p-4 md:p-10 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-white/[0.02] gap-4">
                    <div className="flex items-center gap-3 md:gap-5">
                        <div className="p-2 md:p-4 bg-rose-500/20 rounded-xl md:rounded-2xl text-rose-400 shadow-inner">
                            <History className="w-5 h-5 md:w-8 md:h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight">Recycle Bin</h2>
                            <p className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] md:tracking-[0.3em] mt-0.5 md:mt-1">Restore deleted transactions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            disabled={deletedItems.length === 0}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 disabled:scale-100 active:scale-95"
                        >
                            <Trash2 className="w-4 h-4 md:w-5 h-5" />
                            Empty Trash
                        </button>
                        <button
                            onClick={onClose}
                            className="p-3 md:p-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl md:rounded-2xl transition-all active:scale-95"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                            <p className="font-black uppercase tracking-widest text-xs">Scanning deep storage...</p>
                        </div>
                    ) : deletedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 opacity-20">
                                <Trash2 className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-xl font-black text-white/40 uppercase tracking-widest mb-2">Trash is empty</h3>
                            <p className="text-white/20 text-sm font-bold max-w-xs uppercase tracking-tight leading-loose">No deleted transactions were found in the recent history logs.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {deletedItems.map((item) => (
                                <div key={item.id} className="group p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all duration-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 md:gap-6">
                                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center text-xs md:text-sm font-black text-white/40 group-hover:text-primary transition-colors shrink-0">
                                            {item.table_name?.[0]?.toUpperCase() || 'T'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-white text-base md:text-lg tracking-tight mb-0.5 md:mb-1 truncate">
                                                {item.row_data?.description || item.row_data?.notes || 'Unknown Transaction'}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/20">
                                                <span className="px-1.5 py-0.5 bg-white/5 rounded-md border border-white/5">{item.table_name?.replace('finance_', '')}</span>
                                                <span className="hidden sm:inline w-1 h-1 bg-white/10 rounded-full"></span>
                                                <span>Deleted {format(new Date(item.created_at), 'MMM dd, HH:mm')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                        <div className="text-left sm:text-right">
                                            <div className="text-lg md:text-xl font-black text-white/60 tracking-tighter">
                                                {Number(item.row_data?.amount).toLocaleString()} {currency.code}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestore(item)}
                                            className="px-4 py-2.5 md:p-4 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl md:rounded-2xl transition-all duration-500 shadow-lg shadow-primary/5 active:scale-95 flex items-center gap-2 group/btn"
                                        >
                                            <RotateCcw className="w-4 h-4 md:w-5 h-5 group-hover/btn:rotate-[-45deg] transition-transform duration-500" />
                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Restore</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Note */}
                <div className="p-8 bg-amber-500/5 border-t border-white/5 flex items-center gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-400 opacity-60" />
                    <p className="text-[10px] font-black text-amber-400/60 uppercase tracking-widest leading-loose">
                        Note: Restoring an entry will move it back to its original category. System logs are retained for 30 days.
                    </p>
                </div>
            </div>

            <ConfirmModal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleEmptyTrash}
                title="Empty Recycle Bin"
                message="Are you sure you want to permanently delete ALL records in the trash? This action cannot be undone."
                type="danger"
            />
        </div>
    );
}
