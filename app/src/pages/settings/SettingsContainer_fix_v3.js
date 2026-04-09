const fs = require('fs');
const path = 'f:/MyRestoredProjects/gymnastic-system-2/app/src/pages/settings/SettingsContainer.tsx';
const original = fs.readFileSync(path, 'utf8');

// We use string concat to avoid backtick nesting issues
const block1Head = '        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">\n' +
    '            {/* Palette Import Modal */}\n' +
    '            {showPaletteImport && (\n' +
    '                <PaletteImportModal\n' +
    '                    onClose={() => setShowPaletteImport(false)}\n' +
    '                    onApply={handlePaletteImport}\n' +
    '                />\n' +
    '            )}\n' +
    '            {/* Premium Publishing Overlay */}\n' +
    '            {isPublishing && createPortal(\n' +
    '                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-hidden">\n' +
    '                    {/* Ultra-Premium Full Screen Isolation */}\n' +
    '                    <div className="absolute inset-0 bg-black/98 animate-in fade-in duration-1000">\n' +
    '                        {/* Dynamic Branded Aura */}\n' +
    '                        <div\n' +
    '                            className="absolute inset-0 opacity-60 blur-[180px] scale-150 transition-all duration-[3000ms] animate-pulse"\n' +
    '                            style={{\n' +
    '                                background: `radial-gradient(circle at center, ${draftSettings.primary_color}, transparent 60%)`\n' +
    '                            }}\n' +
    '                        />\n' +
    '                        {/* Micro-Noise Pattern for Texture */}\n' +
    '                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url(\'https://www.transparenttextures.com/patterns/carbon-fibre.png\')]" />\n' +
    '                        <div className="absolute inset-0 backdrop-blur-[150px] bg-black/40" />\n' +
    '                    </div>\n' +
    '\n' +
    '                    {/* Centered Premium Card */}\n' +
    '                    <div className="relative glass-card px-8 md:px-12 py-12 md:py-16 rounded-[4rem] border border-white/10 shadow-[0_0_150px_rgba(0,0,0,0.8)] max-w-lg w-full text-center animate-in zoom-in slide-in-from-bottom-12 duration-1000 flex flex-col items-center">\n' +
    '                        <div className="relative w-40 h-40 mb-10 flex items-center justify-center">\n' +
    '                            <div className="absolute inset-0 rounded-full blur-[40px] animate-pulse scale-110"\n' +
    '                                style={{ backgroundColor: `${draftSettings.primary_color}22` }}\n' +
    '                            />\n' +
    '                            <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full transform -rotate-90">\n' +
    '                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="1.5" fill="transparent" className="text-white/[0.03]" />\n' +
    '                                <circle\n' +
    '                                    cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="4" fill="transparent"\n' +
    '                                    strokeDasharray={553} strokeDashoffset={553 - (553 * publishProgress) / 100}\n' +
    '                                    className="transition-all duration-1000 ease-in-out"\n' +
    '                                    style={{ color: draftSettings.primary_color }}\n' +
    '                                    strokeLinecap="round"\n' +
    '                                />\n' +
    '                            </svg>\n' +
    '                            <div className="relative z-10 flex items-center justify-center w-24 h-24">\n' +
    '                                {publishProgress === 100 ? (\n' +
    '                                    <div className="bg-green-500/20 p-5 rounded-full border border-green-500/30 animate-in zoom-in spin-in-45 duration-700">\n' +
    '                                        <CheckCircle2 className="w-10 h-10 text-green-400" />\n' +
    '                                    </div>\n' +
    '                                ) : (\n' +
    '                                    <div className="relative flex items-center justify-center">\n' +
    '                                        <div className="absolute w-16 h-16 border-2 rounded-full animate-ping duration-[2000ms]"\n' +
    '                                            style={{ borderColor: `${draftSettings.primary_color}33` }}\n' +
    '                                        />\n' +
    '                                        <Sparkles className="w-10 h-10 animate-pulse" style={{ color: draftSettings.primary_color }} />\n' +
    '                                    </div>\n' +
    '                                )}\n' +
    '                            </div>\n' +
    '                        </div>\n' +
    '\n' +
    '                        <div className="space-y-6 w-full">\n' +
    '                            <div className="space-y-2">\n' +
    '                                <p className="text-[8px] font-black uppercase tracking-[0.8em] animate-pulse"\n' +
    '                                    style={{ color: draftSettings.primary_color }}>\n' +
    '                                    {publishProgress === 100 ? \'SUCCESSFULLY DEPLOYED\' : \'SYSTEM DEPLOYMENT IN PROGRESS\'}\n' +
    '                                </p>\n' +
    '                                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">\n' +
    '                                    {publishProgress === 100 ? t(\'settings.publishComplete\') : t(\'settings.publishingDesign\')}\n' +
    '                                </h3>\n' +
    '                            </div>\n' +
    '\n' +
    '                            <div className="flex flex-col items-center gap-6">\n' +
    '                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] px-6 py-2 bg-white/[0.02] rounded-full border border-white/[0.05] backdrop-blur-md">\n' +
    '                                    {publishStep}\n' +
    '                                </p>\n' +
    '                                <div className="flex gap-3">\n' +
    '                                    {[1, 2, 3].map((step) => (\n' +
    '                                        <div\n' +
    '                                            key={step}\n' +
    '                                            className={`h-1.5 rounded-full transition-all duration-1000 ${publishProgress >= (step * 33)\n' +
    '                                                ? \'w-12 shadow-[0_0_20px_rgba(var(--color-primary),0.5)]\'\n' +
    '                                                : \'w-3 bg-white/5\'}`}\n' +
    '                                            style={{ backgroundColor: publishProgress >= (step * 33) ? draftSettings.primary_color : undefined }}\n' +
    '                                        ></div>\n' +
    '                                    ))}\n' +
    '                                </div>\n' +
    '                            </div>\n' +
    '                        </div>\n' +
    '\n' +
    '                        {/* Integration Note Blocks */}\n' +
    '                        <div className="mt-12 grid grid-cols-2 gap-4 w-full">\n' +
    '                            <div className="p-4 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center gap-2 group transition-all hover:bg-white/[0.02]">\n' +
    '                                <ShieldCheck className="w-4 h-4 opacity-40 transition-transform group-hover:scale-110" style={{ color: draftSettings.primary_color }} />\n' +
    '                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.25em] text-center leading-relaxed">\n' +
    '                                    {t(\'settings.encryptionNote\')}\n' +
    '                                </span>\n' +
    '                            </div>\n' +
    '                            <div className="p-4 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center gap-2 group transition-all hover:bg-white/[0.02]">\n' +
    '                                <Zap className="w-4 h-4 opacity-40 transition-transform group-hover:scale-110" style={{ color: draftSettings.primary_color }} />\n' +
    '                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.25em] text-center leading-relaxed">\n' +
    '                                    {t(\'settings.syncReadyNote\')}\n' +
    '                                </span>\n' +
    '                            </div>\n' +
    '                        </div>\n' +
    '                    </div>\n' +
    '                </div>,\n' +
    '                document.body\n' +
    '            )}\n' +
    '\n' +
    '            <PageHeader\n' +
    '                title={t(\'settings.title\')}\n' +
    '                subtitle={t(\'settings.subtitle\')}\n' +
    '            />\n' +
    '\n' +
    '            {/* Tab Navigation */}\n' +
    '            <div className="flex flex-wrap items-center justify-center p-1.5 bg-white/5 rounded-[1.5rem] w-full gap-1.5 mb-6 group transition-all duration-500">\n' +
    '                {role === \'admin\' && (\n' +
    '                    <button\n' +
    '                        onClick={() => {\n' +
    '                            setActiveTab(\'academy\');\n' +
    '                            handleSecretTrigger();\n' +
    '                        }}\n' +
    '                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === \'academy\' ? \'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10\' : \'text-white/40 hover:text-white hover:bg-white/5\'}`}\n' +
    '                    >\n' +
    '                        <Building2 className="w-3.5 h-3.5" />\n' +
    '                        {t(\'settings.academy\')}\n' +
    '                    </button>\n' +
    '                )}\n' +
    '                <button\n' +
    '                    onClick={() => setActiveTab(\'appearance\')}\n' +
    '                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === \'appearance\' ? \'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10\' : \'text-white/40 hover:text-white hover:bg-white/5\'}`}\n' +
    '                >\n' +
    '                    <Palette className="w-3.5 h-3.5" />\n' +
    '                    {t(\'settings.appearance\')}\n' +
    '                </button>\n' +
    '                {role === \'admin\' && isSecretRevealed && (\n' +
    '                    <button\n' +
    '                        onClick={() => setActiveTab(\'login\')}\n' +
    '                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === \'login\' ? \'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10\' : \'text-white/40 hover:text-white hover:bg-white/5\'}`}\n' +
    '                    >\n' +
    '                        <Layout className="w-3.5 h-3.5" />\n' +
    '                        {t(\'settings.login\')}\n' +
    '                    </button>\n' +
    '                )}\n' +
    '                <button\n' +
    '                    onClick={() => setActiveTab(\'profile\')}\n' +
    '                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === \'profile\' ? \'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10\' : \'text-white/40 hover:text-white hover:bg-white/5\'}`}\n' +
    '                >\n' +
    '                    <User className="w-3.5 h-3.5" />\n' +
    '                    {t(\'settings.profile\')}\n' +
    '                </button>\n' +
    '                <button\n' +
    '                    onClick={() => setActiveTab(\'notifications\')}\n' +
    '                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === \'notifications\' ? \'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10\' : \'text-white/40 hover:text-white hover:bg-white/5\'}`}\n' +
    '                >\n' +
    '                    <Bell className="w-3.5 h-3.5" />\n' +
    '                    {t(\'settings.notifications\', \'Notifications\')}\n' +
    '                </button>\n' +
    '            </div>\n' +
    '\n' +
    '            <div className="grid grid-cols-1 gap-8">';

// Join everything back
const startTag = '        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">';
const endAnchor = '{activeTab === \'appearance\' && (';

const part1 = original.substring(0, original.indexOf(startTag));
const part2 = block1Head;
const part3 = original.substring(original.indexOf(endAnchor));

fs.writeFileSync(path, part1 + part2 + '\n' + part3, 'utf8');
console.log("Block 1 repaired successfully.");
