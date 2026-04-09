const fs = require('fs');
const path = 'f:/MyRestoredProjects/gymnastic-system-2/app/src/pages/settings/SettingsContainer.tsx';
let s = fs.readFileSync(path, 'utf8');

// 1. Fixing the useEffect at the beginning (Ensure it's closed)
const effectSearch = /const legacyWords = \['healy', 'fame', 'dark_logo', 'light_logo'\];[\s\S]+?setHasSynced\(true\);\s+?\}\s+?\}, \[hasLoaded, settings, hasSynced\]\);/;
const effectReplacement = `            const legacyWords = ['healy', 'fame', 'dark_logo', 'light_logo'];
            const isLegacy = (url) => typeof url === 'string' && legacyWords.some(word => url.toLowerCase().includes(word));
            
            if (isLegacy(sanitized.logo_url)) sanitized.logo_url = '/logo.png';
            if (isLegacy(sanitized.login_logo_url)) sanitized.login_logo_url = '/logo.png';
            if (isLegacy(sanitized.login_mobile_logo_url)) sanitized.login_mobile_logo_url = '/logo.png';

            setDraftSettings(sanitized);
            setHasSynced(true);
        }
    }, [hasLoaded, settings, hasSynced]);`;

if (s.match(effectSearch)) {
    s = s.replace(effectSearch, effectReplacement);
}

// 2. Fixing the Entire Publishing Overlay Structure (Lines 772-865 approx)
// We'll find a wide anchor and replace it with a perfectly balanced version.
// Using a slightly more flexible regex to find the corrupted block.
const portalBlockSearch = /\{\/\* Premium Publishing Overlay \*\/\}[\s\S]+?<PageHeader/;
const portalBlockReplacement = `{/* Premium Publishing Overlay */}
            {isPublishing && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-black/98 animate-in fade-in duration-1000">
                        <div
                            className="absolute inset-0 opacity-40 blur-[120px] scale-150 transition-all duration-[3000ms] animate-pulse"
                            style={{
                                background: \`radial-gradient(circle at center, \${draftSettings.primary_color}, transparent 60%)\`
                            }}
                        />
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    </div>

                    <div className="relative glass-card px-8 md:px-12 py-12 md:py-16 rounded-[4rem] border border-white/10 shadow-[0_0_150px_rgba(0,0,0,0.8)] max-w-lg w-full text-center animate-in zoom-in slide-in-from-bottom-12 duration-1000 flex flex-col items-center">
                        <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full blur-[40px] animate-pulse scale-110"
                                style={{ backgroundColor: \`\${draftSettings.primary_color}22\` }}
                            />
                            <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="1.5" fill="transparent" className="text-white/[0.03] stroke-white/10" />
                                <circle
                                    cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="4" fill="transparent"
                                    strokeDasharray={553} strokeDashoffset={553 - (553 * publishProgress) / 100}
                                    className="transition-all duration-1000 ease-in-out"
                                    style={{ color: draftSettings.primary_color }}
                                    strokeLinecap="round"
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
                                            style={{ borderColor: \`\${draftSettings.primary_color}33\` }}
                                        />
                                        <Sparkles className="w-10 h-10 animate-pulse" style={{ color: draftSettings.primary_color }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 w-full">
                            <div className="space-y-2">
                                <p className="text-[8px] font-black uppercase tracking-[0.8em] animate-pulse"
                                    style={{ color: draftSettings.primary_color }}>
                                    {publishProgress === 100 ? 'SUCCESSFULLY DEPLOYED' : 'SYSTEM DEPLOYMENT IN PROGRESS'}
                                </p>
                                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">
                                    {publishProgress === 100 ? t('settings.publishComplete') : t('settings.publishingDesign')}
                                </h3>
                            </div>

                            <div className="flex flex-col items-center gap-6">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] px-6 py-2 bg-white/[0.02] rounded-full border border-white/[0.05] backdrop-blur-md">
                                    {publishStep}
                                </p>
                                <div className="flex gap-3">
                                    {[1, 2, 3].map((step) => (
                                        <div
                                            key={step}
                                            className={\`h-1.5 rounded-full transition-all duration-1000 \${publishProgress >= (step * 33)
                                                ? 'w-12 shadow-[0_0_20px_rgba(var(--color-primary),0.5)]'
                                                : 'w-3 bg-white/5'}\`}
                                            style={{ backgroundColor: publishProgress >= (step * 33) ? draftSettings.primary_color : undefined }}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Integration Note Blocks */}
                        <div className="mt-12 grid grid-cols-2 gap-4 w-full">
                            <div className="p-4 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center gap-2 group transition-all hover:bg-white/[0.02]">
                                <ShieldCheck className="w-4 h-4 opacity-40 transition-transform group-hover:scale-110" style={{ color: draftSettings.primary_color }} />
                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.25em] text-center leading-relaxed">
                                    {t('settings.encryptionNote')}
                                </span>
                            </div>
                            <div className="p-4 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center gap-2 group transition-all hover:bg-white/[0.02]">
                                <Zap className="w-4 h-4 opacity-40 transition-transform group-hover:scale-110" style={{ color: draftSettings.primary_color }} />
                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.25em] text-center leading-relaxed">
                                    {t('settings.syncReadyNote')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <PageHeader`;

if (s.match(portalBlockSearch)) {
    s = s.replace(portalBlockSearch, portalBlockReplacement);
} else {
    // If exact match fails, try a broader index-based replacement
    const startIdx = s.indexOf('{/* Premium Publishing Overlay */}');
    const endIdx = s.indexOf('<PageHeader');
    if (startIdx !== -1 && endIdx !== -1) {
        s = s.substring(0, startIdx) + portalBlockReplacement + s.substring(endIdx + 11); // Adjust for <PageHeader
    }
}

fs.writeFileSync(path, s);
console.log("Repair Done.");
