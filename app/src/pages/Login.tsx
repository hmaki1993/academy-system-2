import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { getResponsiveLoginSettings } from '../utils/theme';
import { LoginRenderer } from './settings/components/LoginRenderer';

interface LoginProps {
    isPreview?: boolean;
    isFullScreen?: boolean;
    previewSettings?: any;
    forcedDesignMode?: 'desktop' | 'mobile';
}

export default function Login({ isPreview = false, isFullScreen = false, previewSettings, forcedDesignMode }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { settings } = useTheme();

    // Responsive design mode detection
    const [autoIsMobileView, setAutoIsMobileView] = useState(() => {
        return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    });

    useEffect(() => {
        const handleResize = () => {
            setAutoIsMobileView(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobileView = forcedDesignMode ? forcedDesignMode === 'mobile' : autoIsMobileView;
    const activeRawSettings = previewSettings || settings;

    // Resolve settings based on viewport (Desktop vs Mobile customization)
    const activeSettings = useMemo(() => {
        return getResponsiveLoginSettings(activeRawSettings, isMobileView);
    }, [activeRawSettings, isMobileView]);

    useEffect(() => {
        if (isPreview) return; // Skip session redirect when rendering as a preview

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/app');
            }
        };
        checkSession();
    }, [navigate, isPreview]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/app');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to login');
            }
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
        <div className={`relative ${isPreview ? 'h-full' : 'h-[100dvh]'} w-full overflow-hidden bg-black`}>
            <LoginRenderer
                activeSettings={activeSettings}
                designMode={isMobileView ? 'mobile' : 'desktop'}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                loading={loading}
                error={error}
                handleLogin={handleLogin}
                toggleLanguage={toggleLanguage}
                t={t}
                i18n={i18n}
                isPreview={isPreview || isMobileView}
                isFullScreen={isFullScreen || !isPreview} // Propagated or True if live page
                disableInteraction={isPreview}
            />
        </div>
    );
}
