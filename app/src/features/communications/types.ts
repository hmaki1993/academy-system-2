export interface Profile {
    id: string;
    full_name: string;
    role: string;
    avatar_url?: string;
    last_seen?: string;
    is_in_chat?: boolean;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content?: string;
    type: 'text' | 'image' | 'voice' | 'video' | 'call_event';
    media_url?: string;
    media_duration?: number;
    call_status?: string;
    call_duration?: number;
    call_type?: 'audio' | 'video';
    caller_id?: string;
    created_at: string;
    sender?: Profile;
    reply_to_id?: string;
    groupCount?: number;
    reply_to?: Message;
    is_pinned?: boolean;
    is_deleted?: boolean;
    deleted_for_users?: string[];
    delivered_at?: string;
    read_at?: string;
}

export interface Conversation {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    avatar_url?: string;
    otherUser?: Profile;
    lastMessage?: Message;
    unreadCount: number;
    updated_at: string;
    is_hidden?: boolean;
    cleared_at?: string;
}
