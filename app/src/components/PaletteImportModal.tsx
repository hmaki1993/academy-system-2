import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Check, RefreshCw, Pipette, Sparkles, ChevronRight, Trash2, Clock, Plus, ArrowLeft, Pencil, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'primary' | 'secondary' | 'accent' | 'surface' | 'bg' | 'input' | 'menu_icon' | 'search_icon' | 'text_base' | 'text_muted' | 'hover' | 'hover_border';

interface ExtractedColor { hex: string; count: number; }

interface RolePalette { primary: string; secondary: string; accent: string; surface: string; bg: string; input: string; menu_icon: string; search_icon: string; text_base: string; text_muted: string; hover: string; hover_border: string; }

interface SavedPalette {
    id: string;
    name: string;
    createdAt: number;
    colors: RolePalette;
    extractedColors: string[];   // full set for re-editing
    imageThumb?: string;
}

interface Props { onClose: () => void; onApply: (p: RolePalette) => void; }

import { useTheme } from '../context/ThemeContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractColors(img: HTMLImageElement, n = 8): ExtractedColor[] {
    const c = document.createElement('canvas');
    const r = Math.min(200 / img.width, 200 / img.height, 1);
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0, c.width, c.height);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const map = new Map<string, number>();
    for (let i = 0; i < data.length; i += 12) {
        const rr = Math.round(data[i] / 24) * 24, gg = Math.round(data[i + 1] / 24) * 24, bb = Math.round(data[i + 2] / 24) * 24;
        if (data[i + 3] < 128) continue;
        const h = `#${Math.min(rr, 255).toString(16).padStart(2, '0')}${Math.min(gg, 255).toString(16).padStart(2, '0')}${Math.min(bb, 255).toString(16).padStart(2, '0')}`;
        map.set(h, (map.get(h) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
        .map(([hex, count]) => ({ hex, count }))
        .filter(({ hex }) => { const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16), br = (rr * 299 + gg * 587 + bb * 114) / 1000; return br > 15 && br < 245; })
        .slice(0, n);
}

function thumb(img: HTMLImageElement): string {
    const c = document.createElement('canvas'); c.width = 80; c.height = 40;
    c.getContext('2d')!.drawImage(img, 0, 0, 80, 40); return c.toDataURL('image/jpeg', 0.6);
}

function lum(hex: string) {
    const cleanHex = hex.slice(0, 7); // Base color for luminance
    const r = parseInt(cleanHex.slice(1, 3), 16) / 255, g = parseInt(cleanHex.slice(3, 5), 16) / 255, b = parseInt(cleanHex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ─── Opacity Utils ──────────────────────────────────────────────────────────
const toAlpha = (p: number) => Math.round(p * 255).toString(16).padStart(2, '0');
const fromAlpha = (hex: string) => {
    if (hex.length < 9) return 1;
    return parseInt(hex.slice(7, 9), 16) / 255;
};
const applyAlpha = (hex: string, op: number) => {
    const base = hex.slice(0, 7);
    if (op >= 0.99) return base;
    return base + toAlpha(op);
};

const normalizeHex = (hex: string | undefined | null) => {
    if (!hex) return '';
    // If it's a 3-char hex like #abc, expand it to #aabbcc
    if (hex.length === 4) {
        return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
    }
    return hex.slice(0, 7).toLowerCase(); // Ignore alpha channel for strict color matching
};

function autoRoles(colors: ExtractedColor[]): Record<Role, string> {
    const byLum = [...colors].sort((a, b) => lum(a.hex) - lum(b.hex));
    const bySat = [...colors].sort((a, b) => {
        const s = (h: string) => { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, bv = parseInt(h.slice(5, 7), 16) / 255, mx = Math.max(r, g, bv), mn = Math.min(r, g, bv); return mx === 0 ? 0 : (mx - mn) / mx; };
        return s(b.hex) - s(a.hex);
    });

    // Default fallback
    const def = colors[0]?.hex || '#1a1a2e';
    const out: Record<Role, string> = {
        primary: def, accent: def, bg: def, secondary: def, surface: def, input: def, menu_icon: '#ffffff', search_icon: '#ffffff',
        text_base: '#f8fafc', text_muted: '#ffffff99',
        hover: def + '33', hover_border: def + '66'
    };

    // 1. Sophisticated Background Selection
    // We want the darkest stable color for the background
    const darkest = byLum[0]?.hex || '#0a0a0f';
    out.bg = darkest;

    // 2. Surface & Secondary (stair-step luminance)
    if (byLum.length > 2) {
        out.secondary = byLum[1].hex;
        out.surface = byLum[2].hex;
    } else {
        out.secondary = applyAlpha(darkest, 1.2); // synthetic lift
        out.surface = applyAlpha(darkest, 1.4);
    }

    // 3. Brand Colors (Primary & Accent)
    // Use most saturated for primary, second most for accent
    if (bySat.length > 1) {
        out.primary = bySat[0].hex;
        out.accent = bySat[1].hex;
    } else {
        out.primary = bySat[0]?.hex || '#7c3aed';
        out.accent = '#f472b6';
    }

    // 4. Input & Search
    out.input = out.surface;
    
    // 5. Text Logic based on Background contrast
    const isBgLight = lum(out.bg) > 0.5;
    out.text_base = isBgLight ? '#0f172a' : '#f8fafc';
    out.text_muted = isBgLight ? '#475569' : '#ffffff99';
    
    out.menu_icon = isBgLight ? '#0f172a' : '#ffffff';
    out.search_icon = out.text_muted;

    // 6. Dynamic Hovers (derived from Primary)
    out.hover = out.primary + '33'; 
    out.hover_border = out.primary + '66';

    return out;
}

const ROLES: { role: Role; label: string }[] = [
    { role: 'primary', label: 'Primary' }, { role: 'accent', label: 'Accent' },
    { role: 'bg', label: 'Background' }, { role: 'secondary', label: 'Secondary' },
    { role: 'surface', label: 'Surface' }, { role: 'input', label: 'Input BG' },
    { role: 'menu_icon', label: 'Menu Icons' }, { role: 'search_icon', label: 'Search Icons' },
    { role: 'text_base', label: 'Text Base' }, { role: 'text_muted', label: 'Text Muted' },
    { role: 'hover', label: 'Hover Glow' }, { role: 'hover_border', label: 'Hover Border' },
];

const SK = 'academy_saved_palettes';
const load = (): SavedPalette[] => {
    try {
        const raw = localStorage.getItem(SK) || '[]';
        // Sanitize legacy rgba strings to hex or stable formats to prevent crashes
        const sanitized = raw.replace(/rgba\(255, 255, 255, 0\.6\)/g, '#ffffff99')
            .replace(/rgba\(0, 0, 0, 0\.6\)/g, '#00000099');
        return JSON.parse(sanitized);
    } catch { return []; }
};
const persist = (list: SavedPalette[]) => localStorage.setItem(SK, JSON.stringify(list));

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Shared color editor used in both "new" and "edit" views */
function ColorEditor({ colors, assignments, onAssign, activeRole, onSetActive, paletteName, onSetName, onSaveApply, onApplyOnly, onReset, saveLabel = 'Save & Apply' }: {
    colors: string[];
    assignments: Record<Role, string>;
    onAssign: (hex: string, role: Role) => void;
    activeRole: Role | null;
    onSetActive: (r: Role | null) => void;
    paletteName: string;
    onSetName: (n: string) => void;
    onSaveApply: () => void;
    onApplyOnly: () => void;
    onReset?: () => void;
    saveLabel?: string;
}) {
    const getHex = (role: Role) => assignments[role] || '#1a1a2e';
    const primaryHex = getHex('primary');
    const accentHex = getHex('accent');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [previewScale, setPreviewScale] = useState(0.26);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const [isCursorGrabbing, setIsCursorGrabbing] = useState(false);

    // Mouse wheel zoom on the live preview
    const handlePreviewWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setPreviewScale(prev => Math.min(1.0, Math.max(0.1, prev - e.deltaY * 0.0005)));
    };

    // Drag to pan
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        setIsCursorGrabbing(true);
    };
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        setPanX(prev => prev + dx);
        setPanY(prev => prev + dy);
    };
    const handleMouseUp = () => {
        isDragging.current = false;
        setIsCursorGrabbing(false);
    };

    const [previewUrl, setPreviewUrl] = useState('#/app');

    // Apply palette colors to the real app's CSS variables in real-time via the iframe
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;
        const root = iframe.contentDocument.documentElement;
        root.style.setProperty('--color-primary', assignments.primary);
        root.style.setProperty('--color-secondary', assignments.secondary);
        root.style.setProperty('--color-background', assignments.bg);
        root.style.setProperty('--color-accent', assignments.accent);
        root.style.setProperty('--color-surface', assignments.surface);
        root.style.setProperty('--color-input-bg', assignments.input);
        root.style.setProperty('--color-menu-icon', assignments.menu_icon);
        root.style.setProperty('--color-search-icon', assignments.search_icon);
        root.style.setProperty('--color-text-base', assignments.text_base);
        root.style.setProperty('--color-text-muted', assignments.text_muted);
        root.style.setProperty('--color-hover', assignments.hover);
        root.style.setProperty('--color-hover-border', assignments.hover_border);
    }, [assignments, previewUrl]);

    // Highlight elements in the iframe based on the activeRole
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;
        const doc = iframe.contentDocument;
        let style = doc.getElementById('palette-highlighter');
        if (!style) {
            style = doc.createElement('style');
            style.id = 'palette-highlighter';
            doc.head.appendChild(style);
        }

        if (!activeRole) {
            style.textContent = '';
            return;
        }

        const selectors: Record<Role, string> = {
            primary: '.bg-primary, .text-primary, .border-primary, [style*="--color-primary"], .nav-icon-container.active, .text-primary-foreground',
            secondary: '.bg-secondary, .text-secondary, [style*="--color-secondary"]',
            accent: '.bg-accent, .text-accent, .border-accent, [style*="--color-accent"]',
            bg: 'body, .bg-background, [style*="--color-background"], aside, .bg-secondary_color, .chat-bg',
            surface: '.bg-surface, [style*="--color-surface"], .glass-card, .bg-white\\/5, .bg-white\\/10, .bg-white\\/20, .bg-white\\/3, .bg-white\\/\\[0\\.03\\], .bg-white\\/\\[0\\.05\\], .bg-white\\/\\[0\\.06\\], .bg-white\\/\\[0\\.08\\]',
            input: 'input, textarea, select, [class*="bg-input"], [style*="--color-input-bg"]',
            menu_icon: '.nav-icon-container:not(.active), [style*="--color-menu-icon"]',
            search_icon: '[style*="--color-search-icon"], .search-icon',
            text_base: 'h1, h2, h3, h4, .text-base, .text-white, [style*="--color-text-base"]',
            text_muted: '.text-muted, [class*="text-white/40"], [style*="--color-text-muted"], .text-gray-400, .text-slate-400',
            hover: '.hover-glow, [style*="--color-hover"], .hover\\:bg-white\\/5, .hover\\:bg-white\\/10, .hover\\:bg-primary\\/10, [class*="hover:bg-white"], .glass-card, .pastel-card, .group\\/call, .hover\\:bg-white\\/\\[0\\.08\\]',
            hover_border: '[style*="--color-hover-border"], .hover\\:border-white\\/10, .hover\\:border-white\\/20, [class*="hover:border-white"], .border-white\\/10'
        };

        const selector = selectors[activeRole] || '';
        const isHoverRole = activeRole === 'hover';

        if (selector) {
            style.textContent = `
                @keyframes pulse-highlight {
                    0% { outline: 4px solid #a855f7; outline-offset: 0px; box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
                    50% { outline: 4px solid #d8b4fe; outline-offset: 6px; box-shadow: 0 0 20px 10px rgba(168, 85, 247, 0); }
                    100% { outline: 4px solid #a855f7; outline-offset: 0px; box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
                }
                ${selector} {
                    animation: ${isHoverRole ? 'none' : 'pulse-highlight 1.5s infinite ease-in-out'} !important;
                    transition: all 0.3s !important;
                    position: relative !important;
                    z-index: 50 !important;
                    ${isHoverRole ? `
                        background-color: var(--color-hover) !important;
                        box-shadow: 0 0 40px 10px color-mix(in srgb, var(--color-hover), transparent 60%) !important;
                        transform: translateY(-8px) scale(1.02) !important;
                        filter: brightness(1.2) !important;
                        outline: 2px solid #a855f7 !important;
                        outline-offset: 4px !important;
                    ` : ''}
                }
            `;
        } else {
            style.textContent = '';
        }
    }, [activeRole]);

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-[1fr_340px] min-h-0">

                {/* ── LEFT: Controls ── */}
                <div className="overflow-y-auto px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5 border-r border-white/[0.04]">
                    {/* Swatches */}
                    <div>
                        <p className="text-[10px] md:text-[12px] font-black text-white/15 uppercase tracking-[0.15em] md:tracking-[0.2em] mb-2 md:mb-3">
                            {activeRole
                                ? <span className="text-purple-400 animate-pulse">↑ Tap a color to assign as <strong>{activeRole.toUpperCase()}</strong></span>
                                : '① Select a role below  ② tap a color above'}
                        </p>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                            {colors.map((hex, i) => {
                                const roles = ROLES.filter(r => assignments[r.role] === hex);
                                const isTarget = activeRole && assignments[activeRole] === hex;
                                return (
                                    <button key={i}
                                        onClick={() => { if (activeRole) { onAssign(hex, activeRole); onSetActive(null); } }}
                                        className={`relative flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl border-2 transition-all duration-200 shadow-md
                                            ${activeRole ? 'hover:scale-110 cursor-pointer hover:border-white/40' : 'cursor-default'}
                                            ${isTarget ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-white/10'}`}
                                        style={{ backgroundColor: hex }} title={hex}
                                    >
                                        {roles.length > 0 && (
                                            <div className="absolute -top-1.5 -right-1.5 flex flex-col gap-0.5 items-end">
                                                {roles.map(r => (
                                                    <span key={r.role} className="text-[4.5px] font-black uppercase bg-black/90 text-white/90 px-1 py-0.5 rounded-[3px] border border-white/10 shadow-sm leading-none whitespace-nowrap">
                                                        {r.role.slice(0, 3)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Role grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {ROLES.map(({ role, label }) => {
                            const hex = getHex(role), isActive = activeRole === role;
                            const op = fromAlpha(hex);
                            return (
                                <div key={role}
                                    onClick={() => onSetActive(isActive ? null : role)}
                                    className={`group/role relative flex flex-col gap-1.5 md:gap-2 p-2 md:p-2.5 rounded-lg md:rounded-xl border transition-all duration-300 text-left overflow-hidden cursor-pointer
                                        ${isActive
                                            ? 'border-purple-500/40 bg-purple-500/10 shadow-[0_10px_20px_-10px_rgba(168,85,247,0.3)]'
                                            : 'border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg border border-white/10 flex-shrink-0 shadow-inner" style={{ backgroundColor: hex }} />
                                        <div className="flex-1 min-w-0">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] truncate block ${isActive ? 'text-purple-400' : 'text-white/40'}`}>{label}</span>
                                            <code className={`text-[9px] font-mono truncate block ${isActive ? 'text-purple-400/60' : 'text-white/15'}`}>
                                                {hex.toUpperCase()} {op < 1 && `(${Math.round(op * 100)}%)`}
                                            </code>
                                        </div>

                                        {/* Manual Selection Pipette */}
                                        <label className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-all active:scale-95 z-10 shrink-0 group-hover/role:opacity-100 opacity-0"
                                            onClick={(e) => e.stopPropagation()}
                                            title="Pick Custom Color"
                                        >
                                            <Pipette className={`w-3 h-3 ${isActive ? 'text-purple-400' : 'text-white/30'}`} />
                                            <input
                                                type="color"
                                                className="sr-only"
                                                value={hex.startsWith('#') && hex.slice(0, 7).length === 7 ? hex.slice(0, 7) : '#7c3aed'}
                                                onChange={(e) => {
                                                    const newColor = applyAlpha(e.target.value, op);
                                                    onAssign(newColor, role);
                                                }}
                                            />
                                        </label>
                                    </div>

                                    {/* Opacity Slider */}
                                    <div className={`mt-0.5 space-y-1 transition-all duration-300 ${isActive ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex justify-between items-center px-0.5">
                                            <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Opacity</span>
                                            <span className="text-[7px] font-black text-purple-400/60">{Math.round(op * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={op}
                                            onChange={(e) => {
                                                const newHex = applyAlpha(hex, parseFloat(e.target.value));
                                                onAssign(newHex, role);
                                            }}
                                            className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
                                        />
                                    </div>

                                    {isActive && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-purple-500/60" />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Name */}
                    <div className="mt-2">
                        <p className="text-[10px] md:text-[12px] font-black text-white/15 uppercase tracking-[0.15em] md:tracking-[0.2em] mb-2">Palette Name</p>
                        <input type="text" value={paletteName} onChange={e => onSetName(e.target.value)}
                            placeholder="e.g. Ocean Night…"
                            className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.06] text-white text-[11px] font-bold outline-none focus:border-purple-500/40 transition-all placeholder:text-white/30"
                            style={{ color: lum(getHex('input')) > 0.4 ? '#000' : '#fff' }}
                        />
                    </div>
                </div>

                {/* ── RIGHT: Live Dashboard Preview ── */}
                <div className="overflow-hidden flex flex-col gap-3 px-3 py-4">
                    <p className="text-[10px] md:text-[12px] font-black text-white/15 uppercase tracking-[0.15em] md:tracking-[0.2em] flex items-center gap-2 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                        {activeRole
                            ? <span className="text-purple-400 animate-pulse">Highlighting: {activeRole.toUpperCase()}</span>
                            : 'Live Preview'}
                        <div className="ml-auto flex items-center gap-1.5 p-0.5 bg-black/40 rounded-lg border border-white/5">
                            {[
                                { id: '#/app', label: 'Home' },
                                { id: '#/app/communications', label: 'Chat' }
                            ].map(site => (
                                <button
                                    key={site.id}
                                    onClick={() => setPreviewUrl(site.id)}
                                    className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${previewUrl === site.id ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white'}`}
                                >
                                    {site.label}
                                </button>
                            ))}
                        </div>
                        <span className="ml-2 text-[9px] font-mono text-white/20">{Math.round(previewScale * 100)}% · scroll to zoom · drag to pan</span>
                    </p>

                    {/* Real iframe - scaled-down live app */}
                    <div
                        className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl flex-1"
                        style={{ minHeight: 300, cursor: isCursorGrabbing ? 'grabbing' : 'grab' }}
                        onWheel={handlePreviewWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {/* Overlay label */}
                        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 backdrop-blur-sm">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Live App</span>
                        </div>
                        {/* Non-interactive transparent cover - lets wheel events pass to parent */}
                        <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }} />
                        {/* Scaled iframe wrapper */}
                        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                            <iframe
                                ref={iframeRef}
                                src={previewUrl}
                                title="Live App Preview"
                                style={{
                                    width: '1280px',
                                    height: '900px',
                                    border: 'none',
                                    transform: `translate(${panX}px, ${panY}px) scale(${previewScale})`,
                                    transformOrigin: 'top left',
                                    pointerEvents: 'none',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    transition: isCursorGrabbing ? 'none' : 'transform 0.1s ease',
                                    userSelect: 'none',
                                }}
                                onLoad={() => {
                                    const iframe = iframeRef.current;
                                    if (!iframe || !iframe.contentDocument) return;
                                    const root = iframe.contentDocument.documentElement;
                                    root.style.setProperty('--color-primary', assignments.primary);
                                    root.style.setProperty('--color-secondary', assignments.secondary);
                                    root.style.setProperty('--color-background', assignments.bg);
                                    root.style.setProperty('--color-accent', assignments.accent);
                                    root.style.setProperty('--color-surface', assignments.surface);
                                    root.style.setProperty('--color-input-bg', assignments.input);
                                    root.style.setProperty('--color-menu-icon', assignments.menu_icon);
                                    root.style.setProperty('--color-search-icon', assignments.search_icon);
                                    root.style.setProperty('--color-text', assignments.text_base);
                                    root.style.setProperty('--color-text-muted', assignments.text_muted);
                                    root.style.setProperty('--color-hover', assignments.hover);
                                    root.style.setProperty('--color-hover-border', assignments.hover_border);
                                }}
                            />
                        </div>
                    </div>

                    {/* Role legend */}
                    <div className="grid grid-cols-2 gap-1 flex-shrink-0">
                        {ROLES.map(({ role, label }) => (
                            <div key={role} className={`flex items-center gap-1.5 p-1 rounded-md transition-all cursor-pointer hover:bg-white/[0.03] ${activeRole === role ? 'bg-white/[0.05] ring-1 ring-white/10' : ''}`} onClick={() => onSetActive(role)}>
                                <div className={`w-2 h-2 rounded-sm flex-shrink-0 border transition-all ${activeRole === role ? 'scale-125 border-white ring-2 ring-white/20' : 'border-white/10'}`} style={{ backgroundColor: getHex(role) }} />
                                <span className={`text-[11px] font-bold uppercase tracking-widest transition-all ${activeRole === role ? 'text-white' : 'text-white/30'}`}>{label}</span>
                                <code className={`text-[10px] font-mono ml-auto transition-all ${activeRole === role ? 'text-white/60' : 'text-white/15'}`}>{getHex(role)}</code>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 md:px-8 py-3 md:py-5 border-t border-white/[0.04] space-y-3 bg-black/40 md:bg-black/20 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={onSaveApply}
                        className="flex-[2] h-10 md:h-11 rounded-xl font-black text-[11px] uppercase tracking-[0.25em] flex items-center justify-center gap-2.5 transition-all hover:brightness-110 active:scale-95 shadow-lg group"
                        style={{ background: `linear-gradient(135deg,${primaryHex},${accentHex})`, color: lum(primaryHex) > 0.4 ? '#000' : '#fff' }}
                    >
                        < Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                        {saveLabel}
                    </button>
                    <div className="flex gap-2 flex-1">
                        {onReset && (
                            <button onClick={onReset}
                                title="Reset"
                                className="w-full h-10 md:h-11 rounded-xl bg-white/[0.02] hover:bg-orange-500/10 border border-white/[0.04] hover:border-orange-500/30 flex items-center justify-center text-white/20 hover:text-orange-400 transition-all group/reset">
                                <RotateCcw className="w-4 h-4 group-hover/reset:-rotate-180 transition-transform duration-500" />
                                <span className="ml-2 text-[10px] font-black uppercase tracking-widest">Reset Detection</span>
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-center text-[5px] md:text-[6px] text-white/5 md:text-white/10 uppercase tracking-widest">Premium Theme Engine · By Fame Academy</p>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
type View = 'saved' | 'new' | 'edit';

export default function PaletteImportModal({ onClose, onApply }: Props) {
    const { settings: currentTheme } = useTheme();
    const [view, setView] = useState<View>('saved');
    const [saved, setSaved] = useState<SavedPalette[]>([]);

    // New import state
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageThumb, setImageThumb] = useState<string | null>(null);
    const [colors, setColors] = useState<string[]>([]);
    const [assignments, setAssignments] = useState<Record<Role, string>>({
        primary: '#1a1a2e', secondary: '#1a1a2e', accent: '#1a1a2e',
        surface: '#1a1a2e', bg: '#1a1a2e', input: '#1a1a2e', menu_icon: '#ffffff', search_icon: '#ffffff',
        text_base: '#f8fafc', text_muted: '#ffffff99',
        hover: '#1a1a2e33', hover_border: '#1a1a2e66'
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [activeRole, setActiveRole] = useState<Role | null>(null);
    const [paletteName, setPaletteName] = useState('');

    // Edit state
    const [editTarget, setEditTarget] = useState<SavedPalette | null>(null);
    const [editColors, setEditColors] = useState<string[]>([]);
    const [editAssignments, setEditAssignments] = useState<Record<Role, string>>({
        primary: '#1a1a2e', secondary: '#1a1a2e', accent: '#1a1a2e',
        surface: '#1a1a2e', bg: '#1a1a2e', input: '#1a1a2e', menu_icon: '#ffffff', search_icon: '#ffffff',
        text_base: '#f8fafc', text_muted: '#ffffff99',
        hover: '#1a1a2e33', hover_border: '#1a1a2e66'
    });
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [editName, setEditName] = useState('');

    // Inline rename
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renamingVal, setRenamingVal] = useState('');

    // Stores the original auto-detected assignments so the user can reset
    const initialAssignmentsRef = useRef<Record<Role, string>>({
        primary: '#1a1a2e', secondary: '#1a1a2e', accent: '#1a1a2e',
        surface: '#1a1a2e', bg: '#1a1a2e', input: '#1a1a2e', menu_icon: '#ffffff', search_icon: '#ffffff',
        text_base: '#f8fafc', text_muted: '#ffffff99',
        hover: '#1a1a2e33', hover_border: '#1a1a2e66'
    });

    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const ls = load();
        setSaved(ls);
        if (ls.length === 0) setView('new');

        // Lock body scroll when modal is open
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        return () => {
            document.body.style.overflow = originalStyle;
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, []);

    // ── New import ──
    const loadImage = useCallback((src: string) => {
        setColors([]); setAssignments({
            primary: '#1a1a2e', secondary: '#1a1a2e', accent: '#1a1a2e',
            surface: '#1a1a2e', bg: '#1a1a2e', input: '#1a1a2e', menu_icon: '#ffffff', search_icon: '#ffffff',
            text_base: '#f8fafc', text_muted: '#ffffff99',
            hover: '#1a1a2e33', hover_border: '#1a1a2e66'
        }); setActiveRole(null);
        setIsExtracting(true); setImageUrl(src);
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => {
            const ex = extractColors(img, 8);
            setImageThumb(thumb(img));
            setColors(ex.map(c => c.hex));
            const autoAsgn = autoRoles(ex);
            initialAssignmentsRef.current = autoAsgn;  // store for reset
            setAssignments(autoAsgn);
            setIsExtracting(false);
        };
        img.onerror = () => { toast.error('Cannot load image'); setIsExtracting(false); };
        img.src = src;
    }, []);

    const handleFile = (f: File) => { const r = new FileReader(); r.onload = e => loadImage(e.target?.result as string); r.readAsDataURL(f); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleFile(f); };

    const buildPalette = (asgn: Record<Role, string>): RolePalette => ({
        primary: asgn.primary, secondary: asgn.secondary,
        accent: asgn.accent, surface: asgn.surface,
        bg: asgn.bg, input: asgn.input, menu_icon: asgn.menu_icon, search_icon: asgn.search_icon,
        text_base: asgn.text_base, text_muted: asgn.text_muted,
        hover: asgn.hover, hover_border: asgn.hover_border
    });

    const assign = (hex: string, role: Role, current: Record<Role, string>, set: (v: Record<Role, string>) => void) => {
        const updated = { ...current, [role]: hex };
        
        // --- SMART HARMONY Logic ---
        // If Primary changes, auto-update Hover/Glow roles if they match the primary's pattern
        if (role === 'primary') {
            const opHover = fromAlpha(current.hover);
            const opBorder = fromAlpha(current.hover_border);
            updated.hover = applyAlpha(hex, opHover);
            updated.hover_border = applyAlpha(hex, opBorder);
        }

        // If Background changes, auto-update Text/Icon roles for visibility
        if (role === 'bg') {
            const isBgLight = lum(hex) > 0.5;
            updated.text_base = isBgLight ? '#0f172a' : '#f8fafc';
            updated.text_muted = isBgLight ? '#475569' : '#ffffff99';
            updated.menu_icon = isBgLight ? '#0f172a' : '#ffffff';
            updated.search_icon = updated.text_muted;
        }

        set(updated);
    };

    // ── Save ops ──
    const doSaveNew = () => {
        const palette = buildPalette(assignments);
        const name = paletteName.trim() || `Custom ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        const entry: SavedPalette = { id: Date.now().toString(), name, createdAt: Date.now(), colors: palette, extractedColors: colors, imageThumb: imageThumb || undefined };
        const updated = [entry, ...saved].slice(0, 12);
        setSaved(updated); persist(updated);
        onApply(palette);
        toast.success(`Palette "${name}" Applied & Saved! You can keep refining.`, { icon: '✨' });
    };

    const doUpdateEdit = () => {
        if (!editTarget) return;
        const palette = buildPalette(editAssignments);
        const name = editName.trim() || editTarget.name;
        const updated = saved.map(p => p.id === editTarget.id ? { ...p, name, colors: palette, extractedColors: editColors } : p);
        setSaved(updated); persist(updated);
        onApply(palette);
        toast.success('Changes Applied! Still in edit mode.', { icon: '🎨' });
    };

    const deletePalette = (id: string) => {
        const updated = saved.filter(p => p.id !== id);
        setSaved(updated); persist(updated);
        toast.success('Deleted');
    };

    const openEdit = (p: SavedPalette) => {
        setEditTarget(p);
        setEditColors((p.extractedColors?.length ? p.extractedColors : Object.values(p.colors)));

        const asgn = { ...p.colors, search_icon: p.colors.search_icon || p.colors.text_muted };

        // Setup initial detection state so "Reset Detection" returns to original extracted colors
        if (p.extractedColors && p.extractedColors.length > 0) {
            // Reconstruct a dummy ExtractedColor array with fake counts based on order
            const reconstructed = p.extractedColors.map((hex, i) => ({ hex, count: 100 - i }));
            initialAssignmentsRef.current = autoRoles(reconstructed);
        } else {
            initialAssignmentsRef.current = { ...asgn }; // Fallback to current colors
        }

        setEditAssignments(asgn);
        setEditName(p.name);
        setEditRole(null);
        setView('edit');
    };

    const renameInList = (id: string, name: string) => {
        const trimmed = name.trim(); if (!trimmed) return;
        const updated = saved.map(p => p.id === id ? { ...p, name: trimmed } : p);
        setSaved(updated); persist(updated); setRenamingId(null);
    };

    const hasPalette = !isExtracting && colors.length > 0;

    // Common header
    const Header = ({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) => (
        <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-white/[0.04] bg-white/[0.01] backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
                {onBack ? (
                    <button onClick={onBack} className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] flex items-center justify-center text-white/40 hover:text-white transition-all group">
                        <ArrowLeft className="w-3 h-3 md:w-3.5 md:h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                ) : (
                    <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                            <Pipette className="w-3.5 h-3.5 text-white" />
                        </div>
                    </div>
                )}
                <div className="flex flex-col">
                    <h2 className="text-[14px] md:text-[18px] font-black text-white uppercase tracking-[0.15em] md:tracking-[0.2em] leading-none">{title}</h2>
                    {subtitle && <p className="text-[10px] md:text-[12px] text-white/20 mt-1 uppercase tracking-widest font-bold">{subtitle}</p>}
                </div>
            </div>
            {!onBack && (
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/[0.04] gap-0.5">
                    {(['saved', 'new'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)}
                            className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[9px] md:text-[12px] font-black uppercase tracking-widest transition-all duration-300 ${view === v ? 'bg-white/10 text-white shadow-sm' : 'text-white/20 hover:text-white'}`}>
                            {v === 'saved' ? <Clock className="w-2.5 h-2.5 md:w-3 h-3" /> : <Plus className="w-2.5 h-2.5 md:w-3 h-3" />}
                            <span className="hidden xs:inline">{v === 'saved' ? `Vault (${saved.length})` : 'New Import'}</span>
                            <span className="xs:hidden">{v === 'saved' ? `V (${saved.length})` : 'New'}</span>
                        </button>
                    ))}
                </div>
            )}
            <button onClick={onClose} className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.04] hover:border-red-500/20 flex items-center justify-center text-white/20 hover:text-red-400 transition-all">
                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
        </div>
    );

    const modalContent = (
        <div className="fixed top-0 left-0 right-0 bottom-0 inset-0 z-[999999] bg-[#000000] flex flex-col h-[100dvh] w-screen overflow-hidden overscroll-none">
            {/* Backdrop blur effect / Gradient overlays - Now with 100% opaque base */}
            <div className="absolute inset-0 bg-black backdrop-blur-3xl pointer-events-none opacity-40" />
            <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-fuchsia-600/20 blur-[120px] rounded-full pointer-events-none" />

            {/* Content Container (relative to stack above) */}
            <div className="relative flex-1 flex flex-col h-full min-h-0 overflow-hidden">

                {/* Accent stripe */}
                <div className="h-0.5 w-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 flex-shrink-0" />

                {/* ══ SAVED VIEW ══ */}
                {view === 'saved' && (
                    <>
                        <Header title="Import Palette" subtitle="from any image" />
                        <div className="flex-1 overflow-y-auto p-4 md:p-8">
                            {saved.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <Clock className="w-7 h-7 text-white/15" />
                                    </div>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No saved palettes yet</p>
                                    <button onClick={() => setView('new')} className="px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 text-[8px] font-black uppercase tracking-widest hover:bg-purple-500/25 transition-all">
                                        Import your first palette →
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 auto-rows-min">
                                    {saved.map(p => {
                                        const isActiveTheme = normalizeHex(currentTheme?.primary_color) === normalizeHex(p.colors.primary)
                                            && normalizeHex(currentTheme?.accent_color) === normalizeHex(p.colors.accent);
                                        return (
                                            <div key={p.id} className={`group bg-white/[0.02] rounded-xl border relative overflow-hidden transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${isActiveTheme ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-500/5 ring-1 ring-emerald-500/20' : 'border-white/[0.04] hover:border-purple-500/20 hover:bg-white/[0.04]'}`}
                                                onClick={() => openEdit(p)}>
                                                {/* Active Badge */}
                                                {isActiveTheme && (
                                                    <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border border-emerald-400">
                                                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                                    </div>
                                                )}
                                                {/* Color strip */}
                                                <div className="h-14 flex relative overflow-hidden bg-black/20">
                                                    {p.imageThumb && <img src={p.imageThumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 transition-all duration-500" />}
                                                    <div className="absolute inset-0 flex">
                                                        {Object.values(p.colors).map((hex, i) => (
                                                            <div key={i} className="flex-1 h-full shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]" style={{ backgroundColor: hex }} />
                                                        ))}
                                                    </div>
                                                    {/* Edit icon overlay */}
                                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-900/40 backdrop-blur-[2px] flex items-center justify-center">
                                                        <Pencil className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                </div>
                                                <div className="p-2.5 space-y-1.5">
                                                    {/* Inline rename */}
                                                    {renamingId === p.id ? (
                                                        <input autoFocus value={renamingVal} onChange={e => setRenamingVal(e.target.value)}
                                                            onBlur={() => renameInList(p.id, renamingVal)}
                                                            onKeyDown={e => { if (e.key === 'Enter') renameInList(p.id, renamingVal); if (e.key === 'Escape') setRenamingId(null); }}
                                                            className="w-full bg-white/10 border border-purple-500/40 rounded px-1.5 py-0.5 text-[7px] font-black text-white uppercase outline-none" />
                                                    ) : (
                                                        <p className="text-[12px] font-black text-white/50 uppercase tracking-widest truncate group-hover:text-purple-400 transition-colors"
                                                            onDoubleClick={e => { e.stopPropagation(); setRenamingId(p.id); setRenamingVal(p.name); }}>{p.name}</p>
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] text-white/10 font-bold uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                                        <button onClick={e => { e.stopPropagation(); deletePalette(p.id); }}
                                                            className="w-5 h-5 rounded-lg bg-red-500/0 hover:bg-red-500/20 flex items-center justify-center text-red-500/0 group-hover:text-red-500/40 hover:text-red-500 transition-all">
                                                            <Trash2 className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {/* + New card */}
                                    <button onClick={() => setView('new')}
                                        className="h-24 border border-dashed border-white/[0.04] rounded-xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center gap-1.5 text-white/15 hover:text-purple-400">
                                        <Plus className="w-3.5 h-3.5" />
                                        <span className="text-[6px] font-black uppercase tracking-[0.2em]">New Import</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ══ NEW IMPORT VIEW ══ */}
                {view === 'new' && (
                    <>
                        <Header title="Import New Palette" subtitle="upload an image to extract colors" />
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Drop zone fills all space when no image */}
                            {!imageUrl && !isExtracting && (
                                <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                                    onClick={() => fileRef.current?.click()}
                                    className={`flex-1 cursor-pointer flex flex-col items-center justify-center gap-4 transition-all border-b ${isDragging ? 'border-purple-400 bg-purple-500/5 border-dashed' : 'border-white/[0.04] hover:bg-white/[0.01]'}`}>
                                    <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                                        <Upload className="w-9 h-9 text-white/15" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-sm font-black text-white/30 uppercase tracking-widest">Drop image or click to browse</p>
                                        <p className="text-[9px] text-white/15 uppercase tracking-widest">Pinterest · Behance · Figma · Anything</p>
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                                </div>
                            )}

                            {/* Image loaded → compact pill header */}
                            {imageUrl && (
                                <>
                                    <div className="flex-shrink-0 mx-4 md:mx-8 mb-4 flex flex-row items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-2 pr-3 group">
                                        {/* Thumbnail */}
                                        <div className="relative w-10 h-10 md:w-14 md:h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
                                            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/10" />
                                        </div>
                                        {/* Color swatches inline */}
                                        <div className="flex-1 flex gap-0.5 md:gap-1">
                                            {colors.slice(0, 8).map((hex, i) => (
                                                <div key={i} className="flex-1 h-6 md:h-8 rounded-md md:rounded-lg border border-white/5 shadow-sm" style={{ backgroundColor: hex }} />
                                            ))}
                                        </div>
                                        {/* Replace button - Icon only on mobile if space is tight */}
                                        <button onClick={() => fileRef.current?.click()}
                                            className="flex-shrink-0 flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] hover:border-purple-500/30 transition-all group/btn">
                                            <RefreshCw className="w-3 h-3 text-white/30 group-hover/btn:text-purple-400 group-hover/btn:rotate-180 transition-all duration-500" />
                                            <span className="hidden sm:inline text-[7px] font-black text-white/30 group-hover/btn:text-purple-400 uppercase tracking-widest transition-colors">Swap</span>
                                        </button>
                                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                                    </div>

                                    {isExtracting ? (
                                        <div className="flex-1 flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Analysing…</span>
                                        </div>
                                    ) : hasPalette && (
                                        <ColorEditor
                                            colors={colors} assignments={assignments}
                                            onAssign={(hex, role) => assign(hex, role, assignments, setAssignments)}
                                            activeRole={activeRole} onSetActive={setActiveRole}
                                            paletteName={paletteName} onSetName={setPaletteName}
                                            onSaveApply={doSaveNew}
                                            onApplyOnly={() => { onApply(buildPalette(assignments)); onClose(); }}
                                            onReset={() => setAssignments({ ...initialAssignmentsRef.current })}
                                        />
                                    )}
                                </>
                            )}

                            {isExtracting && !imageUrl && (
                                <div className="flex-1 flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Analysing…</span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ══ EDIT VIEW ══ */}
                {view === 'edit' && editTarget && (
                    <>
                        <Header title={`Edit — ${editTarget.name}`} subtitle="adjust color roles then save" onBack={() => setView('saved')} />
                        <ColorEditor
                            colors={editColors} assignments={editAssignments}
                            onAssign={(hex, role) => assign(hex, role, editAssignments, setEditAssignments)}
                            activeRole={editRole} onSetActive={setEditRole}
                            paletteName={editName} onSetName={setEditName}
                            onSaveApply={doUpdateEdit}
                            onApplyOnly={() => { onApply(buildPalette(editAssignments)); onClose(); }}
                            onReset={() => setEditAssignments({ ...initialAssignmentsRef.current })}
                            saveLabel="Update & Apply"
                        />
                    </>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
