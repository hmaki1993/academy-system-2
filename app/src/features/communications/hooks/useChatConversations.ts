import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Conversation, Profile, Message } from '../types';
import toast from 'react-hot-toast';

export const useChatConversations = (currentUserId: string | undefined, userProfile: any) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [presenceState, setPresenceState] = useState<Record<string, any>>({});
    const [allUsers, setAllUsers] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // ─── Mark as Read ──────────────────────────────────────────────────────────
    const markAsRead = useCallback(async (convoId: string) => {
        if (!currentUserId) return;
        try {
            const { error: partError } = await supabase
                .from('conversation_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', convoId)
                .eq('user_id', currentUserId);
            
            if (partError) throw partError;

            await supabase
                .from('messages')
                .update({ read_at: new Date().toISOString() })
                .eq('conversation_id', convoId)
                .neq('sender_id', currentUserId)
                .is('read_at', null);

            setConversations(prev => prev.map((c: any) => c.id === convoId ? { ...c, unreadCount: 0 } : c));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    }, [currentUserId]);

    // ─── Load Conversations ──────────────────────────────────────────────────────
    const loadConversations = useCallback(async () => {
        if (!currentUserId) return;
        setIsLoading(true);

        try {
            const { data: participations, error: pErr } = await supabase
                .from('conversation_participants')
                .select('conversation_id, last_read_at, is_hidden, cleared_at')
                .eq('user_id', currentUserId);

            if (pErr) throw pErr;
            if (!participations?.length) {
                setConversations([]);
                return;
            }

            const convoIds = participations.map((p: any) => p.conversation_id);

            const { data: convos, error: cErr } = await supabase
                .from('conversations')
                .select('id, type, name, avatar_url, updated_at, created_by')
                .in('id', convoIds)
                .order('updated_at', { ascending: false });

            if (cErr) throw cErr;

            const { data: allParticipants } = await supabase
                .from('conversation_participants')
                .select('conversation_id, user_id')
                .in('conversation_id', convoIds);

            const allUserIds = [...new Set((allParticipants || []).map((p: any) => p.user_id))];
            
            const [profilesRes, coachesRes, lastMsgsRes, unreadMsgsRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, role, avatar_url, last_seen, is_in_chat').in('id', allUserIds),
                supabase.from('coaches').select('profile_id, avatar_url').in('profile_id', allUserIds),
                supabase.from('messages')
                    .select('id, conversation_id, sender_id, content, type, media_url, media_duration, call_status, call_duration, call_type, caller_id, created_at')
                    .in('conversation_id', convoIds)
                    .order('created_at', { ascending: false }),
                supabase.from('messages')
                    .select('conversation_id, id, created_at')
                    .in('conversation_id', convoIds)
                    .neq('sender_id', currentUserId)
                    .gt('created_at', new Date(Date.now() - 86400000 * 7).toISOString())
                    .is('read_at', null)
            ]);

            const coachAvatarMap: Record<string, string> = {};
            (coachesRes.data || []).forEach((c: any) => { if (c.avatar_url) coachAvatarMap[c.profile_id] = c.avatar_url; });

            const profileMap: Record<string, Profile> = {};
            (profilesRes.data || []).forEach((p: any) => {
                profileMap[p.id] = { ...p, avatar_url: p.avatar_url || coachAvatarMap[p.id] };
            });

            const seenDirectUsers = new Set<string>();
            const enriched = (convos || []).map((c: any) => {
                const myParticipation = (participations || []).find((p: any) => p.conversation_id === c.id);
                if (myParticipation?.is_hidden) return null;

                const myParticipantsForConvo = (allParticipants || []).filter((p: any) => p.conversation_id === c.id);
                const otherParticipant = myParticipantsForConvo.find((p: any) => p.user_id !== currentUserId);
                const otherUser = otherParticipant ? profileMap[otherParticipant.user_id] : undefined;

                if (c.type === 'direct' && otherUser) {
                    if (seenDirectUsers.has(otherUser.id)) return null;
                    seenDirectUsers.add(otherUser.id);
                }

                const lastMsg = (lastMsgsRes.data || []).find((m: any) => {
                    if (m.conversation_id !== c.id) return false;
                    if (myParticipation?.cleared_at && new Date(m.created_at) <= new Date(myParticipation.cleared_at)) return false;
                    return true;
                });

                const unread = (unreadMsgsRes.data || []).filter((m: any) => {
                    if (m.conversation_id !== c.id) return false;
                    if (myParticipation?.cleared_at && new Date(m.created_at) <= new Date(myParticipation.cleared_at)) return false;
                    if (myParticipation?.last_read_at && new Date(m.created_at) <= new Date(myParticipation.last_read_at)) return false;
                    return true;
                }).length;

                return {
                    ...c,
                    type: c.type as 'direct' | 'group',
                    otherUser,
                    lastMessage: lastMsg as Message | undefined,
                    unreadCount: unread,
                    is_hidden: myParticipation?.is_hidden,
                    cleared_at: myParticipation?.cleared_at
                } as Conversation;
            }).filter((c: any): c is Conversation => c !== null);

            setConversations(enriched);
        } catch (err) {
            console.error('[loadConversations] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId]);

    // ─── Start Conversation ──────────────────────────────────────────────────────
    const startConversation = useCallback(async (otherUser: Profile) => {
        if (!currentUserId) return null;

        const existing = conversations.find(c => c.type === 'direct' && c.otherUser?.id === otherUser.id);
        if (existing) return existing;

        try {
            const newConvoId = crypto.randomUUID();
            const now = new Date().toISOString();

            const { error: insertError } = await supabase
                .from('conversations')
                .insert({ id: newConvoId, type: 'direct', created_by: currentUserId, updated_at: now });

            if (insertError) throw insertError;

            await supabase
                .from('conversation_participants')
                .insert([
                    { conversation_id: newConvoId, user_id: currentUserId },
                    { conversation_id: newConvoId, user_id: otherUser.id }
                ]);

            const newConvo: Conversation = {
                id: newConvoId,
                type: 'direct',
                otherUser,
                unreadCount: 0,
                updated_at: now
            };

            setConversations(prev => [newConvo, ...prev]);
            return newConvo;
        } catch (err) {
            toast.error('Failed to start conversation');
            return null;
        }
    }, [currentUserId, conversations]);

    // ─── Delete/Clear Conversation ──────────────────────────────────────────────
    const deleteConversation = useCallback(async (convoId: string) => {
        const { error } = await supabase
            .from('conversation_participants')
            .update({ is_hidden: true })
            .eq('conversation_id', convoId)
            .eq('user_id', currentUserId);

        if (error) toast.error('Failed to hide chat');
        else setConversations(prev => prev.filter(c => c.id !== convoId));
    }, [currentUserId]);

    const clearConversation = useCallback(async (convoId: string) => {
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('conversation_participants')
            .update({ cleared_at: now, last_read_at: now })
            .eq('conversation_id', convoId)
            .eq('user_id', currentUserId);

        if (error) toast.error('Failed to clear chat');
        else {
            setConversations(prev => prev.map((c: any) => c.id === convoId ? {
                ...c,
                cleared_at: now,
                unreadCount: 0,
                lastMessage: undefined
            } : c));
        }
        return now;
    }, [currentUserId]);

    // ─── Load All Users ──────────────────────────────────────────────────────────
    const loadAllUsers = useCallback(async () => {
        if (!currentUserId) return;
        try {
            let query = supabase
                .from('profiles')
                .select('id, full_name, role, avatar_url, last_seen, is_in_chat')
                .neq('id', currentUserId);

            if (userProfile?.role === 'student') {
                query = query.in('role', ['admin', 'head_coach', 'coach']);
            }

            const { data: profiles } = await query;
            if (!profiles) return;

            const userIds = profiles.map((p: any) => p.id);
            const { data: coaches } = await supabase
                .from('coaches')
                .select('profile_id, avatar_url')
                .in('profile_id', userIds);

            const coachAvatarMap: Record<string, string> = {};
            (coaches || []).forEach((c: any) => { if (c.avatar_url) coachAvatarMap[c.profile_id] = c.avatar_url; });

            const enriched = profiles.map((p: any) => ({
                ...p,
                avatar_url: p.avatar_url || coachAvatarMap[p.id]
            }));

            setAllUsers(enriched);
        } catch (err) {
            console.error('Error loading users:', err);
        }
    }, [currentUserId, userProfile]);

    // ─── Presence & Visiblity Effects ─────────────────────────────────────────────
    useEffect(() => {
        if (!currentUserId) return;

        const setInChat = async (status: boolean) => {
            await supabase.from('profiles').update({
                is_in_chat: status,
                last_seen: new Date().toISOString()
            }).eq('id', currentUserId);
        };

        setInChat(true);

        const handleVisibilityChange = () => setInChat(document.visibilityState === 'visible');
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', () => setInChat(false));

        return () => {
            setInChat(false);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', () => setInChat(false));
        };
    }, [currentUserId]);

    return {
        conversations,
        setConversations,
        presenceState,
        setPresenceState,
        allUsers,
        isLoading,
        loadConversations,
        startConversation,
        deleteConversation,
        clearConversation,
        markAsRead,
        loadAllUsers
    };
};
