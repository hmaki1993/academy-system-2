import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Globe, Sparkles } from 'lucide-react';

interface LoginRendererProps {
    activeSettings: any;
    designMode: 'desktop' | 'mobile';
    isMobile?: boolean;
    email?: string;
    setEmail?: (val: string) => void;
    password?: string;
    setPassword?: (val: string) => void;
    loading?: boolean;
    error?: string | null;
    handleLogin?: (e: React.FormEvent) => void;
    toggleLanguage?: () => void;
    t: (key: string) => string;
    i18n: any;
    isPreview?: boolean;
    isFullScreen?: boolean;
    disableInteraction?: boolean;
}

export const LoginRenderer: React.FC<LoginRendererProps> = ({
    activeSettings,
    designMode,
    email = '',
    setEmail = () => { },
    password = '',
    setPassword = () => { },
    loading = false,
    error = null,
    handleLogin = (e) => e.preventDefault(),
    toggleLanguage = () => { },
    t,
    i18n,
    isPreview = false,
    isFullScreen = false,
    disableInteraction = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [bounds, setBounds] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setBounds({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // 0. Safety Guard: Prevent crash if activeSettings is not yet loaded
    if (!activeSettings) return <div className="w-full h-full bg-black/20 animate-pulse rounded-3xl" />;

    // Card dimensions respecting user settings
    const cardWidth = Number(activeSettings?.login_card_width) || (designMode === 'mobile' ? 340 : 448);
    const cardHeight = Number(activeSettings?.login_card_height) || (designMode === 'mobile' ? 500 : 600);

    // SCALE FACTOR — makes the real login page match the editor proportions:
    // Desktop: fit content relative to 1920px reference canvas
    // Mobile real page: scale content to fill the ACTUAL phone screen (height-driven)
    //   so it looks exactly like the 390×844 editor canvas
    // Preview: always 1 — SettingsContainer's previewScale wrapper handles externally
    const rawScaleFactor = designMode === 'mobile'
        ? (bounds.width > 0 && bounds.height > 0
            ? Math.max(
                bounds.width / 390,   // width-based scale (fill width)
                bounds.height / 844   // height-based scale (fill height)
              )
            : 1)
        : (bounds.width > 0 ? Math.min(1, bounds.width / 1920) : 1);
    const contentScaleFactor = isPreview ? 1 : rawScaleFactor;

    const logoPath = (activeSettings.login_logo_url as string) || "/logo.png";
    const bgPath = (activeSettings.login_bg_url as string) || "/Tom Roberton Images _ Balance-and-Form _ 2.jpg";

    return (
        <div
            ref={containerRef}
            className={`w-full h-full relative font-cairo select-none ${designMode === 'mobile' ? 'bg-black' : 'bg-transparent'}`}
        >
            {/* ═══════════════════════════════════════════════════════
                LAYER 0: BACKGROUND — Fixed full-screen, NEVER scales
                Background is always independent of card size/scale
                ═══════════════════════════════════════════════════════ */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute inset-0"
                    style={{
                        filter: `blur(${activeSettings.login_bg_blur ?? 0}px) brightness(${activeSettings.login_bg_brightness ?? 1.0})`,
                    }}
                >
                    <div
                        className="absolute inset-0 bg-no-repeat transition-all duration-700"
                        style={{
                            backgroundImage: `url('${bgPath}')`,
                            backgroundSize: (activeSettings.login_bg_fit === 'fill') ? '100% 100%' : (activeSettings.login_bg_fit as string || 'cover'),
                            backgroundPosition: 'center',
                            transform: `scale(${activeSettings.login_bg_zoom ?? 1.0}) translateX(${activeSettings.login_bg_x_offset ?? 0}%) translateY(${activeSettings.login_bg_y_offset ?? 0}%)`,
                            transformOrigin: 'center center',
                            opacity: activeSettings.login_bg_opacity !== undefined ? (activeSettings.login_bg_opacity as number) : 0.8,
                            backgroundColor: '#000'
                        }}
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                LAYER 1: CARD + CONTENT — Centered, independent scale
                ═══════════════════════════════════════════════════════ */}
            <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center"
                style={{
                    pointerEvents: disableInteraction ? 'none' : 'auto',
                    transform: contentScaleFactor !== 1 ? `scale(${contentScaleFactor})` : undefined,
                    transformOrigin: 'center center',
                }}
            >
                {/* Logo */}
                {activeSettings.login_show_logo !== false && (
                    <div
                        className="flex items-center justify-center mb-6 transition-all duration-500 pointer-events-none"
                        style={{
                            transform: `translateX(${activeSettings.login_logo_x_offset ?? 0}px) translateY(${activeSettings.login_logo_y_offset ?? 0}px) scale(${activeSettings.login_logo_scale as number || 1.0})`,
                            transformOrigin: 'center center',
                            width: '120px',
                            height: '120px',
                            flexShrink: 0,
                        }}
                    >
                        <div className="absolute inset-[-20px] bg-[#D4AF37]/10 blur-3xl rounded-full opacity-40" />
                        <img
                            src={logoPath}
                            alt="Academy Logo"
                            className="w-full h-full object-contain drop-shadow-2xl transition-all duration-700 relative z-10"
                            style={{ opacity: activeSettings.login_logo_opacity !== undefined ? (activeSettings.login_logo_opacity as number) : 1.0 }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>
                )}

                {/* Login Card */}
                <div
                    className="relative transition-all duration-500 flex-shrink-0"
                    style={{
                        width: `${cardWidth}px`,
                        height: `${cardHeight}px`,
                        transform: `scale(${activeSettings.login_card_scale as number || 1.0}) translate(${(activeSettings.login_card_x_offset as number || 0)}px, ${(activeSettings.login_card_y_offset as number || 0)}px)`,
                        transformOrigin: 'center center',
                    }}
                >
                    <div
                        className={`w-full h-full border transition-all duration-700 ease-out flex flex-col justify-center overflow-hidden shadow-[inset_0_0_80px_rgba(255,255,255,0.03)] relative before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent before:pointer-events-none ${designMode === 'mobile' ? 'rounded-[1.75rem] p-6' : 'rounded-[3rem] p-8 md:p-12'}`}
                        style={{
                            backgroundColor: (activeSettings.login_card_color as string) || '#000000',
                            borderColor: activeSettings.login_card_border_color ? (activeSettings.login_card_border_color as string) : 'rgba(255,255,255,0.1)',
                            borderWidth: `${activeSettings.login_card_border_width ?? 1}px`,
                            boxShadow: activeSettings.login_card_border_color ? `0 10px ${activeSettings.login_card_glow_size ?? 60}px -15px ${activeSettings.login_card_border_color as string}` : undefined,
                            opacity: (activeSettings.login_card_opacity as number) ?? 0.45,
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                        }}
                    >
                        {/* Title Section */}
                        <div className="text-center mb-8">
                            <h1 className="flex items-baseline justify-center gap-3 md:gap-4 font-sans leading-none mb-8 select-none px-4" style={{ color: (activeSettings.login_text_color as string) || '#ffffff' }}>
                                <span className="text-[40px] md:text-[72px] font-black uppercase tracking-tighter drop-shadow-[0_12px_36px_rgba(255,255,255,0.18)]">
                                    SKIPPY
                                </span>
                                <span
                                    className="text-[24px] md:text-[42px] font-black uppercase tracking-[0.2em] opacity-90"
                                    style={{ color: (activeSettings.login_accent_color as string) || '#D4AF37' }}
                                >
                                    TOES Q8
                                </span>
                            </h1>
                            <div className="relative h-px w-full max-w-[200px] mx-auto mb-6">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/40 blur-[1.5px]" />
                            </div>
                        </div>

                        {error && (
                            <div className="text-rose-400 text-[10px] font-black p-3 rounded-2xl mb-5 bg-rose-500/10 border border-rose-500/10 text-center uppercase tracking-widest">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5 w-full" noValidate>
                            <div className="space-y-2 w-full text-left">
                                <label className="block font-black uppercase tracking-[0.4em] pl-2" style={{ color: `${(activeSettings.login_text_color as string) || '#ffffff'}66`, fontSize: activeSettings.login_label_size ? `${activeSettings.login_label_size}px` : '11px' }}>
                                    {t('login.emailLabel')}
                                </label>
                                <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02]">
                                    <input
                                        type="email"
                                        required
                                        className="relative w-full bg-transparent py-3 px-6 font-bold text-white tracking-widest outline-none"
                                        style={{
                                            color: (activeSettings.login_text_color as string) || '#ffffff',
                                            fontSize: activeSettings.login_input_size ? `${activeSettings.login_input_size}px` : '16px'
                                        }}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 w-full text-left">
                                <label className="block font-black uppercase tracking-[0.4em] pl-2" style={{ color: `${(activeSettings.login_text_color as string) || '#ffffff'}66`, fontSize: activeSettings.login_label_size ? `${activeSettings.login_label_size}px` : '11px' }}>
                                    {t('login.passwordLabel')}
                                </label>
                                <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02]">
                                    <input
                                        type="password"
                                        required
                                        className="relative w-full bg-transparent py-3 px-6 font-bold text-white tracking-widest outline-none"
                                        style={{
                                            color: (activeSettings.login_text_color as string) || '#ffffff',
                                            fontSize: activeSettings.login_input_size ? `${activeSettings.login_input_size}px` : '16px'
                                        }}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || disableInteraction}
                                className="w-full relative py-3 mt-4 rounded-2xl font-black uppercase tracking-[0.5em] bg-black/60 backdrop-blur-md border border-white/10 transition-all duration-500"
                                style={{
                                    color: (activeSettings.login_accent_color as string) || '#D4AF37',
                                    borderColor: `${(activeSettings.login_accent_color as string) || '#D4AF37'}66`,
                                    fontSize: activeSettings.login_label_size ? `${activeSettings.login_label_size}px` : '12px'
                                }}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            {t('common.login')}
                                            <Sparkles className="w-4 h-4 opacity-50" />
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>

                        <div className="mt-5 flex flex-col items-center gap-3 w-full">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleLanguage();
                                }}
                                className="px-6 py-2 rounded-full flex items-center justify-center gap-2 transition-all font-black uppercase tracking-[0.3em] cursor-pointer"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: `${(activeSettings.login_text_color as string) || '#ffffff'}cc`,
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    fontSize: activeSettings.login_label_size ? `${Math.max(9, (activeSettings.login_label_size as number) - 2)}px` : '10px'
                                }}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {i18n.language === 'en' ? t('login.switchToArabic') : t('login.switchToEnglish')}
                            </button>
                            <span className="font-black uppercase tracking-[0.4em] mt-1" style={{ color: `${(activeSettings.login_text_color as string) || '#ffffff'}1a`, fontSize: '9px' }}>
                                © 2026 {(activeSettings.academy_name as string) || 'Epic Gymnastic Academy'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
