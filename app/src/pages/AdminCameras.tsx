import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, Wifi, Save, Activity, Volume2, VolumeX, Play } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useWebRTCViewer } from '../hooks/useWebRTCViewer';

export default function AdminCameras() {
    const { t } = useTranslation();
    const { remoteStream, connectionStatus } = useWebRTCViewer('live_stream_1');
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playError, setPlayError] = useState(false);

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream;
            videoRef.current.play().then(() => {
                setIsPlaying(true);
                setPlayError(false);
            }).catch(e => {
                console.warn("Autoplay prevented:", e);
                setPlayError(true);
                setIsPlaying(false);
            });
        }
    }, [remoteStream]);

    const handleManualPlay = () => {
        if (videoRef.current) {
            videoRef.current.play().then(() => {
                setIsPlaying(true);
                setPlayError(false);
                setIsMuted(false);
            }).catch(e => console.error("Manual play failed", e));
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700">
            <PageHeader
                title={t('common.cameras')}
                subtitle={t('cameras.subtitle') || 'Monitor gym activities in real-time'}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                <div className="lg:col-span-2 space-y-8">
                    {/* Video Player Container */}
                    <div className="glass-card rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border border-white/10 shadow-premium aspect-video relative group bg-black/40">
                        {remoteStream ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted={isMuted}
                                    className="w-full h-full object-cover"
                                />
                                {playError && !isPlaying && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                                        <button onClick={handleManualPlay} className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white hover:scale-105 transition-transform shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                                            <Play size={24} className="ml-1" fill="currentColor" />
                                        </button>
                                        <p className="text-[10px] font-black uppercase tracking-widest mt-4 text-white/60">Click to start live feed</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10">
                                <div className="relative">
                                    <Video className={`w-16 h-16 md:w-32 md:h-32 mb-4 md:mb-8 opacity-20 ${connectionStatus === 'CONNECTING' ? 'animate-pulse text-blue-400' : ''}`} />
                                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
                                </div>
                                <p className="font-black uppercase tracking-[0.4em] text-[10px] md:text-sm">
                                    {connectionStatus === 'CONNECTING' ? 'WAITING FOR BROADCAST...' : t('cameras.noSignal')}
                                </p>
                            </div>
                        )}

                        {/* Live Indicator Overlay */}
                        {remoteStream && (
                            <div className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 md:gap-3 bg-red-500 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black tracking-[0.2em] shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-in zoom-in-50">
                                <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-white"></span>
                                </span>
                                LIVE MONITOR
                            </div>
                        )}

                        {/* Audio Controls Overlay */}
                        {remoteStream && isPlaying && (
                            <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button 
                                    onClick={toggleMute}
                                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                                >
                                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                            </div>
                        )}

                        {/* Glass Overlay on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none p-6 md:p-12 flex items-end">
                            <div className="space-y-1 md:space-y-2 relative z-10 w-full">
                                <h4 className="text-white font-black text-lg md:text-2xl uppercase tracking-tighter">{t('cameras.hdFeed')}</h4>
                                <p className="text-white/40 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">{t('cameras.stableConnection')} • {new Date().toLocaleTimeString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                    {/* Controls Card */}
                    <div className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group">
                        <div className="absolute -top-12 md:-top-24 -right-12 md:-right-24 w-32 md:w-64 h-32 md:h-64 bg-primary/5 rounded-full blur-[40px] md:blur-3xl group-hover:bg-primary/10 transition-all duration-700"></div>

                        <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mb-6 md:mb-8 relative z-10 flex items-center gap-3 md:gap-4">
                            <div className="p-2.5 md:p-3 bg-blue-500/20 rounded-xl md:rounded-2xl text-blue-400 shadow-inner">
                                <Activity className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            Live Status
                        </h3>

                        <div className="space-y-6 md:space-y-8 relative z-10">
                            <div className="space-y-3 md:space-y-4">
                                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">
                                    Connection State
                                </label>
                                <div className="w-full bg-white/5 border border-white/10 rounded-[1.2rem] md:rounded-[1.5rem] px-5 md:px-8 py-4 md:py-5 flex items-center justify-between">
                                    <span className="text-white font-bold text-xs md:text-sm tracking-tight">Channel 1</span>
                                    <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full ${
                                        connectionStatus === 'CONNECTED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                        connectionStatus === 'CONNECTING' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse' :
                                        'bg-white/10 text-white/50 border border-white/10'
                                    }`}>
                                        {connectionStatus}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-white/50 leading-relaxed font-medium">
                                The system automatically listens for incoming broadcasts from active training sessions. No manual setup is required.
                            </div>
                        </div>
                    </div>

                    {/* Security Note Card */}
                    <div className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-rose-500/10 bg-rose-500/[0.02] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 md:p-6 text-rose-500 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Save className="w-8 h-8 md:w-12 h-12" />
                        </div>
                        <div className="space-y-3 md:space-y-4 relative z-10">
                            <p className="text-rose-400 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs flex items-center gap-2">
                                <span className="w-1 md:w-1.5 h-4 md:h-6 bg-rose-500 rounded-full"></span>
                                {t('cameras.noteTitle')}
                            </p>
                            <p className="text-white/40 text-[10px] md:text-xs font-bold leading-relaxed">
                                {t('cameras.noteContent')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
