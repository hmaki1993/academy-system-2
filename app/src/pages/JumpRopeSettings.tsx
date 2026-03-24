import React, { useState, useRef, useEffect } from 'react';
import { Upload, User, Palette, ChevronLeft, Check, Trash2, Dumbbell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const STORAGE_KEY = 'jump_rope_app_settings';

export const THEMES = [
    { id: 'ember',   name: 'Ember',   primary: '#ff3b30', glow: 'rgba(255,59,48,0.15)',   bg: '#0d0302', surface: 'rgba(255,59,48,0.04)', text: '#ffffff' },
    { id: 'ocean',   name: 'Ocean',   primary: '#0ea5e9', glow: 'rgba(14,165,233,0.15)',  bg: '#01090f', surface: 'rgba(14,165,233,0.04)', text: '#ffffff' },
    { id: 'aurora',  name: 'Aurora',  primary: '#a78bfa', glow: 'rgba(167,139,250,0.15)', bg: '#06020f', surface: 'rgba(167,139,250,0.04)', text: '#ffffff' },
    { id: 'lavender', name: 'Lavender', primary: '#c084fc', glow: 'rgba(192,132,252,0.15)', bg: '#0c0312', surface: 'rgba(192,132,252,0.04)', text: '#ffffff' },
    { id: 'mint',     name: 'Mint',     primary: '#4ade80', glow: 'rgba(74,222,128,0.15)',   bg: '#020d08', surface: 'rgba(74,222,128,0.04)', text: '#ffffff' },
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

    const activeTheme = THEMES.find(t => t.id === settings.themeId) || THEMES[0];

    return (
        <div className="flex-1 flex flex-col w-full text-white font-sans antialiased px-5 pt-6 pb-0 relative overflow-hidden" style={{ background: 'var(--jr-bg, #050505)' }}>
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => navigate('/jump-rope')}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 group"
                        style={{ background: 'var(--jr-surface)', border: '1px solid var(--jr-border)' }}
                    >
                        <ChevronLeft size={20} style={{ color: 'var(--jr-text-main)' }} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--jr-text-main)' }}>Settings</h1>
                    </div>
                </div>

                <div className="flex flex-col flex-1 pb-6 overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-5">
                        {/* — Profile Section — Standardized Layout */}
                        <div className="flex items-center gap-6 px-3 py-4">
                            <div
                                className="w-12 h-12 rounded-[14px] flex items-center justify-center relative overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-all group/avatar"
                                onClick={() => profileFileRef.current?.click()}
                                style={{ background: 'var(--jr-surface)', border: '1px solid var(--jr-border)' }}
                            >
                                {settings.profileDataUrl ? (
                                    <img src={settings.profileDataUrl} alt="profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} style={{ color: 'var(--color-text-muted)' }} />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                                    <Upload size={12} className="text-white" />
                                </div>
                            </div>
                            <div className="flex flex-col flex-1">
                                <label className="text-[11px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--jr-text-soft)' }}>Athlete Profile</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => profileFileRef.current?.click()}
                                        className="text-[10px] font-black uppercase tracking-[0.1em] text-primary hover:opacity-70 transition-colors"
                                    >
                                        Update Photo
                                    </button>
                                    {settings.profileDataUrl && (
                                        <button
                                            onClick={() => setSettings(s => ({ ...s, profileDataUrl: '' }))}
                                            className="text-[10px] font-black uppercase tracking-[0.1em] transition-all"
                                            style={{ color: settings.themeId === 'pure-white' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                            <input ref={profileFileRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} />
                        </div>

                        {/* — User Name Section — Standardized Layout (Zero-Layer) */}
                        <div className="flex items-center gap-6 px-3 py-4">
                            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: 'var(--jr-surface)', border: '1px solid var(--jr-border)' }}>
                                <User size={20} style={{ color: 'var(--color-text-muted)' }} />
                            </div>
                            <div className="flex flex-col flex-1 pb-1">
                                <label className="text-[11px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--jr-text-soft)' }}>Athlete Name</label>
                                <input
                                    type="text"
                                    value={settings.userName}
                                    onChange={e => setSettings(s => ({ ...s, userName: e.target.value }))}
                                    placeholder="Enter full name..."
                                    spellCheck={false}
                                    autoComplete="off"
                                    className="!bg-transparent !bg-none !border-none !border-0 !shadow-none !outline-none !p-0 !m-0 font-black flex-1 placeholder:opacity-10 focus:text-primary transition-colors h-6"
                                    style={{ color: 'var(--jr-text-main)' }}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-5 py-4">
                            <label className="text-[11px] font-black uppercase tracking-[0.3em] mb-1 pl-0.5" style={{ color: 'var(--jr-text-soft)' }}>Style Preset</label>
                            <div className="flex items-center gap-8 overflow-x-auto pb-4 pt-1 no-scrollbar -mx-3 px-4">
                                {THEMES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setSettings(s => ({ ...s, themeId: t.id }));
                                            saveSettings({ ...settings, themeId: t.id });
                                        }}
                                        className={`relative flex flex-col items-center gap-3 transition-all active:scale-95 group/theme shrink-0 py-0.5`}
                                    >
                                        <div 
                                            className={`w-10 h-10 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                                                settings.themeId === t.id 
                                                    ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.25)]' 
                                                    : 'border-white/5 group-hover/theme:border-white/20'
                                            }`}
                                        >
                                            <div
                                                className="w-7 h-7 rounded-full shadow-lg"
                                                style={{ 
                                                    background: `linear-gradient(135deg, ${t.primary}, ${t.primary}aa)`,
                                                    boxShadow: settings.themeId === t.id ? `0 0 15px ${t.glow}` : 'none' 
                                                }}
                                            />
                                        </div>
                                        <span className={`text-[7px] font-black uppercase tracking-[0.15em] transition-colors`} style={{
                                            color: settings.themeId === t.id ? 'var(--jr-text-main)' : 'var(--jr-text-soft)',
                                            opacity: settings.themeId === t.id ? 1 : 0.6
                                        }}>{t.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pb-4 flex justify-center">
                        <button
                            onClick={handleSave}
                            className={`px-10 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-[0.25em] transition-all duration-500 active:scale-95 shadow-[0_15px_35px_rgba(0,0,0,0.15)] relative overflow-hidden ${
                                saved
                                    ? 'bg-primary text-white border border-primary/40'
                                    : 'bg-white text-black hover:bg-zinc-100'
                            }`}
                        >
                            {saved ? '✓ Saved' : 'Save Profile'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
