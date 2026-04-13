import { MessageSquare, Plus, Search, Loader2 } from 'lucide-react';
import { Conversation } from '../types';

interface ConversationListProps {
    conversations: Conversation[];
    isLoading: boolean;
    activeConvoId?: string;
    onSelect: (convo: Conversation) => void;
    onNewChat: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export function ConversationList({ 
    conversations, 
    isLoading, 
    activeConvoId, 
    onSelect, 
    onNewChat,
    searchQuery,
    setSearchQuery
}: ConversationListProps) {
    const filteredConversations = conversations.filter(c => {
        const name = c.type === 'direct' ? c.otherUser?.full_name : c.name;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-black text-white tracking-tight">Messages</h1>
                    </div>
                    <button 
                        onClick={onNewChat} 
                        className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-thin">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                    </div>
                ) : (
                    filteredConversations.map(convo => (
                        <button
                            key={convo.id}
                            onClick={() => onSelect(convo)}
                            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all group ${activeConvoId === convo.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                        >
                            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-black text-white overflow-hidden shadow-lg">
                                {convo.otherUser?.avatar_url ? (
                                    <img src={convo.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                                ) : (convo.otherUser?.full_name || 'U')[0]}
                                {convo.otherUser?.is_in_chat && (
                                    <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0E0E11]" />
                                )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-white font-bold truncate">{convo.otherUser?.full_name}</span>
                                    {convo.unreadCount > 0 && (
                                        <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                            {convo.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-white/30 text-xs truncate">
                                    {convo.lastMessage?.content || (convo.lastMessage?.type === 'image' ? 'Sent a photo' : 'No messages yet')}
                                </p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
