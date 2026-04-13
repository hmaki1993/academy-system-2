import React, { useState, useRef } from 'react';
import { 
    Check, CheckCheck, Reply, Pin, Video, Phone, PhoneMissed, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { Profile, Message } from '../types';

export const MessageBubble = ({
    msg, isOwn, currentUserId, onReply, onSelect, isSelected, isSelectionMode, onImageClick, onPin
}: {
    msg: Message; isOwn: boolean; currentUserId?: string;
    onReply?: (msg: Message) => void;
    onSelect?: (id: string) => void;
    isSelected?: boolean;
    isSelectionMode?: boolean;
    onImageClick?: (url: string) => void;
    onPin?: (msg: Message) => void;
}) => {
    const { t } = useTranslation();
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPressActive = useRef(false);
    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const handleStart = (clientX: number) => {
        startX.current = clientX;
        setIsDragging(true);
        isLongPressActive.current = false;
        if (!isSelectionMode) {
            pressTimer.current = setTimeout(() => {
                onSelect?.(msg.id);
                isLongPressActive.current = true;
            }, 500);
        }
    };

    const handleMove = (clientX: number) => {
        if (!isDragging) return;
        const delta = clientX - startX.current;
        if (Math.abs(delta) > 10 && pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
        const newX = Math.max(-60, Math.min(delta, 0));
        setDragX(newX);
    };

    const handleEnd = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
        if (dragX < -50) onReply?.(msg);
        setDragX(0);
        setIsDragging(false);
    };

    if (msg.type === 'call_event') {
        const isMissed = msg.call_status === 'missed';
        const isCaller = msg.caller_id === currentUserId;
        const label = isMissed 
            ? (isCaller ? t('communications.outgoingVoice') : t('communications.missedCall'))
            : (isCaller ? t('communications.outgoingVoice') : t('communications.incomingVoice'));
        const StatusIcon = isMissed ? (isCaller ? Phone : PhoneMissed) : Phone;

        return (
            <div className="flex items-center justify-center my-3 gap-3">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 text-white/50">
                        <StatusIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-white">{label}</span>
                            {isCaller ? <ArrowUpRight className="w-3 h-3 text-primary" /> : <ArrowDownLeft className="w-3 h-3 text-emerald-400" />}
                        </div>
                        <div className="text-[8px] font-black uppercase text-white/30 mt-1">{timeStr}</div>
                    </div>
                </div>
            </div>
        );
    }

    const bubbleRadius = isOwn ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm';

    return (
        <div className={`flex items-end gap-2 mb-4 group/bubble ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-7 h-7 flex-shrink-0">
                {!isOwn && msg.type !== 'voice' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-black text-white overflow-hidden shadow-sm">
                        {msg.sender?.avatar_url ? <img src={msg.sender.avatar_url} className="w-full h-full object-cover" /> : (msg.sender?.full_name?.[0] || '?')}
                    </div>
                )}
            </div>
            <div className={`relative max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                <div 
                    className="relative flex items-center transition-transform"
                    style={{ transform: `translateX(${dragX}px)` }}
                    onMouseDown={e => handleStart(e.clientX)}
                    onMouseMove={e => handleMove(e.clientX)}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={e => handleStart(e.touches[0].clientX)}
                    onTouchMove={e => handleMove(e.touches[0].clientX)}
                    onTouchEnd={handleEnd}
                >
                    {msg.type === 'text' && (
                        <div className={`px-4 py-2.5 text-sm leading-normal font-medium shadow-lg relative break-words [overflow-wrap:anywhere] break-all ${isOwn ? 'bg-gradient-to-br from-primary to-accent text-white' : 'bg-white/[0.06] text-white border border-white/10'} ${bubbleRadius}`}>
                            {msg.content}
                            {msg.is_pinned && (
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg transform rotate-12">
                                    <Pin className="w-2 h-2 text-white fill-current" />
                                </div>
                            )}
                        </div>
                    )}
                    {msg.type === 'image' && msg.media_url && (
                        <div className={`overflow-hidden shadow-xl max-w-[260px] relative cursor-pointer ${bubbleRadius}`} onClick={() => onImageClick?.(msg.media_url!)}>
                            <img src={msg.media_url} className="w-full h-auto object-cover" loading="lazy" />
                        </div>
                    )}
                    {msg.type === 'voice' && msg.media_url && (
                        <div className={`px-3 py-2 relative text-white backdrop-blur-xl border shadow-lg ${isOwn ? 'bg-primary/[0.08] border-primary/10' : 'bg-white/[0.05] border-white/8'} ${bubbleRadius}`}>
                            <VoiceNotePlayer url={msg.media_url} duration={msg.media_duration} sender={msg.sender} isOwn={isOwn} />
                        </div>
                    )}

                    {/* Quick Actions (Appear on hover) */}
                    <div className={`absolute top-0 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1`}>
                        {onPin && (
                            <button onClick={() => onPin(msg)} className="p-1.5 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all">
                                <Pin className={`w-3.5 h-3.5 ${msg.is_pinned ? 'fill-current text-yellow-500' : ''}`} />
                            </button>
                        )}
                        {onReply && (
                            <button onClick={() => onReply(msg)} className="p-1.5 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all">
                                <Reply className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
                    <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">{timeStr}</span>
                    {isOwn && (
                        <div className="flex items-center">
                            {msg.read_at ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5 text-white/40" />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
