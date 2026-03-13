import { useState, useEffect } from 'react';
import { X, Plus, Save, Settings, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import SkillsManagerModal from './SkillsManagerModal';
import PremiumSelect from './PremiumSelect';

interface AddAssessmentModalProps {
    studentId: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddAssessmentModal({ studentId, isOpen, onClose, onSuccess }: AddAssessmentModalProps) {
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [availableSkills, setAvailableSkills] = useState<any[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<any[]>([]); // { skill_id, score, name, max_score }
    const [showSkillsManager, setShowSkillsManager] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSkills();
            setTitle('');
            setSelectedSkills([]);
        }
    }, [isOpen]);

    // Re-fetch skills when manager closes in case new ones were added
    useEffect(() => {
        if (!showSkillsManager) fetchSkills();
    }, [showSkillsManager]);

    const fetchSkills = async () => {
        const { data } = await supabase.from('defined_skills').select('*').order('name');
        if (data) setAvailableSkills(data);
    };

    const addSkillRow = () => {
        setSelectedSkills([...selectedSkills, { skill_id: '', score: 0, name: '', max_score: 10 }]);
    };

    const updateRow = (index: number, field: string, value: any) => {
        const newSkills = [...selectedSkills];
        if (field === 'skill_id') {
            const skill = availableSkills.find(s => s.id === parseInt(value));
            newSkills[index] = {
                ...newSkills[index],
                skill_id: value,
                name: skill?.name || '',
                max_score: skill?.max_score || 10,
                score: 0 // reset score on skill change
            };
        } else {
            newSkills[index] = { ...newSkills[index], [field]: value };
        }
        setSelectedSkills(newSkills);
    };

    const removeRow = (index: number) => {
        setSelectedSkills(selectedSkills.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!title.trim()) return toast.error('Enter a title');
        if (selectedSkills.length === 0) return toast.error('Add at least one skill');

        // Validation check
        const invalid = selectedSkills.find(s => !s.skill_id);
        if (invalid) return toast.error('Please select a skill for all rows');

        setLoading(true);
        const totalScore = selectedSkills.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);

        const { error } = await supabase.from('skill_assessments').insert({
            student_id: studentId,
            title,
            skills: selectedSkills,
            total_score: totalScore,
            coach_id: (await supabase.auth.getUser()).data.user?.id
        });

        if (!error) {
            toast.success('Assessment saved');
            onSuccess();
            onClose();
        } else {
            toast.error('Failed to save assessment');
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Neutral Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={onClose}
            />

            <div className="w-full max-w-2xl bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative flex flex-col max-h-[90vh]">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-8 pt-10 pb-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight">
                                New Assessment
                            </h2>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                Record skill scores
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowSkillsManager(true)}
                                className="p-3 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-primary hover:border-primary/40 transition-all active:scale-95"
                                title="Manage Skills"
                            >
                                <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white transition-all border border-white/5 active:scale-90"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Form Body */}
                <div className="relative z-10 px-8 py-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">

                    {/* Title Input */}
                    <div className="space-y-3 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Assessment Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Monthly Level 1 Evaluation..."
                            className="w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold tracking-wide"
                        />
                    </div>

                    {/* Skills Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Skills</label>
                            <div className="h-px bg-white/5 flex-1 mx-4"></div>
                        </div>

                        <div className="space-y-4">
                            {selectedSkills.map((row, index) => (
                                <div key={index} className="group/row flex gap-4 items-center p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-[2rem] transition-all duration-500 animate-in slide-in-from-right-4">
                                    <div className="flex-1 relative">
                                        <PremiumSelect
                                            value={row.skill_id}
                                            onChange={val => updateRow(index, 'skill_id', val)}
                                            options={[
                                                { value: "", label: "Select Skill" },
                                                ...availableSkills.map(s => ({ value: s.id.toString(), label: `${s.name} (Max ${s.max_score})` }))
                                            ]}
                                            placeholder="Choose Skill"
                                        />
                                    </div>

                                    <div className="w-28 relative">
                                        <input
                                            type="number"
                                            value={row.score}
                                            onChange={(e) => updateRow(index, 'score', parseFloat(e.target.value))}
                                            className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white text-center text-[10px] font-bold"
                                            min="0"
                                            max={row.max_score}
                                        />
                                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-white/20 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/row:opacity-100 transition-opacity">
                                            Max: {row.max_score}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => removeRow(index)}
                                        className="p-3 text-white/10 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                                        title="Remove Skill"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={addSkillRow}
                                className="w-full py-5 border border-dashed border-white/5 hover:border-white/20 rounded-[2rem] bg-white/[0.01] hover:bg-white/[0.03] text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Skill
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Section - Single Premium Button */}
                <div className="relative z-10 px-8 py-8 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 whitespace-nowrap"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-4 rounded-3xl bg-white text-black hover:bg-white/90 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Processing...</span>
                        ) : (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] group-hover:tracking-[0.5em] transition-all duration-500">
                                Save Assessment
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <SkillsManagerModal
                isOpen={showSkillsManager}
                onClose={() => setShowSkillsManager(false)}
            />
        </div>
    );
}
