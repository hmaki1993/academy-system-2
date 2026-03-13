import { useEffect, useRef, useState } from 'react';
import { useCall } from '../context/CallContext';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, Minimize2, Maximize2 } from 'lucide-react';

// ─── Global Call Overlay ─ renders over ALL pages ────────────────────────────
export default function GlobalCallOverlay() {
    const {
        activeCall,
        incomingCall,
        callStatus,
        callDuration,
        isMuted,
        isCameraOff,
        isCallMinimized,
        acceptCall,
        rejectCall,
        hangupCall,
        toggleMute,
        toggleCamera,
        setIsCallMinimized,
    } = useCall();

    const localVideoRef = useRef<HTMLDivElement>(null);
    const remoteVideoRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // ─── Incoming Call UI ─────────────────────────────────────────────────────
    if (incomingCall && !activeCall) {
        const caller = incomingCall.caller;

        // ── Mobile: Full-Screen native-style call screen ──
        if (isMobile) {
            return (
                <div
                    className="fixed inset-0 z-[10000] flex flex-col items-center justify-between overflow-hidden"
                    style={{
                        background: 'linear-gradient(160deg, #0a0f14 0%, #0d1f1a 40%, #061a12 100%)',
                    }}
                >
                    {/* Ambient glow blobs */}
                    <div
                        className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full opacity-20 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
                    />
                    <div
                        className="absolute bottom-[-60px] right-[-40px] w-[260px] h-[260px] rounded-full opacity-10 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
                    />

                    {/* Top section – status */}
                    <div className="relative z-10 flex flex-col items-center pt-16 px-6 w-full">
                        <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.25em] mb-1 animate-pulse">
                            {incomingCall.type === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Call'}
                        </p>
                    </div>

                    {/* Center – Avatar + Name */}
                    <div className="relative z-10 flex flex-col items-center gap-5 flex-1 justify-center pb-4">
                        {/* Pulsing rings */}
                        <div className="relative flex items-center justify-center">
                            <div
                                className="absolute w-40 h-40 rounded-full border border-emerald-500/20 animate-ping"
                                style={{ animationDuration: '1.8s' }}
                            />
                            <div
                                className="absolute w-32 h-32 rounded-full border border-emerald-500/30 animate-ping"
                                style={{ animationDuration: '1.4s', animationDelay: '0.3s' }}
                            />
                            {/* Avatar */}
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl bg-[#121417]">
                                {caller?.avatar_url
                                    ? <img src={caller.avatar_url} className="w-full h-full object-cover" alt="" />
                                    : (
                                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-black text-5xl">
                                            {caller?.full_name?.[0] || 'G'}
                                        </div>
                                    )
                                }
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-1 text-center">
                            <p className="text-white font-black text-3xl tracking-tight leading-tight">
                                {caller?.full_name || 'Unknown Caller'}
                            </p>
                            {caller?.role && (
                                <p className="text-white/40 text-sm font-semibold">{caller.role}</p>
                            )}
                            {/* Animated dots */}
                            <div className="flex items-center gap-1.5 mt-2">
                                {[0, 1, 2].map(i => (
                                    <div
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
                                        style={{ animationDelay: `${i * 0.18}s` }}
                                    />
                                ))}
                                <span className="text-white/30 text-xs font-bold ml-1 uppercase tracking-widest">Ringing</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom – Accept / Decline buttons */}
                    <div className="relative z-10 w-full flex items-center justify-around px-12 pb-16">
                        {/* Decline */}
                        <div className="flex flex-col items-center gap-3">
                            <button
                                onClick={rejectCall}
                                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:scale-90 text-white flex items-center justify-center transition-all"
                                style={{ boxShadow: '0 0 40px rgba(239,68,68,0.5)' }}
                                aria-label="Decline"
                            >
                                <PhoneOff className="w-8 h-8" />
                            </button>
                            <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Decline</span>
                        </div>

                        {/* Accept */}
                        <div className="flex flex-col items-center gap-3">
                            <button
                                onClick={acceptCall}
                                className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-90 text-white flex items-center justify-center transition-all animate-[pulse_1.5s_ease-in-out_infinite]"
                                style={{ boxShadow: '0 0 50px rgba(16,185,129,0.6)' }}
                                aria-label="Answer"
                            >
                                {incomingCall.type === 'video'
                                    ? <Video className="w-8 h-8 fill-white" />
                                    : <Phone className="w-8 h-8 fill-white" />
                                }
                            </button>
                            <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Answer</span>
                        </div>
                    </div>
                </div>
            );
        }

        // ── Desktop: Floating top banner (unchanged premium style) ──
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-[95%] max-w-[400px] animate-in slide-in-from-top duration-500 ease-out">
                <div className="relative group overflow-hidden rounded-[2rem] bg-black/40 border border-white/10 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all hover:bg-black/50">
                    {/* Pulsing background glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 animate-pulse" />

                    <div className="relative flex items-center justify-between p-4 pl-5">
                        <div className="flex items-center gap-4">
                            {/* Animated Avatar */}
                            <div className="relative">
                                <div className="absolute -inset-1.5 rounded-full border border-emerald-500/30 animate-[ping_2s_infinite]" />
                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 shadow-xl bg-[#121417]">
                                    {caller?.avatar_url
                                        ? <img src={caller.avatar_url} className="w-full h-full object-cover" alt="" />
                                        : <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-black text-xl">{caller?.full_name?.[0] || 'G'}</div>
                                    }
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <p className="text-white font-black text-base tracking-tight leading-tight mb-0.5">{caller?.full_name || 'Inbound Call'}</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.1em]">Incoming {incomingCall.type} Call</span>
                                </div>
                            </div>
                        </div>

                        {/* High-Visibility Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={rejectCall}
                                className="w-11 h-11 rounded-full bg-red-500/90 hover:bg-red-600 text-white flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(239,68,68,0.4)] transition-all hover:scale-110 active:scale-90"
                                title="Decline"
                            >
                                <PhoneOff className="w-5 h-5 fill-white" />
                            </button>
                            <button
                                onClick={acceptCall}
                                className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-[0_12px_24px_-4px_rgba(16,185,129,0.5)] transition-all hover:scale-110 active:scale-95 animate-[pulse_1.5s_infinite]"
                                title="Answer"
                            >
                                {incomingCall.type === 'video' ? <Video className="w-6 h-6 fill-white" /> : <Phone className="w-6 h-6 fill-white" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Active Call UI ───────────────────────────────────────────────────────
    if (!activeCall) return null;

    const otherUser = activeCall.otherUser;
    const isConnected = callStatus === 'connected';
    const isVideo = activeCall.type === 'video';

    // Minimized floating pill
    if (isCallMinimized) {
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#1a1d21]/90 border border-white/10 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10">
                    {otherUser?.avatar_url
                        ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xs">{otherUser?.full_name?.[0] || 'G'}</div>
                    }
                </div>
                <div className="flex flex-col">
                    <span className="text-white text-xs font-black leading-none">{otherUser?.full_name || 'Generic User'}</span>
                    <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                        {isConnected ? fmt(callDuration) : callStatus}
                    </span>
                </div>
                <div className="flex items-center gap-2 ml-1">
                    <button
                        onClick={() => setIsCallMinimized(false)}
                        className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                        <Maximize2 className="w-3 h-3 text-white/60" />
                    </button>
                    <button
                        onClick={() => hangupCall(true)}
                        className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                    >
                        <PhoneOff className="w-3 h-3 text-white" />
                    </button>
                </div>
            </div>
        );
    }

    // Full call UI
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-lg animate-in fade-in duration-300">
            {/* Video container (video calls) */}
            {isVideo && (
                <div className="absolute inset-0">
                    <div id="agora-remote-video" className="w-full h-full" />
                    <div
                        id="agora-local-video"
                        className="absolute bottom-24 right-4 w-28 h-40 rounded-2xl overflow-hidden border border-white/20 shadow-2xl"
                    />
                </div>
            )}

            {/* Avatar overlay (audio / pre-connect) */}
            {(!isVideo || !isConnected) && (
                <div className="flex flex-col items-center gap-4 z-10">
                    <div className="relative">
                        {!isConnected && <div className="absolute -inset-4 rounded-full border border-white/10 animate-ping" />}
                        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl">
                            {otherUser?.avatar_url
                                ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                                : <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-4xl">{otherUser?.full_name?.[0] || 'G'}</div>
                            }
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-white font-black text-2xl">{otherUser?.full_name || 'Generic User'}</p>
                        <p className="text-white/40 text-sm font-bold mt-1">
                            {isConnected ? fmt(callDuration) : callStatus === 'ringing' ? 'Ringing...' : 'Calling...'}
                        </p>
                    </div>
                </div>
            )}

            {/* Timer for connected video calls */}
            {isVideo && isConnected && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-xl">
                    <span className="text-white text-sm font-black tabular-nums">{fmt(callDuration)}</span>
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4">
                {/* Minimize */}
                <button
                    onClick={() => setIsCallMinimized(true)}
                    className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md"
                >
                    <Minimize2 className="w-3.5 h-3.5" />
                </button>

                {/* Mute */}
                <button
                    onClick={toggleMute}
                    className={`rounded-full flex items-center justify-center border transition-all backdrop-blur-md w-10 h-10 ${isMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                        }`}
                >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* End call */}
                <button
                    onClick={() => hangupCall(true)}
                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all active:scale-95"
                >
                    <PhoneOff className="w-5 h-5" />
                </button>

                {/* Camera (video only) */}
                {isVideo && (
                    <button
                        onClick={toggleCamera}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all backdrop-blur-md ${isCameraOff ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                            }`}
                    >
                        {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>
                )}
            </div>
        </div>
    );
}
