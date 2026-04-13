import { ArrowLeft } from 'lucide-react';
import { Conversation } from '../types';

interface ChatHeaderProps {
    activeConvo: Conversation;
    onBack: () => void;
}

export function ChatHeader({ activeConvo, onBack }: ChatHeaderProps) {
    return (
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-transparent backdrop-blur-3xl z-20">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onBack} 
                    className="md:hidden p-2 text-white/40 hover:text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center font-bold text-white text-sm overflow-hidden">
                    {activeConvo.otherUser?.avatar_url ? (
                        <img 
                            src={activeConvo.otherUser.avatar_url} 
                            className="w-full h-full object-cover" 
                            alt=""
                        />
                    ) : (
                        (activeConvo.otherUser?.full_name || 'U')[0]
                    )}
                </div>
                <div>
                    <h2 className="text-white font-black text-sm">
                        {activeConvo.otherUser?.full_name}
                    </h2>
                    <span className="text-white/30 text-[10px] uppercase font-black tracking-widest">
                        {activeConvo.otherUser?.is_in_chat ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
        </div>
    );
}
