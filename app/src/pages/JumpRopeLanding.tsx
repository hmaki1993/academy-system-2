import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Camera, Mic, BarChart3, ChevronRight, Play, ShieldCheck, Zap } from 'lucide-react';
import { loadJrSettings } from './JumpRopeSettings';

export default function JumpRopeLanding() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(loadJrSettings());
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        // Preload any heavy assets here if necessary
    }, []);

    const features = [
        {
            icon: <Camera className="w-5 h-5 text-blue-400" />,
            title: "Optical Tracker",
            desc: "Zero hardware required. Just position your phone and jump. Our smart system counts every rep with pinpoint accuracy."
        },
        {
            icon: <Mic className="w-5 h-5 text-emerald-400" />,
            title: "Voice Coach",
            desc: "Keep your eyes on the rope. Intelligent audio feedback calls out your milestones automatically."
        },
        {
            icon: <BarChart3 className="w-5 h-5 text-amber-400" />,
            title: "Pro Analytics",
            desc: "Track RPM, total duration, and resting intervals down to the millisecond in a premium dashboard."
        },
        {
            icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
            title: "100% Private",
            desc: "All motion analysis happens directly on your device. Video never leaves your phone."
        }
    ];

    return (
        <div 
            className="h-[100dvh] w-full flex flex-col font-sans overflow-x-hidden overflow-y-auto selection:bg-blue-500/30 custom-scrollbar relative"
            style={{ 
                background: '#050510', 
                color: '#ffffff'
            }}
        >
            {/* Ambient Lighting FX */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-20%] w-[70vw] h-[70vw] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-20%] w-[60vw] h-[60vw] bg-purple-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
                
                {/* Noise Texture Overlay */}
                <div 
                    className="absolute inset-0 opacity-[0.03]" 
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
                />
            </div>

            {/* Mobile Header */}
            <header className={`relative z-10 w-full px-6 py-5 flex items-center justify-between transition-all duration-1000 shrink-0 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <div className="flex items-center gap-3">
                    <img 
                        src="/logo-jumprope.png"
                        alt="JUMP ROPE PRO"
                        className="w-16 h-16 object-contain mix-blend-screen shrink-0"
                        style={{ filter: 'brightness(1.3) contrast(1.2) saturate(1.1) drop-shadow(0 0 10px rgba(129,140,248,0.4))' }}
                    />
                    <div>
                        <h1 
                            className="text-[18px] font-extrabold tracking-[0.45em] uppercase"
                            style={{ 
                                background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 45%, #22d3ee 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                color: 'transparent',
                                filter: 'drop-shadow(0 0 15px rgba(129,140,248,0.3))'
                            }}
                        >
                            JUMP ROPE PRO
                        </h1>
                        <p className="text-[7.5px] font-black tracking-[0.45em] uppercase text-white/30 mt-1.5 ml-0.5">Global Performance Elite</p>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col w-full px-6 pt-10 pb-6 md:max-w-md mx-auto">
                <div className={`transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                        <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Next-Gen Fitness Tech</span>
                    </div>

                    <h2 className="text-4xl font-black uppercase leading-[1.0] tracking-tighter mb-3 text-white">
                        Master <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            Every Arc.
                        </span>
                    </h2>
                    
                    <p className="text-xs font-medium text-white/50 leading-relaxed mb-8 max-w-[280px]">
                        Turn your device into an elite, hands-free personal trainer. The smartest way to jump rope, directly in your browser.
                    </p>
                </div>

                {/* Feature Grid */}
                <div className="flex flex-col gap-4 mb-12">
                    {features.map((feat, idx) => (
                        <div 
                            key={idx} 
                            className={`flex flex-col gap-2 p-5 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-md transition-all duration-700`}
                            style={{ 
                                transitionDelay: `${200 + (idx * 100)}ms`,
                                opacity: isVisible ? 1 : 0,
                                transform: isVisible ? 'translateY(0)' : 'translateY(20px)'
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shadow-inner">
                                    {feat.icon}
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">{feat.title}</h3>
                            </div>
                            <p className="text-[11px] font-medium text-white/40 leading-relaxed pl-16">
                                {feat.desc}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Bottom Section (Pushed to end of screen) */}
                <div className="mt-auto w-full flex flex-col items-center">
                    {/* Action Button (Natural Flow) */}
                    <div className={`w-full flex justify-center transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="w-full">
                            <button 
                                onClick={() => {
                                    localStorage.setItem('jr_onboarded', 'true');
                                    navigate('/jump-rope');
                                }}
                                className="w-full relative group overflow-hidden flex items-center justify-center gap-3 py-3.5 rounded-full bg-white text-black transition-all duration-500 hover:scale-[0.98] active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/5 to-black/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                                <span className="font-black uppercase tracking-[0.2em] text-[11px] relative z-10">
                                    Launch Hub
                                </span>
                                <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center relative z-10 group-hover:translate-x-1 transition-transform">
                                    <ChevronRight className="w-3 h-3 text-black" />
                                </div>
                            </button>
                        </div>
                    </div>
                    
                    {/* Safe area spacer for bottom text */}
                    <div className="mt-5 text-center transition-all duration-1000 delay-[900ms] pb-2">
                        <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-white/20">
                            Built for Performance • No App Needed
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
