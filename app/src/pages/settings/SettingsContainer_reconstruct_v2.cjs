const fs = require('fs');
const path = 'f:/MyRestoredProjects/gymnastic-system-2/app/src/pages/settings/SettingsContainer.tsx';
let s = fs.readFileSync(path, 'utf8');

// 1. Fix the logo sanitization in useEffect
const effectStart = s.indexOf('if (hasLoaded && !hasSynced) {');
if (effectStart !== -1) {
    const effectEnd = s.indexOf('}, [hasLoaded, settings, hasSynced]);', effectStart);
    if (effectEnd !== -1) {
        const nextBrace = s.indexOf('}', effectEnd + 30); // Close of useEffect
        const head = s.substring(0, effectStart);
        const tail = s.substring(nextBrace + 1);
        const newEffect = `if (hasLoaded && !hasSynced) {
            const sanitized = { ...settings };
            const colorKeys = [
                'primary_color', 'secondary_color', 'accent_color', 'surface_color',
                'hover_color', 'hover_border_color', 'input_bg_color',
                'text_color_base', 'text_color_muted',
                'brand_label_color', 'premium_badge_color',
                'menu_icon_color', 'search_icon_color',
                'search_bg_color', 'search_text_color', 'search_border_color',
                'login_card_color', 'login_card_border_color', 'login_accent_color', 'login_text_color',
                'login_mobile_card_color', 'login_mobile_card_border_color', 'login_mobile_accent_color', 'login_mobile_text_color'
            ];

            colorKeys.forEach(key => {
                if (sanitized[key]) {
                    const val = sanitized[key];
                    if (typeof val === 'string' && val.startsWith('rgba')) {
                        // Basic conversion or just let toSafeHex handle it if available
                    }
                }
            });

            const legacyWords = ['healy', 'fame', 'dark_logo', 'light_logo'];
            const isLegacy = (url) => typeof url === 'string' && legacyWords.some(word => url.toLowerCase().includes(word));
            
            if (isLegacy(sanitized.logo_url)) sanitized.logo_url = '/logo.png';
            if (isLegacy(sanitized.login_logo_url)) sanitized.login_logo_url = '/logo.png';
            if (isLegacy(sanitized.login_mobile_logo_url)) sanitized.login_mobile_logo_url = '/logo.png';

            setDraftSettings(sanitized);
            setHasSynced(true);
        }
    }, [hasLoaded, settings, hasSynced]);`;
        s = head + newEffect + tail;
    }
}

// 2. Fix the corrupted portal block
const portalStart = s.indexOf('isPublishing && createPortal(');
if (portalStart !== -1) {
    const portalEnd = s.indexOf('<PageHeader', portalStart);
    if (portalEnd !== -1) {
        const head = s.substring(0, portalStart);
        const tail = s.substring(portalEnd);
        const newPortal = `isPublishing && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-black/98 animate-in fade-in duration-1000">
                        <div
                            className="absolute inset-0 opacity-40 blur-[120px] scale-150 transition-all duration-[3000ms] animate-pulse"
                            style={{
                                background: 'radial-gradient(circle at center, ' + (draftSettings.primary_color || '#A30000') + ', transparent 60%)'
                            }}
                        />
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url(\'https://www.transparenttextures.com/patterns/carbon-fibre.png\')]" />
                    </div>

                    <div className="relative glass-card px-8 md:px-12 py-12 md:py-16 rounded-[4rem] border border-white/10 shadow-2xl max-w-lg w-full text-center animate-in zoom-in duration-1000 flex flex-col items-center">
                        <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full blur-[40px] animate-pulse scale-110"
                                style={{ backgroundColor: (draftSettings.primary_color || '#A30000') + '22' }}
                            />
                            <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="currentColor" stroke-width="1.5" fill="transparent" className="text-white/[0.03] stroke-white/10" />
                                <circle
                                    cx="96" cy="96" r="88" stroke="currentColor" stroke-width="4" fill="transparent"
                                    stroke-dasharray={553} stroke-dashoffset={553 - (553 * publishProgress) / 100}
                                    className="transition-all duration-1000 ease-in-out"
                                    style={{ stroke: draftSettings.primary_color || '#A30000' }}
                                    stroke-linecap="round"
                                />
                            </svg>
                            <div className="relative z-10 flex items-center justify-center w-24 h-24">
                                {publishProgress === 100 ? (
                                    <div className="bg-green-500/20 p-5 rounded-full border border-green-500/30 animate-in zoom-in spin-in-45 duration-700">
                                        <CheckCircle2 className="w-10 h-10 text-green-400" />
                                    </div>
                                ) : (
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute w-16 h-16 border-2 rounded-full animate-ping duration-[2000ms]"
                                            style={{ borderColor: (draftSettings.primary_color || '#A30000') + '33' }}
                                        />
                                        <Sparkles className="w-10 h-10 animate-pulse" style={{ color: draftSettings.primary_color || '#A30000' }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 w-full">
                            <div className="space-y-2">
                                <p className="text-[8px] font-black uppercase tracking-[0.8em] animate-pulse"
                                    style={{ color: draftSettings.primary_color || '#A30000' }}>
                                    {publishProgress === 100 ? 'SUCCESSFULLY DEPLOYED' : 'SYSTEM DEPLOYMENT IN PROGRESS'}
                                </p>
                                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">
                                    {publishProgress === 100 ? t('settings.publishComplete') : t('settings.publishingDesign')}
                                </h3>
                            </div>

                            <div className="flex flex-col items-center gap-6">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] px-6 py-2 bg-white/[0.02] rounded-full border border-white/10 backdrop-blur-md">
                                    {publishStep}
                                </p>
                                <div className="flex gap-3">
                                    {[1, 2, 3].map((step) => (
                                        <div
                                            key={step}
                                            className={'h-1.5 rounded-full transition-all duration-1000 ' + (publishProgress >= step * 33
                                                ? 'w-12 shadow-lg'
                                                : 'w-3 bg-white/5')}
                                            style={{ backgroundColor: publishProgress >= step * 33 ? (draftSettings.primary_color || '#A30000') : undefined }}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Integration Note Blocks */}
                        <div className="mt-12 grid grid-cols-2 gap-4 w-full">
                            <div className="p-4 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center gap-2 group transition-all hover:bg-white/[0.02]">
                                <ShieldCheck className="w-4 h-4 opacity-40 transition-transform group-hover:scale-110" style={{ color: draftSettings.primary_color || '#A30000' }} />
                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.25em] text-center leading-relaxed">
                                    {t('settings.encryptionNote')}
                                </span>
                            </div>
                            <div className="p-4 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center gap-2 group transition-all hover:bg-white/[0.02]">
                                <Zap className="w-4 h-4 opacity-40 transition-transform group-hover:scale-110" style={{ color: draftSettings.primary_color || '#A30000' }} />
                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.25em] text-center leading-relaxed">
                                    {t('settings.syncReadyNote')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            `;
        s = head + newPortal + tail;
    }
}

fs.writeFileSync(path, s);
console.log('Reconstruction Done.');
