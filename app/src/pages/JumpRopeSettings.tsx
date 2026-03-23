import React, { useState, useRef, useEffect } from 'react';
import { Upload, User, Palette, ChevronLeft, Check, Trash2, Dumbbell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const STORAGE_KEY = 'jump_rope_app_settings';

export const THEMES = [
    { id: 'ember',   name: 'Ember',   primary: '#ff3b30', glow: 'rgba(255,59,48,0.15)',   bg: '#0d0302', surface: 'rgba(255,59,48,0.04)', text: '#ffffff' },
    { id: 'ocean',   name: 'Ocean',   primary: '#0ea5e9', glow: 'rgba(14,165,233,0.15)',  bg: '#01090f', surface: 'rgba(14,165,233,0.04)', text: '#ffffff' },
    { id: 'aurora',  name: 'Aurora',  primary: '#a78bfa', glow: 'rgba(167,139,250,0.15)', bg: '#06020f', surface: 'rgba(167,139,250,0.04)', text: '#ffffff' },
    { id: 'pure-black', name: 'Black', primary: '#ffffff', glow: 'rgba(255,255,255,0.1)', bg: '#000000', surface: 'rgba(255,255,255,0.05)', text: '#ffffff' },
    { id: 'pure-white', name: 'White', primary: '#000000', glow: 'rgba(0,0,0,0.1)',       bg: '#ffffff', surface: 'rgba(0,0,0,0.05)',       text: '#000000' },
    { id: 'rose',    name: 'Rose',    primary: '#f43f5e', glow: 'rgba(244,63,94,0.15)',   bg: '#0f0207', surface: 'rgba(244,63,94,0.04)', text: '#ffffff' },
];

export interface JrSettings {
    appName: string;
    userName: string;
    logoDataUrl: string;
    profileDataUrl: string;
    themeId: string;
}

const DEFAULT: JrSettings = {
    appName: 'Jump Rope Pro',
    userName: '',
    logoDataUrl: '',
    profileDataUrl: '',
    themeId: 'ember',
};

export function loadJrSettings(): JrSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.appName === 'JUMP ROP BRO') parsed.appName = 'Jump Rope Pro';
            return { ...DEFAULT, ...parsed };
        }
    } catch {}
    return { ...DEFAULT };
}

export function applyJrTheme(settings: JrSettings) {
    document.title = settings.appName || 'Jump Rope Pro';
}

function saveSettings(s: JrSettings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
        console.error('[JR] Failed to save settings to localStorage:', e);
    }
    applyJrTheme(s);
    // Notify the layout (and any listeners) that settings changed
    window.dispatchEvent(new CustomEvent('jrSettingsChanged', { detail: s }));
}

export default function JumpRopeSettings() {
    const navigate = useNavigate();
    const fileRef = useRef<HTMLInputElement>(null);
    const profileFileRef = useRef<HTMLInputElement>(null);
    const [settings, setSettings] = useState<JrSettings>(loadJrSettings);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        document.title = `${settings.appName || 'Jump Rope Pro'} — Settings`;
    }, [settings.appName]);

    const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            setSettings(s => ({ ...s, logoDataUrl: ev.target?.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleProfilePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            setSettings(s => ({ ...s, profileDataUrl: ev.target?.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        saveSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/login');
        } catch (e) {
            console.error('Logout error:', e);
        }
    };

    const activeTheme = THEMES.find(t => t.id === settings.themeId) || THEMES[0];

    return (
        <div className="flex-1 flex flex-col w-full text-white font-sans antialiased px-5 pt-6 pb-0 relative overflow-hidden" style={{ background: 'var(--jr-bg, #050505)' }}>
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col flex-1">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <button
                    onClick={() => navigate('/jump-rope')}
                    className="w-9 h-9 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
                >
                    <ChevronLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-black">Settings</h1>
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">App Configuration</p>
                </div>
            </div>

            <div className="flex flex-col flex-1 pb-2">
                <div className="flex flex-col gap-4 mb-4">
                    {/* — Profile Photo Section — */}
                    <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-4 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 mb-4">Profile Photo</p>
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-white/20 transition-all"
                            onClick={() => profileFileRef.current?.click()}
                        >
                            {settings.profileDataUrl ? (
                                <img src={settings.profileDataUrl} alt="profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={24} className="text-white/20" />
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => profileFileRef.current?.click()}
                                className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
                            >
                                <Upload size={12} />
                                Upload Photo
                            </button>
                            {settings.profileDataUrl && (
                                <button
                                    onClick={() => setSettings(s => ({ ...s, profileDataUrl: '' }))}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-red-400/50 hover:text-red-400 transition-all"
                                >
                                    <Trash2 size={12} />
                                    Remove
                                </button>
                            )}
                        </div>
                        <input ref={profileFileRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} />
                    </div>
                </section>

                {/* — Logo Section — */}
                <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-4 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 mb-3">Brand Logo</p>
                    <div className="flex items-center gap-4">
                        <div
                            className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-white/20 transition-all"
                            onClick={() => fileRef.current?.click()}
                        >
                            {settings.logoDataUrl ? (
                                <img src={settings.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                                <Dumbbell size={20} className="text-white/20" />
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5 text-left">
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
                            >
                                <Upload size={12} />
                                Change Logo
                            </button>
                            {settings.logoDataUrl && (
                                <button
                                    onClick={() => setSettings(s => ({ ...s, logoDataUrl: '' }))}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-red-400/50 hover:text-red-400 transition-all px-1"
                                >
                                    <Trash2 size={12} />
                                    Remove
                                </button>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                    </div>
                </section>

                {/* — App Name — */}
                <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-4 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 mb-3">App Name</p>
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 focus-within:border-white/20 transition-all">
                        <Dumbbell size={14} className="text-white/20 flex-shrink-0" />
                        <input
                            type="text"
                            value={settings.appName}
                            onChange={e => setSettings(s => ({ ...s, appName: e.target.value }))}
                            placeholder="Jump Rope Pro"
                            className="bg-transparent text-white text-sm font-bold outline-none flex-1 placeholder:text-white/10"
                        />
                    </div>
                </section>

                {/* — User Name — */}
                <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-4 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 mb-3">Your Name</p>
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 focus-within:border-white/20 transition-all">
                        <User size={14} className="text-white/20 flex-shrink-0" />
                        <input
                            type="text"
                            value={settings.userName}
                            onChange={e => setSettings(s => ({ ...s, userName: e.target.value }))}
                            placeholder="Athlete name..."
                            className="bg-transparent text-white text-sm font-bold outline-none flex-1 placeholder:text-white/10"
                        />
                    </div>
                </section>

                {/* — Theme Picker — */}
                <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-4">
                        <Palette size={14} className="text-white/20" />
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20">Color Theme</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {THEMES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSettings(s => ({ ...s, themeId: t.id }))}
                                className={`relative flex flex-col items-center gap-2 rounded-2xl p-3 border transition-all active:scale-95 ${
                                    settings.themeId === t.id
                                        ? 'border-white/30 bg-white/[0.06]'
                                        : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                                }`}
                            >
                                <div
                                    className="w-8 h-8 rounded-xl shadow-lg"
                                    style={{ background: `radial-gradient(circle at 35% 35%, ${t.primary}, ${t.primary}60)`, boxShadow: `0 4px 15px ${t.glow}` }}
                                />
                                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/40">{t.name}</span>
                                {settings.themeId === t.id && (
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: t.primary }}>
                                        <Check size={9} className="text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Live Preview Strip */}
                    <div
                        className="mt-4 rounded-2xl h-12 flex items-center justify-center gap-3 transition-all duration-500"
                        style={{ background: `linear-gradient(135deg, ${activeTheme.bg}, ${activeTheme.primary}15)`, border: `1px solid ${activeTheme.primary}25` }}
                    >
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: activeTheme.primary, boxShadow: `0 0 8px ${activeTheme.primary}` }} />
                        <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: activeTheme.primary }}>
                            {activeTheme.name} Theme
                        </span>
                        <div className="w-8 h-1 rounded-full opacity-40" style={{ background: activeTheme.primary }} />
                    </div>

                    <p className="text-[8px] text-white/15 uppercase tracking-[0.2em] mt-3 text-center">
                        Theme changes every screen in the app
                    </p>
                </section>

                {/* — Actions — */}
                <div className="mt-auto pt-6 flex flex-col gap-3">
                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        className={`w-full py-4 rounded-full font-black uppercase text-[11px] tracking-[0.3em] transition-all duration-500 active:scale-95 shadow-lg group relative overflow-hidden ${
                            saved
                                ? 'text-white'
                                : 'bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08] backdrop-blur-xl'
                        }`}
                        style={saved ? { background: activeTheme.primary, border: `1px solid ${activeTheme.primary}` } : {}}
                    >
                        {!saved && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />}
                        {saved ? '✓ Saved & Applied!' : 'Save Settings'}
                    </button>

                    {/* Logout / Switch Account */}
                    <button
                        onClick={handleLogout}
                        className="w-full py-3.5 flex items-center justify-center gap-2 rounded-full font-black uppercase text-[10px] tracking-widest text-white/30 hover:text-white/80 hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all duration-300 active:scale-95 backdrop-blur-3xl"
                    >
                        <LogOut size={12} className="shrink-0" />
                        Switch User Account
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
);
}
