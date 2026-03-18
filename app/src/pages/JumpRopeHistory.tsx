import React from 'react';
import { History, ArrowLeft, Calendar, Zap, Timer, Activity, Loader2, Trash2, CheckCircle2, Circle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJumpRopeHistory, useDeleteJumpRopeSession, useDeleteMultipleJumpRopeSessions } from '../hooks/useData';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function JumpRopeHistoryPage() {
    const navigate = useNavigate();
    const { data: history, isLoading } = useJumpRopeHistory();
    const { mutate: deleteSession } = useDeleteJumpRopeSession();
    const { mutate: deleteMultiple } = useDeleteMultipleJumpRopeSessions();

    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = React.useState(false);
    const [showDeleteModal, setShowDeleteModal] = React.useState<{ show: boolean, id?: string, batch?: boolean }>({ show: false });

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleConfirmDelete = () => {
        console.log('handleConfirmDelete triggered', showDeleteModal);
        const loadingToast = toast.loading('Deleting...');
        
        if (showDeleteModal.batch) {
            if (selectedIds.length === 0) {
                toast.error('No sessions selected', { id: loadingToast });
                return;
            }
            console.log('Starting batch delete for:', selectedIds);
            deleteMultiple(selectedIds, {
                onSuccess: () => {
                    toast.success(`${selectedIds.length} sessions deleted`, { id: loadingToast });
                    setSelectedIds([]);
                    setIsSelectionMode(false);
                    setShowDeleteModal({ show: false });
                },
                onError: (err: any) => {
                    console.error('Batch delete error:', err);
                    toast.error(`Failed to delete sessions: ${err.message || 'Unknown error'}`, { id: loadingToast });
                }
            });
        } else if (showDeleteModal.id) {
            console.log('Starting single delete for:', showDeleteModal.id);
            deleteSession(showDeleteModal.id, {
                onSuccess: () => {
                    toast.success('Session deleted successfully', { id: loadingToast });
                    setShowDeleteModal({ show: false });
                },
                onError: (err: any) => {
                    console.error('Single delete error:', err);
                    toast.error(`Failed to delete session: ${err.message || 'Unknown error'}`, { id: loadingToast });
                }
            });
        } else {
            console.warn('handleConfirmDelete called but no ID or batch mode specified');
            toast.dismiss(loadingToast);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Retrieving History...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-2xl font-black tracking-tight leading-none" style={{ color: 'var(--color-text-base)' }}>Workout History</h2>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-none mt-1" style={{ color: 'var(--jr-text-low, #71717a)' }}>Past Sessions</p>
                </div>
                <div className="flex items-center gap-3">
                    {history && history.length > 0 && (
                        <button
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                setSelectedIds([]);
                            }}
                            className={`px-4 py-2.5 rounded-[1.2rem] text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${
                                isSelectionMode 
                                    ? 'bg-primary text-white border-primary shadow-[0_4_20_rgba(255,59,48,0.3)]' 
                                    : 'backdrop-blur-xl hover:border-white/20'
                            }`}
                            style={!isSelectionMode ? { background: 'var(--jr-surface, rgba(255,255,255,0.02))', color: 'var(--color-text-base)', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' } : {}}
                        >
                            {isSelectionMode ? 'Cancel' : 'Manage'}
                        </button>
                    )}
                    <div className="w-12 h-12 rounded-[1.2rem] flex items-center justify-center border shadow-[0_0_20px_rgba(0,0,0,0.1)]" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.05))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                        <History className="w-5 h-5 text-primary" />
                    </div>
                </div>
            </div>

            {/* Selection Toolbar */}
            {isSelectionMode && selectedIds.length > 0 && (
                <div className="fixed bottom-24 left-6 right-6 z-[60] p-4 rounded-[1.5rem] border backdrop-blur-3xl flex items-center justify-between shadow-[0_20_40_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-8 duration-500" style={{ background: 'var(--jr-surface, #0a0a0a)', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.2))' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
                            {selectedIds.length}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-base)' }}>Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (selectedIds.length === history?.length) setSelectedIds([]);
                                else setSelectedIds(history?.map(s => s.id) || []);
                            }}
                            className="text-[9px] font-black uppercase tracking-[0.1em] px-4 py-2 rounded-xl hover:bg-white/5 transition-colors"
                            style={{ color: 'var(--jr-text-low)' }}
                        >
                            {selectedIds.length === history?.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                            onClick={() => setShowDeleteModal({ show: true, batch: true })}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Trash2 size={12} />
                            <span className="text-[9px] font-black uppercase tracking-[0.1em]">Delete</span>
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-4">
                {history?.length === 0 ? (
                    <div className="p-16 text-center border-2 border-dashed rounded-[3rem] flex flex-col items-center gap-5 transition-all" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.01))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' }}>
                        <div className="w-20 h-20 rounded-full flex items-center justify-center border shadow-inner mb-2" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.02))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.05))' }}>
                            <History className="w-8 h-8 text-primary/40" />
                        </div>
                        <p className="font-black uppercase tracking-[0.2em] text-[10px]" style={{ color: 'var(--jr-text-low, #71717a)' }}>No sessions recorded yet.</p>
                        <button 
                            onClick={() => navigate('/jump-rope/training')}
                            className="mt-2 px-8 py-3.5 text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-[1.2rem] border bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                        >
                            Start Training
                        </button>
                    </div>
                ) : (
                    history?.map((session: any) => (
                        <div 
                            key={session.id} 
                            onClick={() => isSelectionMode && toggleSelect(session.id)}
                            className={`group relative overflow-hidden p-5 rounded-[2rem] border backdrop-blur-2xl transition-all duration-300 ${
                                isSelectionMode ? 'cursor-pointer active:scale-[0.98]' : ''
                            }`}
                            style={{ 
                                background: 'var(--jr-surface, rgba(10,10,10,0.8))', 
                                borderColor: selectedIds.includes(session.id) ? 'var(--color-primary)' : 'var(--jr-text-low, rgba(255,255,255,0.05))',
                                boxShadow: selectedIds.includes(session.id) ? '0 0 20px rgba(255,59,48,0.1)' : 'none'
                            }}
                        >
                            {/* Selection Overlay */}
                            {isSelectionMode && (
                                <div className="absolute top-4 left-4 z-20">
                                    {selectedIds.includes(session.id) ? (
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg animate-in zoom-in-50">
                                            <CheckCircle2 size={14} className="text-white" />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border-2 border-white/20" />
                                    )}
                                </div>
                            )}

                            <div className={`flex flex-col gap-5 ${isSelectionMode ? 'pl-8' : ''}`}>
                                {/* Top row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-[1.1rem] flex items-center justify-center border shadow-inner" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.03))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                                            <Calendar className="w-4 h-4 text-primary/60" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text-base)' }}>{format(new Date(session.created_at), 'EEEE')}</div>
                                            <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--jr-text-low, #71717a)' }}>{format(new Date(session.created_at), 'MMM dd, yyyy • hh:mm a')}</div>
                                        </div>
                                    </div>
                                    {!isSelectionMode && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDeleteModal({ show: true, id: session.id });
                                            }}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                            style={{ color: 'var(--jr-text-low)' }}
                                        >
                                            <Trash2 size={14} className="hover:text-red-500" />
                                        </button>
                                    )}
                                </div>

                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-colors" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.01))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.03))' }}>
                                        <Activity size={12} className="text-primary/40" />
                                        <span className="text-base font-black tabular-nums" style={{ color: 'var(--color-text-base)' }}>{session.jumps}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.2))' }}>Jumps</span>
                                    </div>
                                    <div className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-colors" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.01))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.03))' }}>
                                        <Zap size={12} className="text-orange-500/40" />
                                        <span className="text-base font-black tabular-nums" style={{ color: 'var(--color-text-base)' }}>{session.rpm || 0}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.2))' }}>Avg RPM</span>
                                    </div>
                                    <div className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-colors" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.01))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.03))' }}>
                                        <Timer size={12} className="text-blue-500/40" />
                                        <span className="text-base font-black tabular-nums" style={{ color: 'var(--color-text-base)' }}>{(session.duration / 60).toFixed(1)}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: 'var(--jr-text-low, rgba(255,255,255,0.2))' }}>Mins</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Deletion Dialog */}
            {showDeleteModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteModal({ show: false })} />
                    <div className="border w-full max-w-xs rounded-[2.5rem] p-8 relative z-10 shadow-[0_32_64_-12_rgba(0,0,0,0.5)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" style={{ background: 'var(--jr-bg, #0a0a0a)', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                        <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 mx-auto">
                            <Trash2 className="text-red-500 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-center mb-2" style={{ color: 'var(--color-text-base)' }}>Delete Session?</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/40 text-center mb-8 leading-relaxed px-4">
                            {showDeleteModal.batch 
                                ? `Are you sure you want to delete ${selectedIds.length} sessions? this cannot be undone.`
                                : "Are you sure you want to delete this session? this cannot be undone."
                            }
                        </p>
                        
                        <div className="space-y-3">
                            <button
                                onClick={handleConfirmDelete}
                                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all shadow-[0_8_32_rgba(239,68,68,0.2)] active:scale-95"
                            >
                                Delete Permanently
                            </button>
                            <button
                                onClick={() => setShowDeleteModal({ show: false })}
                                className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all active:scale-95 border"
                                style={{ background: 'var(--jr-surface, rgba(255,255,255,0.03))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))', color: 'var(--color-text-base)' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
