import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Loader2, CheckCircle, AlertCircle, User, Dumbbell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function StaffRegister() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { settings } = useTheme();

    const coachId = searchParams.get('coach_id');
    const token = searchParams.get('token');

    const [step, setStep] = useState<'loading' | 'invalid' | 'form' | 'success'>('loading');
    const [coachData, setCoachData] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPass, setShowPass] = useState(false);

    // ──────────────────────────────────────────────
    // 1. Validate token on mount
    // ──────────────────────────────────────────────
    useEffect(() => {
        const validateInvite = async () => {
            if (!coachId || !token) {
                setStep('invalid');
                return;
            }

            try {
                // Fetch the coach record
                const { data: coach, error } = await supabase
                    .from('coaches')
                    .select('id, full_name, email, specialty, role, profile_id, avatar_url')
                    .eq('id', coachId)
                    .single();

                if (error || !coach) {
                    setStep('invalid');
                    return;
                }

                // Validate token: sha of coach_id + secret salt stored in DB
                // For simplicity, token = btoa(coach.id + "|" + coach.full_name)
                // This is validated client-side; edge function can be added for stronger security
                const expectedToken = btoa(`${coach.id}|${coach.full_name}|invite`);

                if (token !== expectedToken) {
                    setStep('invalid');
                    return;
                }

                // Check if already registered
                if (coach.profile_id) {
                    setStep('invalid');
                    setError('already_registered');
                    return;
                }

                setCoachData(coach);
                if (coach.email) setEmail(coach.email);
                setStep('form');
            } catch (err) {
                console.error('Invite validation error:', err);
                setStep('invalid');
            }
        };

        validateInvite();
    }, [coachId, token]);

    // ──────────────────────────────────────────────
    // 2. Handle Registration Submit
    // ──────────────────────────────────────────────
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        if (password !== confirmPassword) {
            setError('كلمتا المرور غير متطابقتان');
            return;
        }

        setLoading(true);

        try {
            // Sign up in Supabase Auth
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: coachData.full_name,
                        role: coachData.role || 'coach',
                    },
                },
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('فشل في إنشاء الحساب');

            // Link the auth user to the coach record
            const { error: linkError } = await supabase
                .from('coaches')
                .update({
                    profile_id: authData.user.id,
                    email: email,
                })
                .eq('id', coachId);

            if (linkError) {
                console.error('Error linking coach profile:', linkError);
                // Non-fatal: account created, just link failed
            }

            // Also create/update profiles table entry if needed
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    full_name: coachData.full_name,
                    role: coachData.role || 'coach',
                    email: email,
                }, { onConflict: 'id' });

            if (profileError) console.error('Profile upsert error:', profileError);

            setStep('success');

            // Auto-redirect after 3s
            setTimeout(() => navigate('/login'), 3000);

        } catch (err: any) {
            console.error('Registration error:', err);
            if (err.message?.includes('already registered') || err.message?.includes('User already registered')) {
                setError('هذا الإيميل مسجل بالفعل. حاول تسجيل الدخول.');
            } else {
                setError(err.message || 'حدث خطأ. حاول مرة أخرى.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────────────────────
    // THEME
    // ──────────────────────────────────────────────
    const primaryColor = settings?.primary_color || '#D4AF37';
    const bgColor = settings?.secondary_color || '#050505';
    const logoUrl = settings?.logo_url || '/logo.png';
    const academyName = settings?.academy_name || 'Academy';

    // ──────────────────────────────────────────────
    // RENDER: Loading
    // ──────────────────────────────────────────────
    if (step === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
                        <div className="absolute inset-0 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: `${primaryColor}` }} />
                    </div>
                    <p className="text-white/30 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">
                        Verifying Invite...
                    </p>
                </div>
            </div>
        );
    }

    // ──────────────────────────────────────────────
    // RENDER: Invalid / Already Registered
    // ──────────────────────────────────────────────
    if (step === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: bgColor }}>
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                            {error === 'already_registered' ? 'تم التسجيل مسبقاً' : 'رابط غير صالح'}
                        </h1>
                        <p className="text-white/40 font-bold text-sm leading-relaxed">
                            {error === 'already_registered'
                                ? 'هذا الحساب تم تفعيله بالفعل. يمكنك تسجيل الدخول الآن.'
                                : 'رابط الدعوة غير صالح أو منتهي الصلاحية. تواصل مع الأدمين للحصول على رابط جديد.'}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Mail className="w-4 h-4" />
                        تسجيل الدخول
                    </button>
                </div>
            </div>
        );
    }

    // ──────────────────────────────────────────────
    // RENDER: Success
    // ──────────────────────────────────────────────
    if (step === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: bgColor }}>
                {/* Glows */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[200px] opacity-20 animate-pulse" style={{ backgroundColor: primaryColor }} />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[200px] opacity-10 animate-pulse" style={{ backgroundColor: primaryColor }} />
                </div>

                <div className="relative z-10 max-w-md w-full text-center space-y-8">
                    <div
                        className="w-32 h-32 mx-auto rounded-full border-4 flex items-center justify-center shadow-2xl animate-bounce"
                        style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}20`, boxShadow: `0 0 60px ${primaryColor}50` }}
                    >
                        <CheckCircle className="w-16 h-16" style={{ color: primaryColor }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-3">
                            مرحباً بك!
                        </h1>
                        <p className="text-white/50 font-bold text-sm leading-relaxed">
                            تم تفعيل حسابك بنجاح في{' '}
                            <span style={{ color: primaryColor }}>{academyName}</span>
                            <br />
                            سيتم توجيهك لتسجيل الدخول خلال ثوانٍ...
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 10px 40px ${primaryColor}40` }}
                    >
                        تسجيل الدخول الآن
                    </button>
                </div>
            </div>
        );
    }

    // ──────────────────────────────────────────────
    // RENDER: Registration Form
    // ──────────────────────────────────────────────
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-cairo" style={{ backgroundColor: bgColor }}>

            {/* Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[200px] opacity-10 animate-pulse" style={{ backgroundColor: primaryColor }} />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[150px] opacity-8 animate-pulse" style={{ backgroundColor: primaryColor }} />
            </div>

            <div className="relative z-10 w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-10">
                    <img src={logoUrl} alt={academyName} className="h-16 w-auto object-contain mx-auto mb-6 drop-shadow-2xl" />
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-tight">
                        تفعيل الحساب
                    </h1>
                    <p className="text-white/30 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">
                        {academyName} · Staff Portal
                    </p>
                </div>

                {/* Coach Info Card */}
                <div
                    className="p-5 rounded-3xl border mb-8 flex items-center gap-4"
                    style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}
                >
                    {coachData?.avatar_url ? (
                        <img
                            src={coachData.avatar_url}
                            alt={coachData.full_name}
                            className="w-14 h-14 rounded-2xl object-cover border-2"
                            style={{ borderColor: primaryColor }}
                        />
                    ) : (
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 font-black text-xl"
                            style={{ backgroundColor: `${primaryColor}20`, borderColor: `${primaryColor}40`, color: primaryColor }}
                        >
                            {coachData?.full_name?.[0] || '?'}
                        </div>
                    )}
                    <div>
                        <p className="text-white font-black text-lg leading-tight">{coachData?.full_name}</p>
                        <p className="text-white/40 font-bold text-[10px] uppercase tracking-wider mt-1">
                            {coachData?.specialty || 'Staff Member'}
                        </p>
                        <div
                            className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border"
                            style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30`, color: primaryColor }}
                        >
                            <Dumbbell className="w-2.5 h-2.5" />
                            {coachData?.role || 'coach'}
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-red-400 font-bold text-sm">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleRegister} className="space-y-5">

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] block">
                            البريد الإلكتروني
                        </label>
                        <div
                            className="flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-300 focus-within:border-opacity-100"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                borderColor: 'rgba(255,255,255,0.08)',
                            }}
                        >
                            <Mail className="w-4 h-4 text-white/30 shrink-0" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                dir="ltr"
                                className="flex-1 bg-transparent text-white font-bold text-sm outline-none placeholder:text-white/15 tracking-wide"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] block">
                            كلمة المرور
                        </label>
                        <div
                            className="flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-300"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                borderColor: 'rgba(255,255,255,0.08)',
                            }}
                        >
                            <Lock className="w-4 h-4 text-white/30 shrink-0" />
                            <input
                                type={showPass ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                dir="ltr"
                                className="flex-1 bg-transparent text-white font-bold text-sm outline-none placeholder:text-white/15 tracking-widest"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="text-white/20 hover:text-white/60 transition-colors text-[10px] font-black uppercase tracking-widest"
                            >
                                {showPass ? 'إخفاء' : 'إظهار'}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] block">
                            تأكيد كلمة المرور
                        </label>
                        <div
                            className="flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-300"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                borderColor: confirmPassword && password !== confirmPassword ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)',
                            }}
                        >
                            <Lock className="w-4 h-4 text-white/30 shrink-0" />
                            <input
                                type={showPass ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                dir="ltr"
                                className="flex-1 bg-transparent text-white font-bold text-sm outline-none placeholder:text-white/15 tracking-widest"
                            />
                            {confirmPassword && (
                                <span className={`text-[10px] font-black ${password === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {password === confirmPassword ? '✓' : '✗'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4 relative overflow-hidden group"
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                            boxShadow: `0 15px 40px ${primaryColor}40`,
                        }}
                    >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                        ) : (
                            <>
                                <User className="w-4 h-4 relative z-10" />
                                <span className="relative z-10">تفعيل الحساب</span>
                            </>
                        )}
                    </button>

                    {/* Login link */}
                    <p className="text-center text-[10px] font-black text-white/20 uppercase tracking-widest pt-2">
                        عندك حساب بالفعل؟{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="hover:text-white/60 transition-colors underline underline-offset-4"
                            style={{ color: `${primaryColor}80` }}
                        >
                            سجل الدخول
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}
