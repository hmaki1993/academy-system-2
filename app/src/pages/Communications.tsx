import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { MessageSquare } from 'lucide-react';

// Modular Components
import { MessageBubble } from '../features/communications/components/MessageBubble';
import { DeleteConfirmationModal } from '../features/communications/components/DeleteConfirmationModal';
import { ImageViewerModal } from '../features/communications/components/ImageViewerModal';
import { ConversationList } from '../features/communications/components/ConversationList';
import { ChatHeader } from '../features/communications/components/ChatHeader';
import { ChatInput } from '../features/communications/components/ChatInput';
import { NewChatModal } from '../features/communications/components/NewChatModal';

// Hooks
import { useChatConversations } from '../features/communications/hooks/useChatConversations';
import { useChatMessaging } from '../features/communications/hooks/useChatMessaging';
import { Message, Conversation, Profile } from '../features/communications/types';

export default function Communications() {
    const { userProfile } = useTheme();
    const currentUserId = userProfile?.id;

    // ─── State ──────────────────────────────────────────────────────────────────
    const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [imageToView, setImageToView] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

    // ─── Hooks ──────────────────────────────────────────────────────────────────
    const {
        conversations,
        allUsers,
        isLoading: isConvosLoading,
        loadConversations,
        startConversation,
        markAsRead,
        loadAllUsers
    } = useChatConversations(currentUserId, userProfile);

    const {
        messages,
        isSending,
        loadMessages,
        sendMessage,
        sendVoiceNote,
        togglePinMessage
    } = useChatMessaging(currentUserId, activeConvo);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ─── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (currentUserId) {
            loadConversations();
            loadAllUsers();
        }
    }, [currentUserId, loadConversations, loadAllUsers]);

    useEffect(() => {
        if (activeConvo) {
            loadMessages(activeConvo.id);
            markAsRead(activeConvo.id);
        }
    }, [activeConvo, loadMessages, markAsRead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ─── Handlers ───────────────────────────────────────────────────────────────
    const handleSendMessage = async (text: string) => {
        const success = await sendMessage(text, replyTo?.id);
        if (success) setReplyTo(null);
    };

    const handleSelectContact = async (user: Profile) => {
        const convo = await startConversation(user);
        if (convo) setActiveConvo(convo);
        setShowNewChat(false);
    };

    const groupedMessages = useMemo(() => {
        const result: Message[] = [];
        messages.forEach(msg => {
            const last = result[result.length - 1];
            if (last && last.type === 'call_event' && msg.type === 'call_event' && last.caller_id === msg.caller_id) {
                last.groupCount = (last.groupCount || 1) + 1;
            } else {
                result.push({ ...msg, groupCount: 1 });
            }
        });
        return result;
    }, [messages]);

    return (
        <div className="flex h-screen bg-[#0E0E11] overflow-hidden">
            {/* Sidebar */}
            <div className={`fixed inset-0 z-30 md:relative md:flex w-full md:w-[380px] lg:w-[420px] bg-[#0E0E11] border-r border-white/5 flex-col transition-transform duration-300 ${activeConvo ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
                <ConversationList 
                    conversations={conversations}
                    isLoading={isConvosLoading}
                    activeConvoId={activeConvo?.id}
                    onSelect={setActiveConvo}
                    onNewChat={() => setShowNewChat(true)}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />
            </div>

            {/* Chat Window */}
            <div className={`flex-1 flex flex-col bg-[#0F1115] relative transition-transform duration-300 ${activeConvo ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                {activeConvo ? (
                    <>
                        <ChatHeader 
                            activeConvo={activeConvo} 
                            onBack={() => setActiveConvo(null)} 
                        />

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-1 scrollbar-thin">
                            {groupedMessages.map(msg => (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    isOwn={msg.sender_id === currentUserId}
                                    onReply={setReplyTo}
                                    onPin={(m) => togglePinMessage(m.id, !!m.is_pinned)}
                                    onImageClick={setImageToView}
                                    currentUserId={currentUserId || undefined}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <ChatInput 
                            onSendMessage={handleSendMessage}
                            onSendVoiceNote={sendVoiceNote}
                            isSending={isSending}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                        <div className="w-32 h-32 rounded-[40px] bg-white/[0.02] border border-white/5 flex items-center justify-center">
                            <MessageSquare className="w-12 h-12 text-white/10" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-white font-black text-xl mb-2">Your Conversations</h3>
                            <p className="text-white/20 text-sm">Select a message from the sidebar to start chatting</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {imageToView && <ImageViewerModal url={imageToView} onClose={() => setImageToView(null)} />}
            
            {showDeleteModal && (
                <DeleteConfirmationModal 
                    count={selectedMessageIds.size} 
                    onCancel={() => setShowDeleteModal(false)} 
                    onDeleteForMe={() => {}} 
                    onDeleteForEveryone={() => {}} 
                    canDeleteForEveryone={true} 
                />
            )}
            
            {showNewChat && (
                <NewChatModal 
                    users={allUsers}
                    onSelect={handleSelectContact}
                    onClose={() => setShowNewChat(false)}
                />
            )}
        </div>
    );
}
