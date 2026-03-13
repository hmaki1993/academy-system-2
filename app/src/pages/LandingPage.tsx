import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    ArrowRight,
    Sparkles,
    Shield,
    Zap,
    Activity,
    Trophy,
    Crown,
    LayoutDashboard,
    CalendarDays,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();
    const [branding, setBranding] = useState({
        academy_name: 'Academy System',
        logo_url: '/logo.png',
        login_accent_color: '#D4AF37'
    });

    const [extractedPalette, setExtractedPalette] = useState({
        primary: '#D4AF37',
        secondary: '#111827',
        accent: '#FF8C00'
    });

    const [activeSlide, setActiveSlide] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const previews = [
        {
            title: "Master Intelligence",
            subtitle: "Unified Academy Command",
            description: "Seamless orchestration of students, coaches, and financials in a single cinematic interface.",
            image: "/assets/previews/dashboard.png",
            icon: <LayoutDashboard className="w-5 h-5" />
        },
        {
            title: "Royal Logistics",
            subtitle: "Precision Scheduling",
            description: "Dynamic training coordination across multiple arenas with automated conflict detection.",
            image: "/assets/previews/schedule.png",
            icon: <CalendarDays className="w-5 h-5" />
        },
        {
            title: "Elite Attendance",
            subtitle: "Biometric Precision",
            description: "Real-time occupancy analytics and performance tracking for every athlete.",
            image: "/assets/previews/attendance.png",
            icon: <UserCheck className="w-5 h-5" />
        }
    ];

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const { data } = await supabase
                    .from('gym_settings')
                    .select('academy_name, logo_url, login_accent_color')
                    .single();

                if (data) {
                    setBranding({
                        academy_name: data.academy_name || 'Academy System',
                        logo_url: data.logo_url || '/logo.png',
                        login_accent_color: data.login_accent_color || '#D4AF37'
                    });
                }
                setIsLoaded(true);
            } catch (err) {
                console.error("Error fetching branding:", err);
                setIsLoaded(true);
            }
        };
        fetchBranding();
    }, []);

    // Color extraction logic (Simplified for performance)
    useEffect(() => {
        if (!branding.logo_url) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = branding.logo_url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = 10;
                canvas.height = 10;
                ctx.drawImage(img, 0, 0, 10, 10);
                const data = ctx.getImageData(0, 0, 10, 10).data;
                let colors: { r: number, g: number, b: number, dist: number }[] = [];

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                    // Skip transparent or near-white/near-black pixels
                    if (a < 128) continue;
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    if (brightness > 240 || brightness < 15) continue;

                    colors.push({ r, g, b, dist: Math.sqrt(r * r + g * g + b * b) });
                }

                if (colors.length > 0) {
                    // Sort by "vibrancy" (distance from black) and pick the most vibrant
                    colors.sort((a, b) => b.dist - a.dist);
                    const best = colors[0];
                    const vibrantHex = `#${best.r.toString(16).padStart(2, '0')}${best.g.toString(16).padStart(2, '0')}${best.b.toString(16).padStart(2, '0')}`;
                    setExtractedPalette(prev => ({
                        ...prev,
                        primary: vibrantHex,
                        accent: branding.login_accent_color
                    }));
                } else {
                    setExtractedPalette(prev => ({ ...prev, primary: branding.login_accent_color }));
                }
            }
        };
    }, [branding.logo_url, branding.login_accent_color]);

    if (!isLoaded) return (
        <div className="h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
        </div>
    );

    return (
        // Main Container
        <div className="min-h-[100dvh] lg:h-[100dvh] w-full flex flex-col relative overflow-x-hidden overflow-y-auto lg:overflow-hidden bg-[var(--color-background)] text-white selection:bg-white/20 font-cairo"
            style={{
                '--brand-primary': extractedPalette.primary,
                '--brand-accent': extractedPalette.accent,
                '--color-text-base': '#ffffff',
                '--color-text-muted': 'rgba(255,255,255,0.6)',
                '--color-background': 'black',
                '--mouse-x': `${mousePos.x}px`,
                '--mouse-y': `${mousePos.y}px`
            } as any}
        >
            {/* Cinematic Lighting */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[var(--brand-primary)]/10 blur-[150px] rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[var(--brand-accent)]/10 blur-[150px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mouse-x)_var(--mouse-y),rgba(255,255,255,0.03)_0%,transparent_50%)]"></div>
            </div>

            {/* Content Layer */}
            <div className="relative z-10 h-full flex flex-col p-4 md:px-10 md:py-4">
                {/* Header */}
                <header className="flex items-center justify-between mb-auto animate-in fade-in slide-in-from-top-4 duration-1000 mt-4 lg:mt-0">
                    <div className="flex items-center gap-3 lg:gap-5 group">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 p-1 lg:p-2 transition-all duration-500 relative flex items-center justify-center">
                            <img src={branding.logo_url} className="w-full h-full object-contain mix-blend-screen relative z-10" alt="Logo" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--brand-primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-xl"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[14px] lg:text-[16px] font-black uppercase tracking-[0.2em] leading-tight">
                                {branding.academy_name.split(' ')[0]} <span className="text-[var(--brand-primary)]">{branding.academy_name.split(' ').slice(1).join(' ')}</span>
                            </span>
                            <span className="text-[7px] lg:text-[9px] font-bold text-white/30 uppercase tracking-[0.4em]">Excellence Defined</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
                        {[
                            { label: 'Systems', index: 0 },
                            { label: 'Experience', index: 1 },
                            { label: 'Contact', index: 2 }
                        ].map(item => (
                            <button
                                key={item.label}
                                onClick={() => setActiveSlide(item.index)}
                                className={`hover:text-[var(--brand-primary)] transition-all relative group ${activeSlide === item.index ? 'text-[var(--brand-primary)]' : ''}`}
                            >
                                {item.label}
                                <span className={`absolute -bottom-1 left-0 h-px bg-[var(--brand-primary)] transition-all ${activeSlide === item.index ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                            </button>
                        ))}
                    </div>

                    <div className="w-32 flex justify-end">
                        <div className="relative group/access cursor-pointer" onClick={() => navigate('/login')}>
                            <div className="absolute -inset-4 bg-[var(--brand-primary)]/30 blur-2xl rounded-full opacity-0 group-hover/access:opacity-100 transition-opacity duration-500"></div>
                            <div className="h-2 w-2 rounded-full bg-[var(--brand-primary)] shadow-[0_0_20px_var(--brand-primary)]"></div>
                        </div>
                    </div>
                </header>

                {/* Main Split Layout */}
                <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 mb-auto mt-6 lg:mt-2 scale-95 lg:scale-95 origin-center">
                    {/* Left: Branding & Action */}
                    <div className="flex-1 max-w-xl text-center lg:text-left animate-in fade-in slide-in-from-left-8 duration-1000 delay-300">
                        <div className="inline-flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-6 lg:mb-4 border-l-[var(--brand-primary)] border-l-2">
                            <Sparkles className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-[var(--brand-primary)]" />
                            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-white/50">Next-Generation Infrastructure</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black mb-4 lg:mb-3 tracking-tight leading-[0.9] uppercase">
                            THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] italic">ACADEMY</span> <br />
                            OS PLATFORM
                        </h1>

                        <p className="text-sm lg:text-base text-white/50 mb-8 lg:mb-5 max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed uppercase tracking-tight">
                            Cinematic management for the distinguished. <br />
                            <span className="text-white">Built for precision. Defined by glory.</span>
                        </p>

                        {/* Integrated Slide Info - High Contrast */}
                        <div className="flex flex-col gap-4 py-4 border-y border-white/10 animate-in fade-in slide-in-from-left-4 duration-1000 bg-white/[0.02] px-6 rounded-3xl backdrop-blur-sm relative group/info">
                            <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-primary)]/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity rounded-3xl"></div>
                            <div className="flex items-center gap-5 relative z-10 transition-transform duration-500 group-hover/info:translate-x-1">
                                <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primary)] p-0.5 shadow-lg shadow-[var(--brand-primary)]/20">
                                    <div className="w-full h-full rounded-[0.9rem] bg-black/40 backdrop-blur-xl flex items-center justify-center text-white">
                                        {React.cloneElement(previews[activeSlide].icon as React.ReactElement, { className: "w-6 h-6" })}
                                    </div>
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--brand-primary)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                        {previews[activeSlide].subtitle}
                                    </span>
                                    <h3 className="text-2xl font-black tracking-tighter text-white uppercase italic drop-shadow-md">
                                        {previews[activeSlide].title}
                                    </h3>
                                </div>
                            </div>
                            <p className="text-[12px] lg:text-[14px] text-white/70 font-medium leading-relaxed uppercase tracking-tight text-left max-w-md relative z-10">
                                {previews[activeSlide].description}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6 lg:gap-6 justify-center lg:justify-start mt-8 lg:mt-6">
                            <button
                                onClick={() => navigate('/login')}
                                className="group relative px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]/80 rounded-full overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] hover:shadow-[0_25px_80px_-10px_var(--brand-primary)]/40 border border-white/20 w-full sm:w-auto"
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10 flex items-center gap-5 text-white filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                    <span className="font-black uppercase tracking-[0.3em] text-[13px]">Master Access</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-all duration-500" />
                                </div>

                                {/* Inner Glow */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4)_0%,transparent_70%)]"></div>

                                {/* Shimmer */}
                                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:left-full transition-all duration-1000 ease-in-out"></div>
                            </button>

                            <div className="flex items-center gap-6 group/status transition-all">
                                <div className="flex -space-x-3 transition-transform group-hover/status:-translate-x-1 duration-500">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-white/40 flex items-center justify-center text-[10px] font-black shadow-lg text-white">
                                            {i + 1}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-left leading-none">
                                    <span className="text-[12px] font-black block tracking-tight text-white">ELITE STATUS</span>
                                    <span className="text-[9px] font-bold text-[var(--brand-primary)] uppercase tracking-widest drop-shadow-md">Global Deployments</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Cinematic Showcase */}
                    <div className="flex-1 w-full max-w-2xl relative animate-in fade-in zoom-in-95 duration-1000 delay-500 mt-6 lg:mt-0">
                        <div className="aspect-[16/9] lg:aspect-[21/9] bg-white/[0.02] rounded-[2rem] border border-white/5 p-3 relative group">
                            {/* Inner Screen */}
                            <div className="w-full h-full rounded-[2rem] overflow-hidden relative shadow-2xl">
                                {previews.map((preview, idx) => (
                                    <div
                                        key={idx}
                                        className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === activeSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}
                                    >
                                        <img src={preview.image} className="w-full h-full object-cover" alt={preview.title} />
                                    </div>
                                ))}
                            </div>

                            {/* Controls */}
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/5 backdrop-blur-3xl border border-white/10 p-2 rounded-2xl z-20">
                                <button
                                    onClick={() => setActiveSlide(prev => prev === 0 ? previews.length - 1 : prev - 1)}
                                    className="p-3 hover:bg-white/10 rounded-xl transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="flex gap-2 px-2">
                                    {previews.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1 rounded-full transition-all duration-500 ${i === activeSlide ? 'w-8 bg-[var(--brand-primary)]' : 'w-2 bg-white/10'}`}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => setActiveSlide(prev => prev === previews.length - 1 ? 0 : prev + 1)}
                                    className="p-3 hover:bg-white/10 rounded-xl transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Floating Elements */}
                            <div className="absolute top-1/4 -right-12 w-24 h-24 bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-accent)] rounded-3xl blur-3xl opacity-20 animate-pulse"></div>
                            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[var(--brand-accent)] rounded-full blur-3xl opacity-10 animate-pulse delay-1000"></div>
                        </div>
                    </div>
                </main>

                {/* Footer Badges */}
                <footer className="mt-8 lg:mt-2 pt-6 lg:pt-4 pb-8 lg:pb-4 border-t border-white/20 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700 bg-black/40 backdrop-blur-sm -mx-4 lg:-mx-10 px-4 lg:px-10 relative z-20">
                    <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-12 group/badges">
                        <div className="flex items-center gap-3 text-white transition-colors duration-500">
                            <Shield className="w-5 h-5 text-[var(--brand-primary)]" />
                            <span className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.4em]">Sovereign Defense</span>
                        </div>
                        <div className="flex items-center gap-3 text-white transition-colors duration-500">
                            <Activity className="w-5 h-5 text-[var(--brand-primary)]" />
                            <span className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.4em]">Real-time Ecosystem</span>
                        </div>
                        <div className="flex items-center gap-3 text-white transition-colors duration-500">
                            <Crown className="w-5 h-5 text-[var(--brand-primary)]" />
                            <span className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.4em]">Elite Standard</span>
                        </div>
                    </div>

                    <div className="text-center lg:text-right flex flex-col items-center lg:items-end gap-3">
                        <span className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.3em] text-white">
                            Powered by <span className="text-white italic font-black">Academy Systems</span> • Excellence Since Day One
                        </span>
                        <div className="inline-flex items-center gap-4 px-5 py-2.5 lg:px-6 lg:py-3 rounded-full bg-white/10 border border-white/40 shadow-2xl group/architect backdrop-blur-xl">
                            <span className="text-[9px] lg:text-[11px] font-bold text-white uppercase tracking-[0.2em]">Master Architect:</span>
                            <span className="text-[12px] lg:text-[14px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] drop-shadow-[0_0_12px_rgba(163,0,0,1)]">Ahmed Hmaki</span>
                        </div>
                    </div>
                </footer>
            </div>

            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.1; transform: scale(1); }
                    50% { opacity: 0.25; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 8s infinite ease-in-out;
                }
                .text-fill-transparent {
                    -webkit-text-fill-color: transparent;
                }
                ::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
