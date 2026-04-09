import React, { useState } from 'react';
import { DollarSign, Save, X, Zap, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { useLevelCosts, useUpdateLevelCost } from '../../../hooks/useData';
import { useCurrency } from '../../../context/CurrencyContext';

interface LevelPriceManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LevelPriceManager({ isOpen, onClose }: LevelPriceManagerProps) {
    const { data: levelCosts = [], isLoading } = useLevelCosts();
    const updatePriceMutation = useUpdateLevelCost();
    const { currency } = useCurrency();
    const [editingLevel, setEditingLevel] = useState<number | null>(null);
    const [tempPrice, setTempPrice] = useState<string>('');

    if (!isOpen) return null;

    const handleEdit = (level: number, currentPrice: number) => {
        setEditingLevel(level);
        setTempPrice(currentPrice.toString());
    };

    const handleSave = async (level: number) => {
        const price = parseFloat(tempPrice);
        if (isNaN(price)) return;

        await updatePriceMutation.mutateAsync({
            level_number: level,
            price: price
        });
        setEditingLevel(null);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
            
            <div className="relative w-full max-w-[500px] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <DollarSign className="text-primary w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter text-white">Price Management</h2>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Configure Level Access Costs</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors group">
                        <X size={20} className="text-white/20 group-hover:text-white transition-colors" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Loading rates...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {levelCosts.map((item: any) => (
                                <div 
                                    key={item.level_number}
                                    className={`group relative overflow-hidden p-5 rounded-2xl border transition-all duration-500 ${
                                        editingLevel === item.level_number 
                                        ? 'bg-primary/5 border-primary/40' 
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-xs font-black text-white/40">
                                                {item.level_number}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-tight">Level {item.level_number}</h4>
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Mastery Batch</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {editingLevel === item.level_number ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            value={tempPrice}
                                                            onChange={(e) => setTempPrice(e.target.value)}
                                                            autoFocus
                                                            className="w-24 bg-black border border-primary/50 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-primary h-10"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/20">{currency.code}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleSave(item.level_number)}
                                                        disabled={updatePriceMutation.isPending}
                                                        className="p-2.5 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                                    >
                                                        {updatePriceMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="text-lg font-black text-white tracking-tighter">
                                                            {Number(item.price).toLocaleString()}
                                                            <span className="text-[10px] ml-1 opacity-20">{currency.code}</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleEdit(item.level_number, item.price)}
                                                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:bg-primary/20 hover:text-primary hover:border-primary/20 transition-all active:scale-90"
                                                    >
                                                        <ArrowRight size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-0 mt-4">
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <ShieldCheck size={18} className="text-amber-500" />
                        </div>
                        <p className="text-[10px] font-bold text-white/40 leading-relaxed">
                            Changes take effect <span className="text-white">immediately</span> for all students. Ensure rates are verified before saving.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
