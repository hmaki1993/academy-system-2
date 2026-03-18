import React, { useState } from 'react';
import { Play, Square, RefreshCcw, Activity } from 'lucide-react';

export default function JumpRopeTraining() {
    const [isTracking, setIsTracking] = useState(false);
    
    // Placeholder state for demo
    const jumps = isTracking ? 124 : 0;
    const time = isTracking ? "01:24" : "00:00";
    const rpm = isTracking ? 88 : 0;

    return (
        <div className="flex-1 flex flex-col relative w-full bg-[#050505] overflow-hidden font-sans selection:bg-primary/30 antialiased">
            {/* 1. Immersive Camera Base */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#080808]">
                {isTracking && (
                   <div className="w-full h-full bg-[#050505] relative overflow-hidden">
                       <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-60" />
                   </div> 
                )}
            </div>

            {/* 3. Primary Stats HUD (Visible only when tracking) */}
            {isTracking && (
                <div className="absolute left-1/2 -translate-x-1/2 top-40 z-40 flex flex-col items-center pointer-events-none">
                    <div className="text-primary text-[10px] font-black uppercase tracking-[0.5em] mb-4 drop-shadow-[0_0_15px_rgba(255,59,48,0.8)]">Jumps</div>
                    <div className="text-[140px] font-black text-white leading-none tracking-tighter drop-shadow-[0_10px_30px_rgba(255,255,255,0.2)]">
                        {jumps}
                    </div>
                </div>
            )}

            {/* 4. Secondary Telemetry Bar (Visible only when tracking) */}
            {isTracking && (
                <div className="absolute bottom-40 inset-x-6 z-40">
                    <div className="max-w-md mx-auto bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex items-center justify-around pointer-events-auto">
                        <div className="text-center">
                            <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Time</p>
                            <p className="text-xl font-black text-white font-mono tracking-wider">{time}</p>
                        </div>
                        
                        <div className="w-[1px] h-8 bg-white/10" />

                        <div className="text-center">
                            <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] mb-1">RPM</p>
                            <p className="text-xl font-black text-white font-mono tracking-wider">{rpm}</p>
                        </div>

                        <div className="w-[1px] h-8 bg-white/10" />

                        <div className="text-center">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsTracking(false);
                                }} 
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                <RefreshCcw className={`w-4 h-4 text-white/40 ${isTracking ? 'animate-spin-slow' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Floating Action Control */}
            <div className="absolute bottom-20 inset-x-0 z-50 flex justify-center">
                {!isTracking ? (
                    <button 
                        onClick={() => setIsTracking(true)}
                        className="group relative flex items-center gap-4 bg-primary px-10 py-5 rounded-[2.5rem] shadow-[0_0_40px_rgba(255,59,48,0.3)] hover:shadow-[0_0_60px_rgba(255,59,48,0.5)] transition-all duration-500 hover:scale-105 active:scale-95"
                    >
                         <Play className="w-5 h-5 text-white fill-white" />
                         <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Start Training</span>
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsTracking(false)}
                        className="group flex items-center gap-4 bg-white px-10 py-5 rounded-[2.5rem] shadow-2xl hover:scale-105 active:scale-95 transition-all duration-500"
                    >
                         <Square className="w-4 h-4 text-black fill-black" />
                         <span className="text-xs font-black text-black uppercase tracking-[0.2em]">Finish Session</span>
                    </button>
                )}
            </div>

            {/* Background Glows for Spatial Depth */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(255,59,48,0.03)_0%,transparent_70%)] pointer-events-none z-0" />
        </div>
    );
}
