import React, { useState, useEffect } from 'react';
import { Play, Search, Filter, Lock, Clock, CheckCircle2, Star, Plus, Loader2, X, Trash2, Maximize2, CheckSquare, Check, PenSquare, ShieldAlert, Sparkles, CreditCard, DollarSign } from 'lucide-react';
import { useTrainingVideos, useLevelAccess, useLevelCosts } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';
import AddVideoModal from './components/AddVideoModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import LevelPurchaseModal from './components/LevelPurchaseModal';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import PageHeader from '../../components/PageHeader';

function Thumbnail({ url }: { url?: string }) {
    const [hasError, setHasError] = useState(false);
    if (!url || url.includes('unsplash.com') || hasError) return null;
    return (
        <img 
            src={url} 
            alt="" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => setHasError(true)}
        />
    );
}

export default function VideoLibrary() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<string | number>('1');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [videoToEdit, setVideoToEdit] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [studentData, setStudentData] = useState<any>(null);
    const [userLevel, setUserLevel] = useState<number>(1);
    const [activeVideo, setActiveVideo] = useState<any>(null);
    const [videoToDelete, setVideoToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { settings } = useTheme();

    // Purchase Flow
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [levelToUnlock, setLevelToUnlock] = useState<number | null>(null);

    const { data: purchasedLevels = [], refetch: refetchAccess } = useLevelAccess(studentId || undefined);
    const { data: levelCosts = [] } = useLevelCosts();

    // Batch Selection Mode
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const { data: videos, isLoading, refetch } = useTrainingVideos(selectedLevel);

    useEffect(() => {
        const initUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Profile Role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            
            if (profile) {
                setUserRole(profile.role);
                const isAdmin = profile.role === 'admin' || profile.role === 'coach' || profile.role === 'head_coach';
                
                // 2. Get Student details if NOT admin
                if (!isAdmin) {
                    // Try by profile_id first
                    let { data: student } = await supabase
                        .from('students')
                        .select('id, full_name, email, current_training_level')
                        .eq('profile_id', user.id)
                        .maybeSingle();
                    
                    // Fallback to email if not found (for old/manual records)
                    if (!student) {
                        const { data: byEmail } = await supabase
                            .from('students')
                            .select('id, full_name, email, current_training_level')
                            .eq('email', user.email)
                            .maybeSingle();
                        student = byEmail;
                    }

                    if (student) {
                        setStudentId(student.id);
                        setStudentData(student);
                        setUserLevel(student.current_training_level);
                        // Default to their current level, which triggers the blur if not purchased
                        setSelectedLevel(student.current_training_level || 1);
                    }
                }
            }
        };

        initUser();
    }, []);

    // Debugging
    useEffect(() => {
        if (isPurchaseModalOpen) {
            console.log('Purchase Modal Request:', { studentId, levelToUnlock, studentData });
        }
    }, [isPurchaseModalOpen, studentId, levelToUnlock, studentData]);

    const isInternal = userRole === 'admin' || userRole === 'coach' || userRole === 'head_coach';
    
    // Students can see all levels, but they might be locked
    const availableLevels = settings.training_levels || [1, 2, 3, 4, 5, 6, 7, 8];
    const levels = isInternal ? ['all', ...availableLevels] : availableLevels;

    // Check if a level is locked for the current student
    const isLevelLocked = (lvl: string | number) => {
        if (isInternal) return false;
        if (lvl === 'all') return false;
        const levelNum = Number(lvl);
        // Level is locked if it's not in the purchasedLevels array (which is an array of objects from Supabase)
        return !purchasedLevels.some((p: any) => p.level_number === levelNum);
    };

    const handleLevelSelect = (lvl: string | number) => {
        setSelectedLevel(lvl);
    };

    const filteredVideos = (videos || []).filter(video => {
        const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (video.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
        return matchesSearch;
    });

    const toggleSelection = (id: string) => {
        const next = new Set(selectedVideoIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedVideoIds(next);
    };

    const handleDelete = async () => {
        if (!videoToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('training_videos').delete().eq('id', videoToDelete.id);
            if (error) throw error;
            toast.success(t('videoLibrary.deleteSuccess'));
            setVideoToDelete(null);
            refetch();
        } catch (err: any) {
            toast.error(t('videoLibrary.deleteError') + ': ' + err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedVideoIds.size === 0) return;
        setIsBatchDeleting(true);
        try {
            const { error } = await supabase
                .from('training_videos')
                .delete()
                .in('id', Array.from(selectedVideoIds));
            
            if (error) throw error;

            toast.success(`Successfully deleted ${selectedVideoIds.size} videos!`);
            setSelectedVideoIds(new Set());
            setIsSelectionMode(false);
            refetch();
        } catch (err: any) {
            console.error('Batch Delete Error:', err);
            toast.error(err.message || 'Error deleting videos');
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const currentLevelCost = levelCosts.find(c => Number(c.level_number) === Number(levelToUnlock))?.price || 15.000;

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <AddVideoModal 
                isOpen={isAddModalOpen || !!videoToEdit} 
                onClose={() => {
                    setIsAddModalOpen(false);
                    setVideoToEdit(null);
                }} 
                onSuccess={() => refetch()} 
                videoToEdit={videoToEdit}
            />

            <DeleteConfirmModal 
                isOpen={!!videoToDelete}
                onClose={() => setVideoToDelete(null)}
                onConfirm={handleDelete}
                isLoading={isDeleting}
                title={t('videoLibrary.deleteConfirmTitle')}
                description={t('videoLibrary.deleteConfirmDesc')}
            />

            {studentId && levelToUnlock && (
                <LevelPurchaseModal 
                    isOpen={isPurchaseModalOpen}
                    onClose={() => setIsPurchaseModalOpen(false)}
                    level={levelToUnlock}
                    price={currentLevelCost}
                    studentId={studentId}
                    onSuccess={() => {
                        refetchAccess();
                        setSelectedLevel(levelToUnlock);
                    }}
                />
            )}

            {/* Video Player Modal */}
            {activeVideo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setActiveVideo(null)} />
                    <div className="relative w-full max-w-6xl aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 group">
                        <video src={activeVideo.video_url} controls autoPlay className="w-full h-full object-contain" />
                        <button onClick={() => setActiveVideo(null)} className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-xl">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            )}

            {/* Minimalist Header */}
            <PageHeader 
                title={t('videoLibrary.title')}
                subtitle={t('videoLibrary.subtitle')}
                titleSuffix={!isInternal && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/5 border border-green-500/10">
                        <div className="w-1 h-1 rounded-full bg-green-500" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-green-500/60">{t('videoLibrary.eliteAccess')}</span>
                    </div>
                )}
            >
                {isInternal && (
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                if (isSelectionMode) setSelectedVideoIds(new Set());
                            }}
                            className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2 ${
                                isSelectionMode 
                                ? 'bg-amber-500 text-black' 
                                : 'bg-white/5 text-white/40 border border-white/5'
                            }`}
                        >
                            <CheckSquare size={14} />
                            {isSelectionMode ? t('videoLibrary.exit') : t('videoLibrary.select')}
                        </button>
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2.5 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            {t('videoLibrary.addVideo')}
                        </button>
                    </div>
                )}
            </PageHeader>

            {/* Minimalist Level Filters */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-2 px-2">
                {levels.map((lvl) => {
                    const locked = isLevelLocked(lvl);
                    const selected = selectedLevel === lvl;
                    return (
                        <button
                            key={String(lvl)}
                            onClick={() => handleLevelSelect(lvl)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                                selected 
                                ? 'bg-white text-black border-white shadow-lg' 
                                : locked
                                    ? 'bg-transparent text-white/20 border-white/5'
                                    : 'bg-transparent text-white/40 border-white/10 hover:border-white/30'
                            }`}
                        >
                            {lvl === 'all' ? t('common.all') : `L${lvl}`}
                        </button>
                    );
                })}
            </div>

            <div className="relative mt-8">
                {/* Unified Glass Paywall Overlay - Perfectly Centered Mode */}
                {!isInternal && isLevelLocked(selectedLevel) && (
                    <div className="absolute inset-x-[-1.5rem] top-0 bottom-[-10rem] z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-3xl animate-in fade-in duration-700 overflow-hidden">
                        {/* Premium Top Reflection Line */}
                        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
                        
                        {!isPurchaseModalOpen && (
                            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
                                <div className="flex items-center justify-center opacity-80">
                                    <Lock size={28} className="text-primary animate-pulse" />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic text-white/95 leading-none">{t('videoLibrary.exclusiveAccess')}</h2>
                                    <p className="text-[10px] md:text-[11px] text-white/30 font-bold uppercase tracking-[0.3em] leading-relaxed max-w-[280px] mx-auto">
                                        {t('videoLibrary.unlockLevel', { level: selectedLevel })}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => {
                                        console.log('Unlock Clicked for Level:', selectedLevel);
                                        setLevelToUnlock(Number(selectedLevel === 'all' ? 1 : selectedLevel));
                                        setIsPurchaseModalOpen(true);
                                    }}
                                    className="bg-primary px-10 py-4 rounded-3xl font-black uppercase tracking-[0.25em] text-[9px] shadow-[0_15px_40px_rgba(110,89,255,0.3)] hover:scale-105 active:scale-95 transition-all text-white flex items-center gap-3 pointer-events-auto"
                                >
                                    <CreditCard size={14} />
                                    {t('videoLibrary.unlockNow')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 min-h-[400px] items-start">

                    {isLoading ? (
                        Array(12).fill(0).map((_, i) => (
                            <div key={i} className="aspect-video bg-white/5 rounded-2xl border border-white/5 animate-pulse" />
                        ))
                    ) : (
                        filteredVideos.map((video, index) => {
                            const isLocked = isLevelLocked(video.level_number || 1);

                            return (
                                <div 
                                    key={video.id}
                                    onClick={() => {
                                        if (isSelectionMode) {
                                            toggleSelection(video.id);
                                            return;
                                        }
                                        if (isLocked) {
                                            setLevelToUnlock(Number(video.level_number || 1));
                                            setIsPurchaseModalOpen(true);
                                            return;
                                        }
                                        setActiveVideo(video);
                                    }}
                                    className={`group relative bg-transparent backdrop-blur-2xl border rounded-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 fill-mode-both cursor-pointer h-fit ${
                                        isSelectionMode && selectedVideoIds.has(video.id)
                                        ? 'border-primary ring-2 ring-primary/20 scale-[0.98]'
                                        : isLocked 
                                            ? 'border-white/5 opacity-80' 
                                            : 'border-white/10 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5'
                                    }`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="relative aspect-video overflow-hidden bg-black flex items-center justify-center">
                                        <Thumbnail url={video.thumbnail_url} />

                                        {!isSelectionMode && !isLocked && (
                                            <video 
                                                src={video.video_url}
                                                muted loop playsInline
                                                preload="metadata"
                                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
                                                    video.thumbnail_url && !video.thumbnail_url.includes('unsplash.com') 
                                                    ? 'opacity-0 group-hover:opacity-100' 
                                                    : 'opacity-100'
                                                }`}
                                                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                                onMouseLeave={(e) => {
                                                    const v = e.target as HTMLVideoElement;
                                                    v.pause();
                                                    v.currentTime = 0;
                                                }}
                                            />
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        
                                        {isLocked && !isSelectionMode && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all group-hover:bg-black/60">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-2xl scale-110">
                                                    <Lock size={16} className="text-primary" />
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-primary mt-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">{t('videoLibrary.lockedContent')}</span>
                                            </div>
                                        )}

                                        {isSelectionMode && (
                                            <div className="absolute top-3 left-3 z-20">
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                    selectedVideoIds.has(video.id) 
                                                    ? 'bg-primary border-primary scale-110 shadow-lg shadow-primary/20' 
                                                    : 'bg-black/40 border-white/20 backdrop-blur-md'
                                                }`}>
                                                    {selectedVideoIds.has(video.id) && <Check size={14} className="text-white" strokeWidth={3} />}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-2.5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="px-2 py-0.5 bg-primary/10 rounded text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">LVL {video.level_number || 1}</span>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-white/60">
                                                <Clock size={10} className="text-primary" />
                                                <span>{video.duration || '07:45'}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-black mb-0.5 line-clamp-1">{video.title}</h3>
                                        <p className="text-[10px] text-white/40 line-clamp-2">{video.description || t('videoLibrary.noDescription')}</p>
                                        
                                        {isInternal && !isSelectionMode && (
                                            <div className="flex items-center justify-center pt-2 border-t border-white/5 mt-2">
                                                <div className="flex items-center gap-4">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setVideoToEdit(video);
                                                        }}
                                                        className="p-1 hover:text-primary transition-all"
                                                    >
                                                        <PenSquare size={16} className="text-white/40 hover:text-white" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setVideoToDelete(video);
                                                        }}
                                                        className="p-1 hover:scale-110 transition-all"
                                                    >
                                                        <Trash2 size={16} className="text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Empty State */}
            {!isLoading && filteredVideos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <FilmIcon className="w-8 h-8 text-white/10" />
                    </div>
                    <h3 className="text-lg font-black text-white/40 uppercase tracking-tighter">{t('videoLibrary.emptyTitle')}</h3>
                </div>
            )}

            {/* Batch Action Bar */}
            {isSelectionMode && selectedVideoIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-[#111] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 pl-10 flex items-center gap-10 shadow-2xl shadow-black">
                        <div>
                            <span className="text-xs font-black text-white/40 uppercase tracking-widest block mb-1">{t('videoLibrary.selections')}</span>
                            <span className="text-primary text-2xl font-black">{selectedVideoIds.size}</span>
                        </div>
                        <div className="h-10 w-px bg-white/5" />
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleBatchDelete}
                                disabled={isBatchDeleting}
                                className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-red-500/20"
                            >
                                {isBatchDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
                                {t('videoLibrary.deleteSelection')}
                            </button>
                            <button 
                                onClick={() => {
                                    setIsSelectionMode(false);
                                    setSelectedVideoIds(new Set());
                                }}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-white/5"
                            >
                                {t('videoLibrary.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modals */}
            {isAddModalOpen && (
                <AddVideoModal 
                    isOpen={isAddModalOpen} 
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setVideoToEdit(null);
                    }} 
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        setVideoToEdit(null);
                        refetch();
                    }}
                    videoToEdit={videoToEdit}
                />
            )}

            {videoToDelete && (
                <DeleteConfirmModal 
                    isOpen={!!videoToDelete}
                    onClose={() => setVideoToDelete(null)}
                    onConfirm={async () => {
                        if (!videoToDelete) return;
                        setIsDeleting(true);
                        try {
                            const { error } = await supabase.from('training_videos').delete().eq('id', videoToDelete.id);
                            if (error) throw error;
                            toast.success('Video deleted!');
                            refetch();
                        } catch (err: any) {
                            toast.error('Failed to delete: ' + err.message);
                        } finally {
                            setIsDeleting(false);
                            setVideoToDelete(null);
                        }
                    }}
                    title={videoToDelete?.title || ''}
                    description={t('videoLibrary.deleteConfirmDesc')}
                    isLoading={isDeleting}
                />
            )}

            {isPurchaseModalOpen && (
                <LevelPurchaseModal 
                    isOpen={isPurchaseModalOpen}
                    onClose={() => setIsPurchaseModalOpen(false)}
                    level={levelToUnlock || (typeof selectedLevel === 'number' ? selectedLevel : 1)}
                    price={levelCosts.find(c => c.level_number === (levelToUnlock || (typeof selectedLevel === 'number' ? selectedLevel : 1)))?.price || 15.00}
                    studentId={studentId || ''}
                    studentData={studentData}
                    onSuccess={() => {
                        setIsPurchaseModalOpen(false);
                        refetchAccess();
                        toast.success(t('videoLibrary.accessUnlocked'));
                        setTimeout(() => window.location.reload(), 1500);
                    }}
                />
            )}
        </div>
    );
}

function FilmIcon(props: any) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m7 3 3 18" />
      <path d="m14 3 3 18" />
      <path d="M3 7h18" />
      <path d="M3 12h18" />
      <path d="M3 17h18" />
    </svg>
  );
}
