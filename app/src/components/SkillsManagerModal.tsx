import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Award, CheckSquare, Square, Edit2, Check, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

interface SkillsManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SkillsManagerModal({ isOpen, onClose }: SkillsManagerModalProps) {
    const [skills, setSkills] = useState<any[]>([]);
    const [newSkillName, setNewSkillName] = useState('');
    const [maxScore, setMaxScore] = useState(10);
    const [loading, setLoading] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [skillToDelete, setSkillToDelete] = useState<number | null>(null);
    const [isBulkDelete, setIsBulkDelete] = useState(false);
    const [editingSkillId, setEditingSkillId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ name: '', max_score: 10 });

    useEffect(() => {
        if (isOpen) fetchSkills();
    }, [isOpen]);

    const fetchSkills = async () => {
        const { data, error } = await supabase
            .from('defined_skills')
            .select('*')
            .order('name');
        if (data) setSkills(data);
    };

    const handleAddSkill = async () => {
        if (!newSkillName.trim()) return;
        setLoading(true);
        const { error } = await supabase.from('defined_skills').insert({
            name: newSkillName,
            max_score: maxScore
        });

        if (!error) {
            toast.success('Skill added');
            setNewSkillName('');
            fetchSkills();
        } else {
            toast.error('Failed to add skill');
        }
        setLoading(false);
    };

    const handleDeleteClick = (id: number) => {
        setSkillToDelete(id);
        setIsBulkDelete(false);
        setShowDeleteConfirm(true);
    };

    const handleBulkDeleteClick = () => {
        setIsBulkDelete(true);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        const idsToDelete = isBulkDelete ? selectedSkills : (skillToDelete ? [skillToDelete] : []);
        if (idsToDelete.length === 0) return;

        const { error } = await supabase.from('defined_skills').delete().in('id', idsToDelete);

        if (!error) {
            toast.success(isBulkDelete ? `${idsToDelete.length} skills deleted` : 'Skill deleted');
            setSelectedSkills([]);
            setSkillToDelete(null);
            fetchSkills();
        } else {
            toast.error('Failed to delete skill(s)');
        }
    };

    const startEditing = (skill: any) => {
        setEditingSkillId(skill.id);
        setEditForm({ name: skill.name, max_score: skill.max_score });
    };

    const cancelEditing = () => {
        setEditingSkillId(null);
        setEditForm({ name: '', max_score: 10 });
    };

    const saveEdit = async () => {
        if (!editForm.name.trim() || !editingSkillId) return;

        const { error } = await supabase
            .from('defined_skills')
            .update({ name: editForm.name, max_score: editForm.max_score })
            .eq('id', editingSkillId);

        if (!error) {
            toast.success('Skill updated');
            setEditingSkillId(null);
            fetchSkills();
        } else {
            toast.error('Failed to update skill');
        }
    };

    const toggleSelectAll = () => {
        if (selectedSkills.length === skills.length) {
            setSelectedSkills([]);
        } else {
            setSelectedSkills(skills.map(s => s.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedSkills.includes(id)) {
            setSelectedSkills(selectedSkills.filter(s => s !== id));
        } else {
            setSelectedSkills([...selectedSkills, id]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[#0E1D21] border border-white/10 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                        <Award className="w-6 h-6 text-primary" />
                        Manage Skills
                    </h3>
                    <div className="flex items-center gap-2">
                        {selectedSkills.length > 0 && (
                            <button
                                onClick={handleBulkDeleteClick}
                                className="px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-rose-500 hover:text-white transition-all animate-in fade-in"
                            >
                                <Trash2 className="w-3 h-3" />
                                {selectedSkills.length} Selected
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-white/60" />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Skill Name</label>
                            <input
                                type="text"
                                value={newSkillName}
                                onChange={(e) => setNewSkillName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none"
                            />
                        </div>
                        <div className="w-24">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block text-center">Max Score</label>
                            <input
                                type="number"
                                value={maxScore}
                                onChange={(e) => setMaxScore(parseInt(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:border-primary/50 outline-none text-center"
                                min="1"
                            />
                        </div>
                        <button
                            onClick={handleAddSkill}
                            disabled={loading || !newSkillName}
                            className="bg-primary hover:bg-primary/90 text-white p-3 rounded-xl disabled:opacity-50 transition-colors mb-[1px]"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex items-center justify-between px-3 pb-2 border-b border-white/5">
                        <button
                            onClick={toggleSelectAll}
                            className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-2 transition-colors"
                        >
                            {selectedSkills.length === skills.length && skills.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            Select All
                        </button>
                        <span className="text-[10px] font-black w-24 text-center text-white/20">MAX SCORE</span>
                    </div>

                    {skills.length === 0 ? (
                        <div className="text-center py-8 text-white/20 text-sm">No skills defined yet</div>
                    ) : (
                        skills.map(skill => (
                            <div
                                key={skill.id}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${selectedSkills.includes(skill.id) ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                onClick={() => !editingSkillId && toggleSelect(skill.id)}
                            >
                                {editingSkillId === skill.id ? (
                                    <div className="flex items-center gap-2 w-full animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="flex-1 bg-black/20 border border-primary/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                                            autoFocus
                                        />
                                        <input
                                            type="number"
                                            value={editForm.max_score}
                                            onChange={(e) => setEditForm({ ...editForm, max_score: parseInt(e.target.value) })}
                                            className="w-16 bg-black/20 border border-primary/50 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none"
                                            min="1"
                                        />
                                        <button onClick={saveEdit} className="p-2 bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={cancelEditing} className="p-2 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white rounded-lg transition-colors">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`transition-colors ${selectedSkills.includes(skill.id) ? 'text-primary' : 'text-white/20 group-hover:text-white/40'}`}>
                                                {selectedSkills.includes(skill.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                            </div>
                                            <p className={`font-bold text-sm ${selectedSkills.includes(skill.id) ? 'text-white' : 'text-white/80'}`}>{skill.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-black text-white/40 bg-black/20 px-2 py-1 rounded w-12 text-center mr-2">{skill.max_score}</span>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditing(skill);
                                                }}
                                                className="p-2 hover:bg-blue-500/20 text-white/20 hover:text-blue-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick(skill.id);
                                                }}
                                                className="p-2 hover:bg-rose-500/20 text-white/20 hover:text-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <ConfirmModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={confirmDelete}
                    title={isBulkDelete ? `Delete ${selectedSkills.length} Skills?` : "Delete Skill?"}
                    message={isBulkDelete
                        ? "Are you sure you want to delete these skills? Note: Past assessment records will NOT be deleted, but these skills won't appear in new tests."
                        : "Are you sure you want to delete this skill? Past assessment records will NOT be deleted."}
                    confirmText="Yes, Delete"
                    type="danger"
                />
            </div>
        </div>
    );
}
