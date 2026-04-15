import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Message, Profile, Conversation } from '../types';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { NotificationExpert } from '../../../utils/NotificationExpert';

export const useChatMessaging = (currentUserId: string | undefined, activeConvo: Conversation | null) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const clearedAtRef = useRef<string | null>(null);
    const subscriptionRef = useRef<any>(null);

    // ─── Real-time Subscription ──────────────────────────────────────────────
    useEffect(() => {
        if (!activeConvo?.id || !currentUserId) return;

        // Clean up previous subscription
        if (subscriptionRef.current) {
            supabase.removeChannel(subscriptionRef.current);
        }

        const channel = supabase.channel(`room:${activeConvo.id}`)
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages', 
                    filter: `conversation_id=eq.${activeConvo.id}` 
                }, 
                payload => {
                    const newMsg = payload.new as Message;
                    // Only add if not already present (prevent duplicates)
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        subscriptionRef.current = channel;

        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
            }
        };
    }, [activeConvo?.id, currentUserId]);


    const playMessageSentSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.volume = 0.2;
        audio.play().catch(() => {});
    };

    const markMessagesAsDelivered = useCallback(async (convoId: string) => {
        if (!currentUserId) return;
        try {
            await supabase
                .from('messages')
                .update({ delivered_at: new Date().toISOString() })
                .eq('conversation_id', convoId)
                .neq('sender_id', currentUserId)
                .is('delivered_at', null);
        } catch (err) {
            console.error('Failed to mark as delivered:', err);
        }
    }, [currentUserId]);

    const loadMessages = useCallback(async (convoId: string) => {
        if (!currentUserId) return;

        try {
            const { data: participation } = await supabase
                .from('conversation_participants')
                .select('cleared_at')
                .eq('conversation_id', convoId)
                .eq('user_id', currentUserId)
                .maybeSingle();

            const clearedAt = participation?.cleared_at;
            clearedAtRef.current = clearedAt || null;

            let query = supabase
                .from('messages')
                .select('id, conversation_id, sender_id, content, type, media_url, media_duration, call_status, call_duration, call_type, caller_id, created_at, is_deleted, reply_to_id, is_pinned, deleted_for_users, delivered_at, read_at')
                .eq('conversation_id', convoId);

            if (clearedAt) query = query.gt('created_at', clearedAt);

            const { data: msgs, error } = await query
                .order('created_at', { ascending: true })
                .limit(100);

            if (error) throw error;

            if (msgs) {
                const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))];
                const replyIds = [...new Set(msgs.filter((m: any) => m.reply_to_id).map((m: any) => m.reply_to_id))];

                const [sendersRes, repliesRes, coachesRes] = await Promise.all([
                    supabase.from('profiles').select('id, full_name, role, avatar_url, last_seen, is_in_chat').in('id', senderIds),
                    replyIds.length > 0
                        ? supabase.from('messages').select('id, content, type, media_url, sender_id').in('id', replyIds)
                        : Promise.resolve({ data: [], error: null }),
                    supabase.from('coaches').select('profile_id, avatar_url').in('profile_id', senderIds)
                ]);

                const coachAvatarMap: Record<string, string> = {};
                (coachesRes.data || []).forEach((c: any) => { if (c.avatar_url) coachAvatarMap[c.profile_id] = c.avatar_url; });

                const senderMap: Record<string, Profile> = {};
                (sendersRes.data || []).forEach((s: any) => {
                    senderMap[s.id] = { ...s, avatar_url: s.avatar_url || coachAvatarMap[s.id] };
                });

                const replyMap: Record<string, Message> = {};
                (repliesRes.data || []).forEach((r: any) => replyMap[r.id] = r as Message);

                const enrichedMsgs = msgs
                    .filter((m: any) => !m.is_deleted && !(m.deleted_for_users || []).includes(currentUserId))
                    .filter((m: any) => !clearedAtRef.current || new Date(m.created_at) > new Date(clearedAtRef.current))
                    .map((m: any) => ({
                        ...m,
                        sender: senderMap[m.sender_id],
                        reply_to: m.reply_to_id ? replyMap[m.reply_to_id] : undefined
                    }));

                setMessages(enrichedMsgs as Message[]);
                markMessagesAsDelivered(convoId);
            }
        } catch (err) {
            console.error('Load messages error:', err);
            toast.error('Failed to load messages');
        }
    }, [currentUserId, markMessagesAsDelivered]);

    const sendMessage = async (text: string, replyToId?: string) => {
        if (!activeConvo || !currentUserId || !text.trim()) return false;
        setIsSending(true);
        try {
            const { error: msgError } = await supabase.from('messages').insert({
                conversation_id: activeConvo.id,
                sender_id: currentUserId,
                content: text.trim(),
                type: 'text',
                reply_to_id: replyToId
            });

            if (msgError) throw msgError;

            await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', activeConvo.id);

            playMessageSentSound();

            // 🛡️ BACKGROUND PUSH: Trigger server-side alert for offline recipients
            NotificationExpert.notifyReceiver(
                activeConvo.id,
                currentUserId,
                `رسالة جديدة: ${activeConvo.name || 'الأكاديمية'}`,
                text.length > 50 ? text.substring(0, 47) + '...' : text,
                `/app/communications?id=${activeConvo.id}`
            );

            return true;
        } catch (err) {
            toast.error('Failed to send message');
            return false;
        } finally {
            setIsSending(false);
        }
    };

    const sendMedia = async (files: (Blob | File)[]) => {
        if (!activeConvo || !currentUserId || files.length === 0) return;
        setIsUploading(true);
        try {
            const uploadedMedia: { url: string; size: number; type: string }[] = [];

            for (const file of files) {
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');
                const isAudio = file.type.startsWith('audio/');

                let finalFile: Blob | File = file;
                let ext = 'bin';

                if (isImage) {
                    finalFile = await imageCompression(file as File, { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true });
                    ext = 'jpg';
                } else if (isVideo) ext = 'mp4';
                else if (isAudio) ext = 'mp3';

                const path = `${currentUserId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, finalFile, {
                    upsert: true,
                    contentType: file.type
                });
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);

                let msgType = 'image';
                if (isVideo) msgType = 'video';
                else if (isAudio) msgType = 'audio';

                uploadedMedia.push({ url: publicUrl, size: finalFile.size, type: msgType });
            }

            const messagesToInsert = uploadedMedia.map(({ url, size, type }) => ({
                conversation_id: activeConvo.id,
                sender_id: currentUserId,
                type: type,
                media_url: url,
                media_size: size
            }));

            await supabase.from('messages').insert(messagesToInsert);
            await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo.id);
            playMessageSentSound();

            // 🛡️ BACKGROUND PUSH: Media Alert
            NotificationExpert.notifyReceiver(
                activeConvo.id,
                currentUserId,
                `وسائط جديدة: ${activeConvo.name || 'الأكاديمية'}`,
                `تم إرسال ${uploadedMedia.length} ملف(ات) وسائط`,
                `/app/communications?id=${activeConvo.id}`
            );
        } catch (err) {
            console.error('Send media error:', err);
            toast.error('Failed to send media');
        } finally {
            setIsUploading(false);
        }
    };

    const sendVoiceNote = async (blob: Blob, duration: number) => {
        if (!activeConvo || !currentUserId) return;
        try {
            const fileName = `voice_${Date.now()}.webm`;
            const path = `${currentUserId}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, blob, {
                contentType: 'audio/webm',
                upsert: true
            });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);

            await supabase.from('messages').insert({
                conversation_id: activeConvo.id,
                sender_id: currentUserId,
                type: 'voice',
                media_url: publicUrl,
                media_duration: duration
            });

            await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo.id);
            playMessageSentSound();

            // 🛡️ BACKGROUND PUSH: Voice Alert
            NotificationExpert.notifyReceiver(
                activeConvo.id,
                currentUserId,
                `رسالة صوتية: ${activeConvo.name || 'الأكاديمية'}`,
                `مقطع صوتي جديد (${Math.round(duration)} ثانية)`,
                `/app/communications?id=${activeConvo.id}`
            );
        } catch (err) {
            console.error('Send voice note error:', err);
            toast.error('Failed to send voice note');
        }
    };

    const togglePinMessage = async (msgId: string, isPinned: boolean) => {
        const { error } = await supabase.from('messages').update({ is_pinned: !isPinned }).eq('id', msgId);
        if (error) toast.error('Failed to update pin');
        else if (activeConvo) loadMessages(activeConvo.id);
    };

    return {
        messages,
        setMessages,
        isSending,
        isUploading,
        loadMessages,
        sendMessage,
        sendMedia,
        sendVoiceNote,
        togglePinMessage,
        clearedAtRef
    };
};
