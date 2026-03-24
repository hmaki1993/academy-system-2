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

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBatchDelete = () => {
        if (selectedIds.length === 0) {
            toast.error('No sessions selected');
            return;
        }
        const loadingToast = toast.loading('Deleting sessions...');
        deleteMultiple(selectedIds, {
            onSuccess: () => {
                toast.success(`${selectedIds.length} sessions deleted`, { id: loadingToast });
                setSelectedIds([]);
                setIsSelectionMode(false);
            },
            onError: (err: any) => {
                toast.error(`Failed to delete: ${err.message || 'Unknown error'}`, { id: loadingToast });
            }
        });
    };

    const handleSingleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const loadingToast = toast.loading('Deleting session...');
        deleteSession(id, {
            onSuccess: () => {
                toast.success('Session deleted', { id: loadingToast });
            },
            onError: (err: any) => {
                toast.error(`Failed to delete: ${err.message || 'Unknown error'}`, { id: loadingToast });
            }
        });
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
                <div 
                    className="w-full relative z-[70] p-2 pl-4 rounded-[1.75rem] border flex items-center justify-between shadow-[0_20px_40px_-5px_rgba(0,0,0,0.6)] animate-in slide-in-from-top-4 fade-in duration-300" 
                    style={{ 
                        background: 'rgba(5, 5, 8, 0.95)', 
                        backdropFilter: 'blur(40px) saturate(200%)',
                        borderColor: 'rgba(255,255,255,0.15)',
                        borderTopColor: 'rgba(255,255,255,0.25)' 
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-inner" style={{ background: 'var(--color-primary, #0ea5e9)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                            {selectedIds.length}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (selectedIds.length === history?.length) setSelectedIds([]);
                                else setSelectedIds(history?.map((s: any) => s.id) || []);
                            }}
                            className="text-[9px] font-black uppercase tracking-[0.1em] px-4 py-2.5 rounded-[1.2rem] transition-colors border"
                            style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                borderColor: 'rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.6)' 
                            }}
                        >
                            {selectedIds.length === history?.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                            onClick={handleBatchDelete}
                            className="text-white border px-4 py-2.5 rounded-[1.2rem] flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                borderColor: '#ef4444',
                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                            }}
                        >
                            <Trash2 size={12} className="opacity-90" />
                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white">Delete</span>
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
                            className={`group relative overflow-hidden p-4 rounded-[1.5rem] border backdrop-blur-2xl transition-all duration-300 ${
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
                                <div className="absolute top-1/2 -translate-y-1/2 left-4 z-20">
                                    {selectedIds.includes(session.id) ? (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg animate-in zoom-in-50">
                                            <CheckCircle2 size={12} className="text-white" />
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-white/20" />
                                    )}
                                </div>
                            )}

                            <div className={`flex flex-col gap-3 ${isSelectionMode ? 'pl-8' : ''}`}>
                                {/* Top row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-[0.8rem] flex items-center justify-center border shadow-inner" style={{ background: 'var(--jr-surface, rgba(255,255,255,0.03))', borderColor: 'var(--jr-text-low, rgba(255,255,255,0.1))' }}>
                                            <Calendar className="w-3.5 h-3.5 text-primary/60" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black tracking-tight leading-none mb-1" style={{ color: 'var(--color-text-base)' }}>{format(new Date(session.created_at), 'EEEE')}</div>
                                            <div className="text-[8px] font-black uppercase tracking-widest leading-none" style={{ color: 'var(--jr-text-low, #71717a)' }}>{format(new Date(session.created_at), 'MMM dd, yyyy • hh:mm a')}</div>
                                        </div>
                                    </div>
                                    {!isSelectionMode && (
                                        <button
                                            onClick={(e) => handleSingleDelete(session.id, e)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-end transition-all opacity-0 group-hover:opacity-100"
                                            style={{ color: 'var(--jr-text-low)' }}
                                        >
                                            <Trash2 size={14} className="hover:text-red-500" />
                                        </button>
                                    )}
                                </div>

                                {/* Stats row - Optimized to fit on a single row without scrolling */}
                                <div className="grid grid-cols-3 gap-2 ml-[2.75rem]">
                                    <div className="flex items-center gap-1.5 bg-white/[0.03] px-2 py-1.5 rounded-xl border border-white/[0.03] min-w-0">
                                        <Activity size={10} className="text-primary/60 shrink-0" />
                                        <div className="flex flex-col leading-none">
                                            <span className="text-xs font-black tabular-nums text-white truncate">{session.jumps}</span>
                                            <span className="text-[6px] font-black uppercase tracking-tight text-white/30 truncate">Jumps</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 bg-white/[0.03] px-2 py-1.5 rounded-xl border border-white/[0.03] min-w-0">
                                        <Zap size={10} className="text-orange-500/60 shrink-0" />
                                        <div className="flex flex-col leading-none">
                                            <span className="text-xs font-black tabular-nums text-white truncate">{session.rpm || 0}</span>
                                            <span className="text-[6px] font-black uppercase tracking-tight text-white/30 truncate">RPM</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 bg-white/[0.03] px-2 py-1.5 rounded-xl border border-white/[0.03] min-w-0">
                                        <Timer size={10} className="text-blue-500/60 shrink-0" />
                                        <div className="flex flex-col leading-none">
                                            <span className="text-xs font-black tabular-nums text-white truncate">{(session.duration / 60).toFixed(1)}</span>
                                            <span className="text-[6px] font-black uppercase tracking-tight text-white/30 truncate">Mins</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
