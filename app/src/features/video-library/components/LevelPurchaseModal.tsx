import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Apple, CreditCard, Loader2, X, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

interface LevelPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    level: number;
    price: number;
    studentId: string;
    studentData?: any;
    onSuccess: () => void;
}

export default function LevelPurchaseModal({ isOpen, onClose, level, price, studentId, studentData, onSuccess }: LevelPurchaseModalProps) {
    const [step, setStep] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handlePayment = async () => {
        if (!paymentMethod) {
            toast.error('Please select a payment method');
            return;
        }

        setIsProcessing(true);
        
        try {
            // Call the Real Tap Payment Edge Function
            const { data, error } = await supabase.functions.invoke('create-tap-payment', {
                body: {
                    amount: price,
                    currency: "KWD",
                    payment_method: paymentMethod, // 'knet', 'card', or 'apple'
                    customer: {
                        first_name: studentData?.full_name || "Student",
                        email: studentData?.email || "student@fame-academy.online",
                        phone: studentData?.contact_number || ""
                    },
                    metadata: {
                        student_id: studentId,
                        level_number: level.toString()
                    }
                }
            });

            if (error) throw error;

            if (data?.transaction_url) {
                toast.loading('Redirecting to secure portal...', { duration: 2000 });
                // Small delay to let the toast be seen
                setTimeout(() => {
                    window.location.href = data.transaction_url;
                }, 1000);
            } else {
                throw new Error("Payment gateway did not return a valid URL.");
            }

        } catch (err: any) {
            console.error('Payment Error:', err);
            toast.error('Payment failed: ' + (err.message || 'Unknown error'));
            setIsProcessing(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-[#0a0a0a] sm:bg-black/80 sm:backdrop-blur-md sm:flex sm:items-center sm:justify-center overflow-y-auto no-scrollbar">
            {/* Desktop Only Backdrop Click to Close */}
            <div className="absolute inset-0 hidden sm:block" onClick={onClose} />
            
            <div className="relative w-full min-h-screen sm:min-h-0 sm:h-auto sm:max-w-[420px] sm:max-h-[85vh] bg-[#0a0a0a] sm:border border-white/10 rounded-none sm:rounded-[2.5rem] shadow-2xl flex flex-col sm:animate-in sm:zoom-in-95 duration-300">
                {/* Header Section - Compact */}
                <div className="p-5 pb-3 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Zap size={16} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tighter">Unlock Access</h2>
                            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest leading-none mt-0.5">Level {level} Batch</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors group">
                        <X size={16} className="text-white/20 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="p-5 space-y-4 flex-1 overflow-y-auto no-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            {/* Summary Card - Compact Premium */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 rounded-[1.5rem] p-4 text-white">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-[40px] rounded-full" />
                                <div className="relative z-10 space-y-3">
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                                        <span>Training Product</span>
                                        <span className="flex items-center gap-1 text-green-500/50"><ShieldCheck size={8} /> Secure Access</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-0.5">
                                            <span className="text-sm font-black uppercase italic tracking-tighter block leading-none">Level {level} Access</span>
                                            <span className="text-[9px] font-medium text-white/30 lowercase">Permanent license</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-primary tracking-tighter flex items-baseline justify-end leading-none">
                                                {price.toFixed(3)}
                                                <span className="text-[9px] ml-1 opacity-50 uppercase font-bold">KWD</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Selection - Slimmer Tiles */}
                            <div className="space-y-2">
                                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 ml-2 block mb-2">Payment Method</label>
                                
                                {/* K-NET */}
                                <button 
                                    onClick={() => setPaymentMethod('knet')}
                                    className={`w-full p-3 rounded-2xl border transition-all duration-300 group ${
                                        paymentMethod === 'knet' 
                                        ? 'bg-[#0070BA]/10 border-[#0070BA]/50 ring-1 ring-[#0070BA]/20' 
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg transform group-active:scale-95 transition-transform">
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-[#0070BA] font-black text-[9px] tracking-tighter">K</span>
                                                    <div className="w-5 h-[1px] bg-[#0070BA]/20 my-0.5 rounded-full" />
                                                    <span className="text-[#0070BA] font-bold text-[6px] tracking-widest uppercase">Net</span>
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <span className="font-bold text-xs block text-white/90">K-Net Portal</span>
                                                <span className="text-[7px] font-medium text-white/20 uppercase tracking-widest">Kuwait Debit</span>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${paymentMethod === 'knet' ? 'border-[#0070BA] bg-[#0070BA]/20' : 'border-white/10'}`}>
                                            {paymentMethod === 'knet' && <div className="w-1.5 h-1.5 rounded-full bg-white transition-opacity" />}
                                        </div>
                                    </div>
                                </button>

                                {/* CREDIT CARD */}
                                <button 
                                    onClick={() => setPaymentMethod('card')}
                                    className={`w-full p-3 rounded-2xl border transition-all duration-300 group ${
                                        paymentMethod === 'card' 
                                        ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/20' 
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg border border-white/5 transform group-active:scale-95 transition-transform">
                                                <div className="flex -space-x-2">
                                                    <div className="w-4 h-4 rounded-full bg-[#eb001b]" />
                                                    <div className="w-4 h-4 rounded-full bg-[#f79e1b] opacity-90" />
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <span className="font-bold text-xs block text-white/90">Credit Card</span>
                                                <span className="text-[7px] font-medium text-white/20 uppercase tracking-widest">Visa • Master</span>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${paymentMethod === 'card' ? 'border-primary bg-primary/20' : 'border-white/10'}`}>
                                            {paymentMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-white transition-opacity" />}
                                        </div>
                                    </div>
                                </button>

                                {/* APPLE PAY */}
                                <button 
                                    onClick={() => setPaymentMethod('apple')}
                                    className={`w-full p-3 rounded-2xl border transition-all duration-300 group ${
                                        paymentMethod === 'apple' 
                                        ? 'bg-white/10 border-white/50 ring-1 ring-white/20' 
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg border border-white/10 transform group-active:scale-95 transition-transform">
                                                <Apple size={18} className="text-white fill-white" />
                                            </div>
                                            <div className="text-left">
                                                <span className="font-bold text-xs block text-white/90">Apple Pay</span>
                                                <span className="text-[7px] font-medium text-white/20 uppercase tracking-widest">Express Checkout</span>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${paymentMethod === 'apple' ? 'border-white bg-white/20' : 'border-white/10'}`}>
                                            {paymentMethod === 'apple' && <div className="w-1.5 h-1.5 rounded-full bg-white transition-opacity" />}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Action Button - Compact */}
                            <div className="pt-2">
                                <button 
                                    onClick={handlePayment}
                                    disabled={!paymentMethod || isProcessing}
                                    className="w-full relative group overflow-hidden disabled:opacity-20 transition-all active:scale-95 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 bg-primary"
                                >
                                    <div className="py-4 font-black uppercase tracking-[0.2em] text-[9px] flex items-center justify-center gap-3 text-white">
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={12} />
                                                <span>Authorizing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck size={12} />
                                                <span>Complete Purchase</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 space-y-6 animate-in zoom-in duration-500">
                             <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(34,197,94,0.3)] border border-green-500/10">
                                <CheckCircle2 size={32} className="text-green-500" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Access Secured</h2>
                                <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.2em]">Level {level} License Activated.</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-primary hover:text-white transition-all shadow-lg"
                            >
                                Start Training
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer - Mini */}
                <div className="p-3 px-8 bg-white/[0.01] border-t border-white/5 flex items-center justify-center gap-2">
                    <ShieldCheck size={10} className="text-white/10" />
                    <span className="text-[6px] font-black uppercase tracking-[0.3em] text-white/10">Banking Grade Security Protocols</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
