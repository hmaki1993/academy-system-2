const fs = require('fs');
const path = 'f:/MyRestoredProjects/gymnastic-system-2/app/src/pages/settings/SettingsContainer.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replacement Strategy:
// We identify the markers for each section and replace the content between them
// with a guaranteed balanced version.

// 1. Repair Portal & Nav Grid (Lines 760 - 917 roughly)
const navStart = '        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">';
const appearanceStart = "{activeTab === 'appearance' && (";

const navIndex = content.indexOf(navStart);
const appIndex = content.indexOf(appearanceStart);

if (navIndex !== -1 && appIndex !== -1) {
    const navBlock = `        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Palette Import Modal */}
            {showPaletteImport && (
                <PaletteImportModal
                    onClose={() => setShowPaletteImport(false)}
                    onApply={handlePaletteImport}
                />
            )}
            {/* Premium Publishing Overlay */}
            {isPublishing && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-black/98 animate-in fade-in duration-1000">
                        <div
                            className="absolute inset-0 opacity-60 blur-[180px] scale-150 transition-all duration-[3000ms] animate-pulse"
                            style={{
                                background: 'radial-gradient(circle at center, ' + draftSettings.primary_color + ', transparent 60%)'
                            }}
                        />
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url(\'https://www.transparenttextures.com/patterns/carbon-fibre.png\')]" />
                        <div className="absolute inset-0 backdrop-blur-[150px] bg-black/40" />
                    </div>

                    <div className="relative glass-card px-8 md:px-12 py-12 md:py-16 rounded-[4rem] border border-white/10 shadow-[0_0_150px_rgba(0,0,0,0.8)] max-w-lg w-full text-center animate-in zoom-in slide-in-from-bottom-12 duration-1000 flex flex-col items-center">
                        <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full blur-[40px] animate-pulse scale-110"
                                style={{ backgroundColor: draftSettings.primary_color + '22' }}
                            />
                            <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="1.5" fill="transparent" className="text-white/[0.03]" />
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
                                            style={{ borderColor: draftSettings.primary_color + '33' }}
                                        />
                                        <Sparkles className="w-10 h-10 animate-pulse" style={{ color: draftSettings.primary_color }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 w-full">
                            <div className="space-y-2">
                                <p className="text-[8px] font-black uppercase tracking-[0.8em] animate-pulse" style={{ color: draftSettings.primary_color }}>
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
                                        <div key={step} className={'h-1.5 rounded-full transition-all duration-1000 ' + (publishProgress >= (step * 33) ? 'w-12 shadow-[0_0_20px_rgba(var(--color-primary),0.5)]' : 'w-3 bg-white/5')} style={{ backgroundColor: publishProgress >= (step * 33) ? draftSettings.primary_color : undefined }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
            <div className="flex flex-wrap items-center justify-center p-1.5 bg-white/5 rounded-[1.5rem] w-full gap-1.5 mb-6 group transition-all duration-500">
                {role === 'admin' && (
                    <button onClick={() => { setActiveTab('academy'); handleSecretTrigger(); }} className={'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ' + (activeTab === 'academy' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10' : 'text-white/40 hover:text-white hover:bg-white/5')}>
                        <Building2 className="w-3.5 h-3.5" />
                        {t('settings.academy')}
                    </button>
                )}
                <button onClick={() => setActiveTab('appearance')} className={'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ' + (activeTab === 'appearance' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10' : 'text-white/40 hover:text-white hover:bg-white/5')}>
                    <Palette className="w-3.5 h-3.5" />
                    {t('settings.appearance')}
                </button>
            </div>
            <div className="grid grid-cols-1 gap-8">\n\r                `;
    
    // We keep it simple for now to see if this first block balances.
    // Actually, I'll do the same for ALL tabs.
    console.log("Found nav and appearance. Repairing...");
}
