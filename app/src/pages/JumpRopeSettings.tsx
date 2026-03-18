import React, { useState, useRef, useEffect } from 'react';
import { Upload, User, Palette, ChevronLeft, Check, Trash2, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    themeId: string;
}

const DEFAULT: JrSettings = {
    appName: 'Jump Rope Pro',
    userName: '',
    logoDataUrl: '',
    themeId: 'ember',
};

export function loadJrSettings(): JrSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULT };
}

export function applyJrTheme(settings: JrSettings) {
    const theme = THEMES.find(t => t.id === settings.themeId) || THEMES[0];
    const root = document.documentElement;
    const isLight = theme.text === '#000000';

    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-text-base', theme.text || '#ffffff');
    root.style.setProperty('--jr-text-low', isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)');
    root.style.setProperty('--jr-glow', theme.glow);
    root.style.setProperty('--jr-bg', theme.bg);
    root.style.setProperty('--jr-surface', theme.surface);
    document.title = settings.appName || 'Jump Rope Pro';
}

function saveSettings(s: JrSettings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    applyJrTheme(s);
}

export default function JumpRopeSettings() {
    const navigate = useNavigate();
    const fileRef = useRef<HTMLInputElement>(null);
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

    const handleSave = () => {
        saveSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const activeTheme = THEMES.find(t => t.id === settings.themeId) || THEMES[0];

    return (
        <div className="min-h-screen text-white font-sans antialiased px-5 pt-6 pb-28" style={{ background: 'var(--jr-bg, #050505)' }}>
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

            <div className="flex flex-col gap-6">
                {/* — Logo Section — */}
                <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 mb-4">App Logo</p>
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-white/20 transition-all"
                            onClick={() => fileRef.current?.click()}
                        >
                            {settings.logoDataUrl ? (
                                <img src={settings.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                                <Dumbbell size={24} className="text-white/20" />
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
                            >
                                <Upload size={12} />
                                Upload Image
                            </button>
                            {settings.logoDataUrl && (
                                <button
                                    onClick={() => setSettings(s => ({ ...s, logoDataUrl: '' }))}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-red-400/50 hover:text-red-400 transition-all"
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
                <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 mb-4">App Name</p>
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
                <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 mb-4">Your Name</p>
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
                <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
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

                {/* — Save Button — */}
                <button
                    onClick={handleSave}
                    className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] transition-all duration-300 active:scale-95 ${
                        saved
                            ? 'text-white'
                            : 'bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.1] backdrop-blur-3xl'
                    }`}
                    style={saved ? { background: activeTheme.primary, border: `1px solid ${activeTheme.primary}` } : {}}
                >
                    {saved ? '✓ Saved & Applied!' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}
