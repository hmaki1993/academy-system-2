import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Lock, Mail, Loader2, User, Globe, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { getResponsiveLoginSettings } from '../utils/theme';

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { settings } = useTheme();

    // 1. Theme Awareness
    const [isMobileView, setIsMobileView] = useState(() => {
        return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Resolve settings based on viewport
    const activeSettings = useMemo(() => {
        return getResponsiveLoginSettings(settings, isMobileView);
    }, [settings, isMobileView]);

    const primaryColor = activeSettings.login_accent_color || settings.primary_color || '#ef4444';
    const secondaryColor = activeSettings.login_card_color || settings.secondary_color || '#000000';
    const textColor = activeSettings.login_text_color || '#ffffff';
    const academyName = settings.academy_name || 'SKIPPY';
    const logoUrl = activeSettings.login_logo_url || settings.logo_url;

    // 2. Unified Prefill Logic
    const getInitialPrefill = () => {
        if (location.state?.prefill) return location.state.prefill;
        const params = new URLSearchParams(location.search);
        const prefillParam = params.get('prefill');
        if (prefillParam) {
            try {
                return JSON.parse(decodeURIComponent(prefillParam));
            } catch (e) {
                console.error('Failed to parse prefill param:', e);
            }
        }
        return {};
    };

    const prefill = getInitialPrefill();

    const [fullName, setFullName] = useState(prefill.full_name || '');
    const [email, setEmail] = useState(prefill.email || '');
    const [phone, setPhone] = useState(prefill.phone || '');
    const [password, setPassword] = useState('');
    const [role] = useState<'admin' | 'coach' | 'student'>(prefill.role || 'student');
    const [studentId] = useState<string | null>(prefill.student_id || null);
    const [ptId] = useState<string | null>(prefill.pt_id || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 6) {
            setError(t('register.error.passwordShort', 'Password must be at least 6 characters long'));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        phone: phone,
                        role: role,
                        student_id: studentId,
                        pt_id: ptId,
                    },
                },
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;

                if (role === 'student') {
                    if (studentId) {
                        await supabase.from('students').update({ profile_id: data.user.id }).eq('id', studentId);
                    } else {
                        await supabase.from('students').insert({
                            profile_id: data.user.id,
                            full_name: fullName,
                            email: email,
                            parent_contact: phone,
                            status: 'active'
                        });
                    }
                }

                if (role === 'coach') {
                    await supabase.from('coaches').insert({
                        id: data.user.id,
                        full_name: fullName,
                        specialty: 'Gymnastics Coach',
                        pt_rate: 0,
                    });
                }
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
        document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    };

    return (
        <div 
            className="min-h-screen flex flex-col items-center justify-start font-cairo p-4 pt-4 relative overflow-hidden transition-colors duration-1000"
            style={{ backgroundColor: secondaryColor }}
        >
            {/* Background Glows */}
            <div 
                className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 transition-all duration-1000 opacity-20"
                style={{ backgroundColor: primaryColor }}
            ></div>
            <div 
                className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4 transition-all duration-1000 opacity-20"
                style={{ backgroundColor: primaryColor }}
            ></div>

            <div className="w-full max-w-sm relative z-10 flex flex-col items-center bg-transparent border-none shadow-none">
                
                {/* Elite Typography Brand Identity */}
                <div className="mb-4 mt-2 animate-in fade-in zoom-in duration-1000">
                    <h1 className="flex flex-col items-center gap-2 font-[var(--font-orbitron)] leading-none text-center">
                        <div className="relative group cursor-default">
                            {/* Background Atmosphere for Name */}
                            <div 
                                className="absolute -inset-6 rounded-full blur-[40px] opacity-20 group-hover:opacity-30 transition-opacity duration-1000"
                                style={{ backgroundColor: primaryColor }}
                            ></div>
                            
                            <span 
                                className="relative text-[28px] md:text-[32px] font-black uppercase tracking-[0.4em] text-white block select-none"
                                style={{ 
                                    textShadow: `0 8px 30px ${primaryColor}40`
                                }}
                            >
                                SKIPPY
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full max-w-[180px]">
                            <div 
                                className="h-[1px] flex-1 transition-all duration-1000" 
                                style={{ background: `linear-gradient(to r, transparent, ${primaryColor}60)` }} 
                            />
                            <span 
                                className="text-[8px] font-black uppercase tracking-[0.6em] whitespace-nowrap transition-all duration-1000" 
                                style={{ color: primaryColor }}
                            >
                                TOES Q8
                            </span>
                            <div 
                                className="h-[1px] flex-1 transition-all duration-1000" 
                                style={{ background: `linear-gradient(to l, transparent, ${primaryColor}60)` }} 
                            />
                        </div>
                    </h1>
                </div>

                {/* Floating Content */}
                <div className="w-full text-center mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] transition-all duration-1000" style={{ color: `${textColor}E6` }}>
                        {t('register.title')}
                    </h2>
                    <p 
                        className="mt-2 text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] transition-all duration-1000" 
                        style={{ color: primaryColor, textShadow: `0 0 15px ${primaryColor}40` }}
                    >
                        {t('register.subtitle')}
                    </p>
                </div>

                {error && (
                    <div 
                        className="w-full text-[9px] font-black p-3 rounded-xl mb-4 border text-center animate-in fade-in scale-in duration-300 uppercase tracking-widest backdrop-blur-md"
                        style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}20`, color: primaryColor }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="w-full flex flex-col space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    
                    <div className="space-y-1 px-0 group">
                        <label className="text-[11px] font-black uppercase tracking-[0.4em] transition-all duration-1000" style={{ color: `${textColor}40` }}>{t('register.fullName')}</label>
                        <div 
                            className="flex items-center !bg-transparent border-b transition-all duration-500 !rounded-none"
                            style={{ 
                                borderColor: prefill.full_name ? `${textColor}10` : `${textColor}20`,
                                opacity: prefill.full_name ? 0.5 : 1
                            }}
                        >
                            <User className="w-3 h-3 mr-4 transition-colors duration-500" style={{ color: `${textColor}40` }} />
                            <input 
                                type="text" 
                                required 
                                readOnly={!!prefill.full_name} 
                                className="w-full !bg-transparent !border-none !outline-none py-2 px-0 font-bold text-sm tracking-wide transition-all duration-1000" 
                                style={{ color: textColor }}
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-1 px-0 group">
                        <label className="text-[11px] font-black uppercase tracking-[0.4em] transition-all duration-1000" style={{ color: `${textColor}40` }}>{t('register.phone')}</label>
                        <div 
                            className="flex items-center !bg-transparent border-b transition-all duration-500 !rounded-none"
                            style={{ 
                                borderColor: prefill.phone ? `${textColor}10` : `${textColor}20`,
                                opacity: prefill.phone ? 0.5 : 1
                            }}
                        >
                            <Phone className="w-3 h-3 mr-4 transition-colors duration-500" style={{ color: `${textColor}40` }} />
                            <input 
                                type="text" 
                                required 
                                readOnly={!!prefill.phone} 
                                className="w-full !bg-transparent !border-none !outline-none py-2 px-0 font-bold text-sm tracking-wide text-left transition-all duration-1000" 
                                dir="ltr" 
                                style={{ color: textColor }}
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-1 px-0 group">
                        <label className="text-[11px] font-black uppercase tracking-[0.4em] transition-all duration-1000" style={{ color: `${textColor}40` }}>{t('register.email')}</label>
                        <div 
                            className="flex items-center !bg-transparent border-b transition-all duration-500 !rounded-none"
                            style={{ 
                                borderColor: prefill.email ? `${textColor}10` : `${textColor}20`,
                                opacity: prefill.email ? 0.5 : 1
                            }}
                        >
                            <Mail className="w-3 h-3 mr-4 transition-colors duration-500" style={{ color: `${textColor}40` }} />
                            <input 
                                type="email" 
                                required 
                                autoComplete="off"
                                readOnly={!!prefill.email} 
                                className="w-full !bg-transparent !border-none !outline-none py-2 px-0 font-bold text-sm tracking-wide text-left transition-all duration-1000" 
                                dir="ltr" 
                                style={{ color: textColor }}
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-1 px-0 group">
                        <label className="text-[11px] font-black uppercase tracking-[0.4em] transition-all duration-1000" style={{ color: `${textColor}40` }}>{t('register.password')}</label>
                        <div 
                            className="flex items-center !bg-transparent border-b border-white/10 transition-all duration-500 !rounded-none"
                            style={{ borderColor: `${textColor}20` }}
                        >
                            <Lock className="w-3 h-3 mr-4 transition-colors duration-500" style={{ color: `${textColor}40` }} />
                            <input 
                                type="password" 
                                required 
                                autoComplete="new-password"
                                className="w-full !bg-transparent !border-none !outline-none py-2 px-0 font-bold text-sm tracking-widest text-left transition-all duration-1000" 
                                dir="ltr" 
                                style={{ color: textColor }}
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="w-full flex justify-center pt-6">
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="bg-transparent border-none p-0 outline-none transition-all active:scale-95 group relative"
                        >
                            <style>{`
                                @keyframes text-breathe-${primaryColor.replace('#', '')} {
                                    0%, 100% { text-shadow: 0 0 10px ${primaryColor}4d; opacity: 0.6; transform: scale(1); }
                                    50% { text-shadow: 0 0 30px ${primaryColor}, 0 0 50px ${primaryColor}66; opacity: 1; transform: scale(1.05); }
                                }
                            `}</style>
                            <span 
                                className="font-black text-xs uppercase tracking-[0.5em] block transition-all duration-1000"
                                style={{ 
                                    color: primaryColor,
                                    animation: `text-breathe-${primaryColor.replace('#', '')} 3s infinite ease-in-out`
                                }}
                            >
                                {loading ? t('register.processing') : t('register.title')}
                            </span>
                        </button>
                    </div>
                </form>

                <div className="mt-12 mb-8 flex flex-col items-center gap-6 animate-in fade-in duration-1000">
                    <Link to="/login" className="text-[9px] font-black uppercase tracking-[0.4em] transition-all hover:opacity-100" style={{ color: `${textColor}33`, hover: { color: primaryColor } } as any}>
                        {t('register.alreadyJoined')} <span className="underline underline-offset-4" style={{ color: `${primaryColor}99`, textDecorationColor: `${primaryColor}33` }}>{t('register.loginLink')}</span>
                    </Link>
                </div>

                {/* Bottom Right Language Toggle */}
                <button 
                    onClick={toggleLanguage} 
                    className="fixed bottom-3 right-4 md:right-6 w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-xl transition-all border z-50 group"
                    style={{ backgroundColor: `${textColor}05`, borderColor: `${textColor}10`, color: `${textColor}20` }}
                    title={i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                >
                    <Globe className="w-3.5 h-3.5" />
                    <span className="absolute right-full mr-3 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none" style={{ color: `${textColor}33` }}>
                        {i18n.language === 'en' ? 'AR' : 'EN'}
                    </span>
                </button>
            </div>
        </div>
    );
}
