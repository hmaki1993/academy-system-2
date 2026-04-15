import React, { useState, useEffect } from 'react';
import { Settings, Bell, Zap, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationFixerOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const [isOppo, setIsOppo] = useState(false);

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        const isOppoDevice = ua.includes('oppo') || ua.includes('coloros');
        setIsOppo(isOppoDevice);

        // Show after 5 seconds if push isn't explicitly confirmed active
        const timer = setTimeout(() => {
            if (!localStorage.getItem('elite_push_fixed_v1')) {
                setIsVisible(true);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const markFixed = () => {
        localStorage.setItem('elite_push_fixed_v1', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-24 left-4 right-4 z-[9999] md:left-auto md:right-8 md:w-96"
            >
                <div className="bg-black/90 backdrop-blur-2xl border border-primary/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative">
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary/20 p-2 rounded-xl">
                            <Bell className="w-6 h-6 text-primary" />
                        </div>
                        <button onClick={() => setIsVisible(false)} className="text-white/40 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight italic">
                        ضبط التنبيهات القصوى
                    </h3>
                    
                    <p className="text-white/60 text-sm mb-6 leading-relaxed">
                        لضمان وصول التنبيهات والبرنامج مغلق على جهازك ({isOppo ? 'Oppo' : 'Android'})، اتبع الخطوات التالية:
                    </p>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-4 text-white/80">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold border border-white/10">1</div>
                            <span className="text-sm">ادخل على <b>معلومات التطبيق</b> (App Info)</span>
                        </div>
                        <div className="flex items-center gap-4 text-white/80">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold border border-white/10">2</div>
                            <span className="text-sm">البطارية {'>'} <b>السماح بالنشاط في الخلفية</b></span>
                        </div>
                        <div className="flex items-center gap-4 text-white/80">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold border border-white/10">3</div>
                            <span className="text-sm">الإشعارات {'>'} تفعيل <b>Banner</b> و <b>Vibration</b></span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={markFixed}
                            className="flex-1 bg-primary text-white font-black py-3 rounded-2xl text-sm uppercase tracking-wider hover:bg-primary/80 transition-all flex items-center justify-center gap-2 group"
                        >
                            <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            تم الضبط
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
