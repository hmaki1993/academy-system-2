import { X } from 'lucide-react';
import { Profile } from '../types';

interface NewChatModalProps {
    users: Profile[];
    onSelect: (user: Profile) => void;
    onClose: () => void;
}

export function NewChatModal({ users, onSelect, onClose }: NewChatModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#141920] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden animate-premium-up">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">Select Contact</h3>
                    <button onClick={onClose} className="p-2 text-white/40"><X className="w-5 h-5" /></button>
                </div>
                <div className="max-h-[400px] overflow-y-auto p-2">
                    {users.map(user => (
                        <button 
                            key={user.id} 
                            onClick={() => onSelect(user)} 
                            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all text-left"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center font-bold text-white overflow-hidden">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    user.full_name[0]
                                )}
                            </div>
                            <div>
                                <p className="text-white font-bold">{user.full_name}</p>
                                <p className="text-white/30 text-[10px] uppercase font-black">{user.role}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
