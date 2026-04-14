import React, { useEffect } from 'react';
import { Loader2, Globe, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    disableInteraction = false
}) => {
    // Safety Guard
    if (!activeSettings) return <div className="w-full h-full bg-[#050505] animate-pulse" />;

    const logoPath = (activeSettings.login_logo_url as string) || "/logo.png";
    const bgPath = (activeSettings.login_bg_url as string) || "/Tom Roberton Images _ Balance-and-Form _ 2.jpg";
    const accentColor = (activeSettings.login_accent_color as string) || '#D4AF37';
    const textColor = (activeSettings.login_text_color as string) || '#ffffff';
    const isRTL = i18n.language === 'ar';

    return (
        <div className={`w-full h-full flex overflow-hidden font-cairo bg-[#050505] ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* ═══════════════════════════════════════════════════════
                LEFT SIDE: VISUAL (Desktop Only)
                ═══════════════════════════════════════════════════════ */}
            <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative h-full overflow-hidden">
                <motion.div 
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0 bg-no-repeat bg-cover bg-center"
                    style={{ backgroundImage: `url('${bgPath}')` }}
                />
                {/* Gradient Overlay for integration */}
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#050505] ${isRTL ? 'rotate-180' : ''}`} />
                
                {/* Subtle Brand Watermark - REMOVED AS PER USER REQUEST */}
                {/* <div className="absolute bottom-12 left-12 z-10">
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="flex items-center gap-4"
                    >
                        <div className="w-1 h-12 bg-primary/50 rounded-full" style={{ backgroundColor: accentColor + '80' }} />
                        <div>
                            <h3 className="text-white font-black text-2xl tracking-tighter uppercase whitespace-nowrap">
                                Skippy Toes Q8
                            </h3>
                            <p className="text-white/40 text-sm font-bold uppercase tracking-[0.3em]">
                                Gymnastics Academy
                            </p>
                        </div>
                    </motion.div>
                </div> */}
            </div>

            {/* ═══════════════════════════════════════════════════════
                RIGHT SIDE: INTERACTION (Full Screen on Mobile)
                ═══════════════════════════════════════════════════════ */}
            <div className="flex-1 h-full relative flex flex-col items-center justify-center p-6 md:p-12 z-20">
                {/* Mobile Background - Subtle version of the image */}
                <div className="lg:hidden absolute inset-0 z-0">
                    <div 
                        className="absolute inset-0 opacity-20 bg-cover bg-center grayscale"
                        style={{ backgroundImage: `url('${bgPath}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/80 via-[#050505] to-[#050505]" />
                </div>

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-[440px] relative z-10 space-y-8"
                >
                    {/* Header: Logo & Titles */}
                    <div className="flex flex-col items-center text-center space-y-4">
                        {activeSettings.login_show_logo !== false && (
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                                className="w-20 h-20 relative"
                            >
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" style={{ backgroundColor: accentColor + '30' }} />
                                <img src={logoPath} alt="Logo" className="w-full h-full object-contain relative z-10" />
                            </motion.div>
                        )}
                        
                        <div className="space-y-1">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">
                                SKIPPY <span style={{ color: accentColor }}>TOES</span>
                            </h1>
                            <div className="flex items-center justify-center gap-3">
                                <div className="h-px w-6 bg-white/20" />
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
                                    ELITE ONLINE COACHING
                                </span>
                                <div className="h-px w-6 bg-white/20" />
                            </div>
                        </div>
                    </div>

                    {/* Login Form */}
                    <div className="space-y-4">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-center mb-4"
                                >
                                    <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleLogin} className="space-y-4" noValidate>
                            {/* Standalone Inputs with refined bottom dividers */}
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 pl-1">
                                        {t('login.emailLabel')}
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-transparent border-b border-white/5 focus:border-primary/50 py-3 text-white font-bold transition-all outline-none"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder=""
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 pl-1">
                                        {t('login.passwordLabel')}
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-transparent border-b border-white/5 focus:border-primary/50 py-3 text-white font-bold transition-all outline-none"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center pt-2">
                                <button
                                    type="submit"
                                    disabled={loading || disableInteraction}
                                    className="w-full max-w-[280px] relative py-3 rounded-xl font-black uppercase tracking-[0.5em] overflow-hidden transition-all duration-500 group active:scale-[0.96] disabled:opacity-50"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor} 100%)`,
                                        color: 'rgba(0,0,0,0.85)',
                                        boxShadow: `0 8px 30px -8px ${accentColor}60, inset 0 1px 1px rgba(255,255,255,0.3)`,
                                        border: `1px solid ${accentColor}33`
                                    }}
                                >
                                    {/* Luxury Shine Animation */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                                    
                                    {/* Constant Luminance */}
                                    <div className="absolute inset-0 opacity-15 bg-white group-hover:opacity-25 transition-opacity duration-500" />

                                    <span className="relative z-10 flex items-center justify-center gap-3 text-[10px]">
                                        {loading ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-black/60" />
                                        ) : (
                                            <>
                                                {t('common.login')}
                                                <motion.div
                                                    animate={{ 
                                                        scale: [1, 1.2, 1],
                                                        opacity: [0.7, 1, 0.7]
                                                    }}
                                                    transition={{ 
                                                        duration: 2,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                </motion.div>
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col items-center space-y-8 pt-4">
                        <button
                            onClick={toggleLanguage}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-full flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-[0.2em] text-white/60"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            {i18n.language === 'en' ? 'العربية' : 'English'}
                        </button>

                        <div className="text-center space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10">
                                © 2026 {activeSettings.academy_name || 'ELITE COACHING'}
                            </p>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/5">
                                Powered by Elite Systems
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
