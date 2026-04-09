import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Lock, Mail, Loader2, User, Globe, ChevronDown, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();

    // 1. Unified Prefill Logic (State or URL Query)
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
    const [role, setRole] = useState<'admin' | 'coach' | 'student'>(prefill.role || 'coach');
    const [studentId, setStudentId] = useState<string | null>(prefill.student_id || null);
    const [ptId, setPtId] = useState<string | null>(prefill.pt_id || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Client-side validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
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

            if (signUpError) {
                console.error('Registration error:', signUpError);
                throw signUpError;
            }

            if (data.user) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;

                // 2. Link Student Record (for Quick Add joins)
                if (role === 'student' && studentId) {
                    const { error: updateError } = await supabase
                        .from('students')
                        .update({ profile_id: data.user.id })
                        .eq('id', studentId);
                    if (updateError) console.error('Error linking student profile:', updateError);
                }

                // 3. Create Coach profile if applicable
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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to register');
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
        <div className="min-h-screen flex flex-col items-center justify-start bg-black font-cairo p-4 pt-4 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4"></div>

            <div className="w-full max-w-sm relative z-10 flex flex-col items-center bg-transparent border-none shadow-none">
                {/* Integrated Logo */}
                <div className="mb-2 animate-in fade-in zoom-in duration-1000">
                    <img src="/logo.png" alt="Logo" className="h-[60px] w-auto filter drop-shadow-[0_0_15px_rgba(239,68,68,0.2)]" />
                </div>

                {/* Floating Content */}
                <div className="w-full text-center mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                        {t('register.title')}
                    </h1>
                    <p className="text-red-500/40 mt-1 text-[9px] font-black uppercase tracking-[0.4em]">
                        {t('register.subtitle')}
                    </p>
                </div>

                {error && (
                    <div className="w-full bg-red-500/10 text-red-400 text-[10px] font-black p-3 rounded-none mb-6 border border-red-500/20 text-center animate-in fade-in scale-in duration-300 uppercase tracking-widest">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="w-full flex flex-col space-y-7 animate-in fade-in slide-in-from-bottom-8 duration-1000 bg-transparent border-none shadow-none">
                    <div className="space-y-1.5 px-0">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">{t('register.fullName')}</label>
                        <div className={`flex items-center !bg-transparent border-b ${prefill.full_name ? 'border-white/5 opacity-50' : 'border-white/10 focus-within:border-red-500/40'} transition-all duration-500 group !rounded-none !shadow-none`}>
                            <User className="w-3.5 h-3.5 text-white/40 group-focus-within:text-red-500/40 transition-colors mr-6" />
                            <input 
                                type="text" 
                                required 
                                readOnly={!!prefill.full_name} 
                                className="w-full !bg-transparent !border-none !outline-none py-3 px-0 text-white font-bold text-sm tracking-wide !shadow-none !rounded-none" 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 px-0">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">{t('register.phone')}</label>
                        <div className={`flex items-center !bg-transparent border-b ${prefill.phone ? 'border-white/5 opacity-50' : 'border-white/10 focus-within:border-red-500/40'} transition-all duration-500 group !rounded-none !shadow-none`}>
                            <Phone className="w-3.5 h-3.5 text-white/40 group-focus-within:text-red-500/40 transition-colors mr-6" />
                            <input 
                                type="text" 
                                required 
                                readOnly={!!prefill.phone} 
                                className="w-full !bg-transparent !border-none !outline-none py-3 px-0 text-white font-bold text-sm tracking-wide text-left !shadow-none !rounded-none" 
                                dir="ltr" 
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 px-0">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">{t('register.email')}</label>
                        <div className={`flex items-center !bg-transparent border-b ${prefill.email ? 'border-white/5 opacity-50' : 'border-white/10 focus-within:border-red-500/40'} transition-all duration-500 group !rounded-none !shadow-none`}>
                            <Mail className="w-3.5 h-3.5 text-white/40 group-focus-within:text-red-500/40 transition-colors mr-6" />
                            <input 
                                type="email" 
                                required 
                                readOnly={!!prefill.email} 
                                className="w-full !bg-transparent !border-none !outline-none py-3 px-0 text-white font-bold text-sm tracking-wide text-left !shadow-none !rounded-none" 
                                dir="ltr" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 px-0">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">{t('register.password')}</label>
                        <div className="flex items-center !bg-transparent border-b border-white/10 focus-within:border-red-500/40 transition-all duration-500 group !rounded-none !shadow-none">
                            <Lock className="w-3.5 h-3.5 text-white/40 group-focus-within:text-red-500/40 transition-colors mr-6" />
                            <input 
                                type="password" 
                                required 
                                className="w-full !bg-transparent !border-none !outline-none py-3 px-0 text-white font-bold text-sm tracking-widest text-left !shadow-none !rounded-none" 
                                dir="ltr" 
                                placeholder="••••••••" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                            />
                        </div>
                    </div>

                    {!prefill.role ? (
                        <div className="space-y-1.5 px-0">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">{t('register.role')}</label>
                            <div className="relative border-b border-white/10 focus-within:border-red-500/40 transition-all duration-500 !rounded-none">
                                <select 
                                    value={role} 
                                    onChange={(e) => setRole(e.target.value as any)} 
                                    className="w-full !px-0 !py-3 !bg-transparent text-white font-bold text-sm appearance-none outline-none cursor-pointer !rounded-none !border-none"
                                >
                                    <option value="coach" className="bg-black">{t('common.coach')}</option>
                                    <option value="admin" className="bg-black">{t('common.adminRole')}</option>
                                    <option value="student" className="bg-black">{t('common.student')}</option>
                                </select>
                                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 pointer-events-none" />
                            </div>
                        </div>
                    ) : (
                        <div className="hidden">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">Fixed Role</label>
                            <div className="text-red-500/20 font-black text-[10px] uppercase tracking-widest">{role}</div>
                        </div>
                    )}

                    <div className="w-full flex justify-center pt-10">
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="bg-transparent border-none p-0 outline-none transition-all active:scale-95 group relative"
                        >
                            <style>{`
                                @keyframes text-breathe {
                                    0%, 100% { text-shadow: 0 0 10px rgba(220, 38, 38, 0.3); opacity: 0.6; transform: scale(1); }
                                    50% { text-shadow: 0 0 30px rgba(220, 38, 38, 0.8), 0 0 50px rgba(220, 38, 38, 0.4); opacity: 1; transform: scale(1.05); }
                                }
                            `}</style>
                            <span className="text-red-600 font-black text-xs uppercase tracking-[0.5em] animate-[text-breathe_3s_infinite_ease-in-out] block">
                                {loading ? t('register.processing') : t('register.title')}
                            </span>
                        </button>
                    </div>
                </form>

                <div className="mt-8 flex flex-col items-center gap-6 animate-in fade-in duration-1000">
                    <Link to="/login" className="text-[9px] font-black text-white/20 hover:text-red-500 uppercase tracking-[0.4em] transition-all">
                        {t('register.alreadyJoined')} <span className="text-red-500/60 underline underline-offset-4 decoration-red-500/20">{t('register.loginLink')}</span>
                    </Link>
                </div>

                {/* Bottom Right Language Toggle */}
                <button 
                    onClick={toggleLanguage} 
                    className="fixed bottom-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.02] text-white/10 hover:text-white/40 hover:bg-white/[0.05] transition-all border border-white/5 z-50 group"
                    title={i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                >
                    <Globe className="w-3.5 h-3.5" />
                    <span className="absolute right-full mr-3 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none text-white/20">
                        {i18n.language === 'en' ? 'AR' : 'EN'}
                    </span>
                </button>
            </div>
        </div>
    );
}
