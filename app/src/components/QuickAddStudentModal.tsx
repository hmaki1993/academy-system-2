import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Phone, Copy, Check, ExternalLink, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface QuickAddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function QuickAddStudentModal({ isOpen, onClose, onSuccess }: QuickAddStudentModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Form, 2: Success/Link
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: ''
    });
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFormData({
                fullName: '',
                email: '',
                phone: ''
            });
            setGeneratedLink('');
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Insert Student Record
            const { data, error } = await supabase
                .from('students')
                .insert([{
                    full_name: formData.fullName,
                    email: formData.email,
                    parent_contact: formData.phone,
                    is_active: true
                }])
                .select('id')
                .single();

            if (error) throw error;

            // 2. Generate Registration Link
            const baseUrl = window.location.origin;
            const prefill = encodeURIComponent(JSON.stringify({
                full_name: formData.fullName,
                email: formData.email,
                student_id: data.id,
                role: 'student'
            }));
            const inviteUrl = `${baseUrl}/#/register?prefill=${prefill}`;
            setGeneratedLink(inviteUrl);
            
            // 3. Success
            setStep(2);
            toast.success('Gymnast Created Successfully!');
            onSuccess();

        } catch (err: any) {
            console.error('Quick Add error:', err);
            toast.error(err.message || 'Failed to create gymnast');
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Invite link copied!');
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                {/* Visual Header Decoration */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-accent" />

                <div className="p-8 pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <UserPlus size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter">Fast Onboarding</h2>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Create Gymnast Profile</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    {step === 1 ? (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Input: Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Gymnast Full Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary transition-all">
                                        <Sparkles size={16} />
                                    </div>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Enter full name"
                                        className="w-full bg-white/[0.03] border border-white/10 focus:border-primary/50 focus:bg-white/[0.05] rounded-2xl py-4 pl-14 pr-6 text-sm font-bold placeholder:text-white/10 outline-none transition-all"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Input: Email */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Parent/Student Email (Login)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary transition-all">
                                        <Mail size={16} />
                                    </div>
                                    <input 
                                        required
                                        type="email" 
                                        placeholder="example@gmail.com"
                                        className="w-full bg-white/[0.03] border border-white/10 focus:border-primary/50 focus:bg-white/[0.05] rounded-2xl py-4 pl-14 pr-6 text-sm font-bold placeholder:text-white/10 outline-none transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Input: Phone */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Contact Number</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary transition-all">
                                        <Phone size={16} />
                                    </div>
                                    <input 
                                        required
                                        type="tel" 
                                        placeholder="+965 XXXX XXXX"
                                        className="w-full bg-white/[0.03] border border-white/10 focus:border-primary/50 focus:bg-white/[0.05] rounded-2xl py-4 pl-14 pr-6 text-sm font-bold placeholder:text-white/10 outline-none transition-all"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Zap className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        <UserPlus size={16} />
                                        <span>Create & Generate Link</span>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-6 space-y-8 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                                <Check size={40} className="text-green-500" />
                            </div>
                            
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-1">Onboarding Link Ready</h3>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Share this link to setup the portal account</p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                                    <p className="text-[10px] font-black uppercase text-white/20 tracking-widest text-left ml-2">Private Invite URL</p>
                                    <div className="relative group">
                                        <input 
                                            readOnly 
                                            value={generatedLink} 
                                            className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-4 pr-12 text-[10px] font-mono text-white/60 outline-none"
                                        />
                                        <button 
                                            onClick={copyLink}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-all"
                                        >
                                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-white/40" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={onClose}
                                        className="py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                    >
                                        Done
                                    </button>
                                    <a 
                                        href={generatedLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                                    >
                                        <ExternalLink size={14} />
                                        Test Link
                                    </a>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4 text-left">
                                <ShieldCheck size={20} className="text-amber-500 shrink-0" />
                                <p className="text-[9px] font-bold text-amber-500/80 leading-relaxed uppercase tracking-wider">
                                    Important: Open in an **Incognito Window** if you want to complete the registration yourself without being logged out.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
