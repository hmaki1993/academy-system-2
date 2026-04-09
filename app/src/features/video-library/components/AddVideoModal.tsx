import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Film as FilmIcon, FileText, CheckCircle2, Loader2, AlertCircle, Image as ImageIcon, Plus as PlusIcon, Scissors, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import ManualCropper from './ManualCropper';
import { getCroppedImg } from '../../../utils/imageUtils';

interface AddVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    videoToEdit?: any; // Optional video to edit
}

export default function AddVideoModal({ isOpen, onClose, onSuccess, videoToEdit }: AddVideoModalProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(String(1)); // Default to level 1
    const { settings } = useTheme();
    const [isPremium, setIsPremium] = useState(false);
    const [videoFiles, setVideoFiles] = useState<File[]>([]);
    const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [originalThumbnailFile, setOriginalThumbnailFile] = useState<File | null>(null);
    const [specificThumbnails, setSpecificThumbnails] = useState<{[key: number]: File}>({});
    const [cropRatio, setCropRatio] = useState<number | null>(1.8);
    const [specificTitles, setSpecificTitles] = useState<{[key: number]: string}>({});
    const [specificDescriptions, setSpecificDescriptions] = useState<{[key: number]: string}>({});
    const [specificDurations, setSpecificDurations] = useState<{[key: number]: string}>({});
    const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null);

    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [cropperSrc, setCropperSrc] = useState<string | null>(null);

    // Initial State sync for Editing
    React.useEffect(() => {
        if (isOpen && videoToEdit) {
            setTitle(videoToEdit.title || '');
            setDescription(videoToEdit.description || '');
            setCategory(String(videoToEdit.level_number || 1));
            setIsPremium(videoToEdit.is_premium || false);
            setVideoFiles([]); // Clear any staging files
        } else if (isOpen && !videoToEdit) {
            // Reset for Add mode
            setTitle('');
            setDescription('');
            setCategory(String(1));
            setIsPremium(false);
            setVideoFiles([]);
        }
    }, [isOpen, videoToEdit]);

    const getVideoDuration = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                const minutes = Math.floor(video.duration / 60);
                const seconds = Math.floor(video.duration % 60);
                resolve(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            };
            video.src = URL.createObjectURL(file);
        });
    };

    // Sync previews and calculate durations
    React.useEffect(() => {
        const loadDurations = async () => {
            const newPreviews = videoFiles.map(file => URL.createObjectURL(file));
            setVideoPreviews(newPreviews);

            for (let i = 0; i < videoFiles.length; i++) {
                if (!specificDurations[i]) {
                    const duration = await getVideoDuration(videoFiles[i]);
                    setSpecificDurations(prev => ({ ...prev, [i]: duration }));
                }
            }
        };

        loadDurations();

        return () => {
            videoPreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [videoFiles]);

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const currentCount = videoFiles.length;
            setVideoFiles(prev => [...prev, ...files]);
            
            setSpecificTitles(prev => {
                const next = { ...prev };
                files.forEach((f, i) => {
                    next[currentCount + i] = f.name.split('.')[0];
                });
                return next;
            });

            if (!title && files.length === 1 && videoFiles.length === 0) {
                setTitle(files[0].name.split('.')[0]);
            }
        }
    };

    const handleFileChange = handleVideoSelect;

    const handleSpecificThumbnailChange = (index: number, file: File) => {
        setSpecificThumbnails(prev => ({ ...prev, [index]: file }));
    };

    const removeFile = (index: number) => {
        const newFiles = videoFiles.filter((_, i) => i !== index);
        setVideoFiles(newFiles);
        const cleanupMap = (prev: any) => {
            const next = { ...prev };
            delete next[index];
            const reindexed: any = {};
            Object.keys(next).forEach((key) => {
                const k = parseInt(key);
                if (k > index) reindexed[k - 1] = next[k];
                else reindexed[k] = next[k];
            });
            return reindexed;
        };
        setSpecificThumbnails(prev => cleanupMap(prev));
        setSpecificTitles(prev => cleanupMap(prev));
        setSpecificDescriptions(prev => cleanupMap(prev));
        setSpecificDurations(prev => cleanupMap(prev));
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoToEdit && videoFiles.length === 0) {
            toast.error(t('videoLibrary.uploadError'));
            return;
        }
        setIsLoading(true);
        try {
            if (videoToEdit) {
                let currentThumbnailUrl = videoToEdit.thumbnail_url;
                if (thumbnailFile) {
                    const thumbExt = thumbnailFile.name.split('.').pop();
                    const thumbPath = `thumbnails/edit_${Date.now()}.${thumbExt}`;
                    const { error: thumbError } = await supabase.storage.from('videos').upload(thumbPath, thumbnailFile);
                    if (!thumbError) {
                        const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(thumbPath);
                        currentThumbnailUrl = publicUrl;
                    }
                }
                let currentVideoUrl = videoToEdit.video_url;
                if (videoFiles.length > 0) {
                    const file = videoFiles[0];
                    const videoExt = file.name.split('.').pop();
                    const videoPath = `training/edit_${Date.now()}.${videoExt}`;
                    await supabase.storage.from('videos').upload(videoPath, file);
                    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(videoPath);
                    currentVideoUrl = publicUrl;
                }
                await supabase.from('training_videos').update({
                    title, description, level_number: parseInt(category),
                    is_premium: isPremium, thumbnail_url: currentThumbnailUrl,
                    video_url: currentVideoUrl, duration: specificDurations[0] || videoToEdit.duration || '00:00'
                }).eq('id', videoToEdit.id);
            } else {
                setUploadProgress({ current: 0, total: videoFiles.length });
                let globalThumbnailUrl = '';
                if (thumbnailFile) {
                    const thumbExt = thumbnailFile.name.split('.').pop();
                    const { error: thumbError } = await supabase.storage.from('videos').upload(`thumbnails/global_${Date.now()}.${thumbExt}`, thumbnailFile);
                    if (!thumbError) {
                        const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(`thumbnails/global_${Date.now()}.${thumbExt}`);
                        globalThumbnailUrl = publicUrl;
                    }
                }
                for (let i = 0; i < videoFiles.length; i++) {
                    const file = videoFiles[i];
                    setUploadProgress({ current: i + 1, total: videoFiles.length });
                    let currentThumbnailUrl = globalThumbnailUrl;
                    if (specificThumbnails[i]) {
                        const { error: sThumbError } = await supabase.storage.from('videos').upload(`thumbnails/specific_${Date.now()}_${i}.jpg`, specificThumbnails[i]);
                        if (!sThumbError) {
                            const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(`thumbnails/specific_${Date.now()}_${i}.jpg`);
                            currentThumbnailUrl = publicUrl;
                        }
                    }
                    const videoPath = `training/${Date.now()}_${i}.mp4`;
                    await supabase.storage.from('videos').upload(videoPath, file);
                    const { data: { publicUrl: videoUrl } } = supabase.storage.from('videos').getPublicUrl(videoPath);
                    await supabase.from('training_videos').insert([{
                        title: specificTitles[i] || title,
                        description: specificDescriptions[i] || description,
                        video_url: videoUrl,
                        thumbnail_url: currentThumbnailUrl || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=60',
                        level_number: parseInt(category) || 1,
                        is_premium: isPremium,
                        duration: specificDurations[i] || '00:00'
                    }]);
                }
            }
            onSuccess();
            onClose();
            resetState();
            toast.success('Successfully processed!');
        } catch (err: any) {
            toast.error(err.message || 'Processing error');
        } finally {
            setIsLoading(false);
            setUploadProgress(null);
        }
    };

    const resetState = () => {
        setTitle(''); setDescription(''); setVideoFiles([]); setSpecificThumbnails({});
        setSpecificTitles({}); setSpecificDescriptions({}); setSpecificDurations({});
        setThumbnailFile(null); setOriginalThumbnailFile(null); setUploadProgress(null);
        setIsCropping(false); setCropperSrc(null);
    };

    const onCropComplete = (pixels: any) => setCroppedAreaPixels(pixels);

    const handleApplyCrop = async () => {
        if (!cropperSrc || !croppedAreaPixels) return;
        try {
            const croppedBlob = await getCroppedImg(cropperSrc, croppedAreaPixels, 0);
            if (croppedBlob) {
                setThumbnailFile(new File([croppedBlob], 'cropped.jpg', { type: 'image/jpeg' }));
                setIsCropping(false);
                toast.success('Applied!');
            }
        } catch (e) { console.error(e); }
    };

    const handleOpenCropper = (file: File | string) => {
        setCropperSrc(typeof file === 'string' ? file : URL.createObjectURL(file));
        setIsCropping(true);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#050505] lg:bg-[#030303]/95 backdrop-blur-3xl overflow-y-auto no-scrollbar animate-in fade-in duration-500 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            {/* Background Mesh Gradients */}
            <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-red-500/[0.02] rounded-full blur-[120px] translate-y-1/4 -translate-x-1/4 pointer-events-none" />

            <div className="relative w-full min-h-screen flex flex-col items-center">
                {/* Immersive Responsive Header */}
                <div className="sticky top-0 w-full z-[100] bg-[#050505]/80 backdrop-blur-3xl border-b border-white/5 py-2 lg:py-4 px-4 lg:px-12 flex justify-center">
                    <div className="w-full max-w-6xl flex items-center justify-between">
                        <div className="flex items-center gap-3 lg:gap-4">
                            <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center shadow-2xl">
                                {isLoading ? <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 text-primary animate-spin" /> : <FilmIcon className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />}
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-xs lg:text-xl font-black text-white tracking-tight uppercase leading-tight">
                                    {isLoading && uploadProgress 
                                        ? `Uploading ${uploadProgress.current}/${uploadProgress.total}` 
                                        : videoToEdit ? 'Edit Training Session' : t('videoLibrary.title')}
                                </h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="w-4 lg:w-6 h-[1.5px] bg-red-500/60" />
                                    <span className="text-[7px] lg:text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">{t('videoLibrary.subtitle')}</span>
                                </div>
                            </div>
                        </div>

                        {!isLoading && (
                            <button 
                                onClick={onClose}
                                className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95 group"
                            >
                                <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="w-full max-w-5xl flex-1 flex flex-col justify-center px-6 lg:px-0 py-8 lg:py-16">
                    <form onSubmit={handleUpload} className="space-y-8 lg:space-y-12 animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16 items-start">
                            {/* Left Side: Primary Information (2/3) */}
                            <div className="lg:col-span-2 space-y-8">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-3 block ml-1 tracking-tight">Session Title</label>
                                    <input 
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-5 text-sm lg:text-base text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/30 transition-all font-bold"
                                        placeholder="Enter title..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-3 block ml-1 tracking-tight">Description</label>
                                    <textarea 
                                        rows={6}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-4 px-6 text-sm lg:text-base text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/30 transition-all resize-none font-medium"
                                        placeholder="Enter training details..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-3 block ml-1 tracking-tight">Select Level</label>
                                    <div className="flex gap-2 lg:gap-3 flex-wrap">
                                        {[1, 2, 3, 4, 5, 6].map((lvl) => (
                                            <button
                                                key={lvl}
                                                type="button"
                                                onClick={() => setCategory(String(lvl))}
                                                className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl text-xs lg:text-sm font-bold transition-all border ${
                                                    category === String(lvl)
                                                    ? 'bg-orange-600 text-white border-orange-500 shadow-lg scale-105' 
                                                    : 'bg-slate-900/50 text-gray-500 border-slate-800 hover:bg-slate-800/50 hover:text-gray-300'
                                                }`}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Media Portal (1/3) */}
                            <div className="lg:col-span-1 space-y-8 lg:space-y-10">
                                {/* Video Import Zone */}
                                <div className="w-fit">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-3 block ml-1 tracking-tight">Training Video</label>
                                    <label className="flex flex-row items-center justify-between px-4 lg:px-6 w-fit h-14 lg:h-16 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-xl lg:rounded-2xl cursor-pointer hover:bg-slate-800/50 hover:border-slate-700 transition-all group overflow-hidden relative min-w-[3.5rem] lg:min-w-[4rem]">
                                        <input type="file" multiple accept="video/*" onChange={handleFileChange} className="hidden" />
                                        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                                            <Upload size={14} className="text-gray-500 group-hover:text-gray-300" />
                                        </div>
                                    </label>
                                </div>

                                {/* Cover Identity Zone */}
                                <div className="w-fit">
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-3 block ml-1 tracking-tight">Global Cover</label>
                                    <div className="relative group w-fit">
                                        <div 
                                            onClick={() => {
                                                const source = originalThumbnailFile || videoToEdit?.thumbnail_url;
                                                if (source) handleOpenCropper(source);
                                                else if (thumbnailFile) handleOpenCropper(thumbnailFile);
                                                else document.getElementById('global-thumb-input')?.click();
                                            }}
                                            className="flex flex-row items-center justify-between px-4 lg:px-6 w-fit h-14 lg:h-16 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-xl lg:rounded-2xl cursor-pointer hover:bg-slate-800/50 hover:border-slate-700 transition-all overflow-hidden relative min-w-[7rem] lg:min-w-[8rem] gap-4"
                                        >
                                            <input id="global-thumb-input" type="file" accept="image/*" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setOriginalThumbnailFile(file);
                                                    setThumbnailFile(file);
                                                    handleOpenCropper(file);
                                                }
                                            }} className="hidden" />
                                            
                                            {(thumbnailFile || videoToEdit?.thumbnail_url) && (
                                                <img src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : videoToEdit.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-20 transition-opacity" />
                                            )}

                                            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors z-10">
                                                {thumbnailFile || videoToEdit?.thumbnail_url ? (
                                                    <Scissors size={14} className="text-orange-500" />
                                                ) : (
                                                    <ImageIcon size={14} className="text-gray-500 group-hover:text-gray-300" />
                                                )}
                                            </div>

                                            <div className="w-10 h-10 lg:w-16 lg:h-10 rounded lg:rounded-lg overflow-hidden border border-slate-800 bg-black/60 z-10">
                                                {(thumbnailFile || videoToEdit?.thumbnail_url) && (
                                                    <img src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : videoToEdit.thumbnail_url} className="w-full h-full object-cover animate-in fade-in" />
                                                )}
                                            </div>
                                        </div>

                                        {(thumbnailFile || videoToEdit?.thumbnail_url) && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setThumbnailFile(null);
                                                    setOriginalThumbnailFile(null);
                                                    if (videoToEdit) videoToEdit.thumbnail_url = null;
                                                }}
                                                className="absolute -top-1 -right-1 w-5 h-5 lg:w-6 lg:h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-20 group/del"
                                            >
                                                <X size={10} className="group-hover/del:rotate-90 transition-transform" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Video Roster */}
                        {videoFiles.length > 0 && (
                            <div className="space-y-4 max-h-[16rem] overflow-y-auto pr-4 no-scrollbar pb-4 mt-8">
                                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-2 block animate-pulse">Batch Stream Queue</label>
                                {videoFiles.map((file, idx) => (
                                    <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center gap-4 group/item hover:bg-slate-800 transition-all">
                                        <div className="w-16 h-10 lg:w-20 lg:h-12 rounded-lg bg-black overflow-hidden relative flex-shrink-0 border border-slate-800">
                                            <video src={videoPreviews[idx]} className="w-full h-full object-cover opacity-20" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <input 
                                                type="text"
                                                value={specificTitles[idx] || ''}
                                                onChange={(e) => setSpecificTitles(prev => ({ ...prev, [idx]: e.target.value }))}
                                                className="w-full bg-transparent border-none p-0 text-[10px] lg:text-xs font-bold text-gray-200 focus:ring-0 focus:text-orange-500 uppercase tracking-tight"
                                                placeholder="Video title"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeFile(idx)} className="w-8 h-8 rounded-lg text-red-900/20 hover:text-red-500 transition-all flex items-center justify-center">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Baseline Save Action */}
                        <div className="pt-6 lg:pt-8 flex flex-col items-center gap-6">
                            <button 
                                type="submit"
                                disabled={isLoading || (!videoToEdit && videoFiles.length === 0)}
                                className="w-full lg:w-[400px] py-4 bg-orange-600 text-white font-bold uppercase tracking-widest text-xs lg:text-sm rounded-xl lg:rounded-2xl hover:bg-orange-500 hover:scale-[1.01] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 disabled:opacity-30 disabled:grayscale"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                                        <span>Saving Data...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{videoToEdit ? 'Save Changes' : 'Confirm & Publish Session'}</span>
                                    </>
                                )}
                            </button>
                            <div className="flex flex-col items-center gap-1 opacity-20">
                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.5em]">Administrator Secure Channel</span>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Cropping Portal Overlay */}
            {isCropping && cropperSrc && (
                createPortal(
                    <div className="fixed inset-0 z-[10000] bg-black flex flex-col animate-in fade-in duration-300">
                        <div className="py-4 px-6 flex items-center justify-center gap-4 bg-slate-900 border-b border-slate-800">
                            {[{ label: '16:9', value: 1.77 }, { label: '4:3', value: 1.33 }, { label: '1:1', value: 1 }, { label: 'Free', value: null }].map((ratio) => (
                                <button
                                    key={ratio.label}
                                    onClick={() => setCropRatio(ratio.value)}
                                    className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${cropRatio === ratio.value ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-800 text-gray-500 hover:bg-slate-700 hover:text-gray-300'}`}
                                >
                                    {ratio.label}
                                </button>
                            ))}
                        </div>
                        <div className="relative flex-1 bg-black">
                            <ManualCropper image={cropperSrc} aspectRatio={cropRatio} onCropComplete={onCropComplete} />
                        </div>
                        <div className="p-6 lg:p-10 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Precision Cropping</span>
                                <p className="text-gray-700 text-[9px] mt-1 font-bold uppercase tracking-widest">Adjust corners as needed</p>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <button onClick={() => setIsCropping(false)} className="flex-1 sm:flex-initial px-6 py-3 text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-all">Cancel</button>
                                <button onClick={handleApplyCrop} className="flex-1 sm:flex-initial px-10 py-4 bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"><Scissors size={14} />Apply Crop</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            )}
        </div>,
        document.body
    );
}
