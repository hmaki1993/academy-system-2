import React, { useState, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Message } from '../types';
import { VoiceRecorder } from './VoiceRecorder';
import { playTypingTick } from '../../../utils/sounds';

interface ChatInputProps {
    onSendMessage: (text: string) => void;
    onSendVoiceNote: (blob: Blob, duration: number) => void;
    isSending: boolean;
    replyTo: Message | null;
    onCancelReply: () => void;
}

export function ChatInput({ 
    onSendMessage, 
    onSendVoiceNote, 
    isSending, 
    replyTo, 
    onCancelReply 
}: ChatInputProps) {
    const [text, setText] = useState('');
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pillRef = useRef<HTMLDivElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!text.trim()) return;
        onSendMessage(text);
        setText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="p-4 bg-transparent backdrop-blur-3xl">
            {replyTo && (
                <div className="mb-3 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between mx-2 max-w-5xl md:mx-auto animate-premium-up">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full bg-primary" />
                        <p className="text-white/50 text-xs truncate">
                            Replying to {replyTo.sender?.full_name}
                        </p>
                    </div>
                    <button 
                        onClick={onCancelReply} 
                        className="p-2 text-white/40"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <form 
                onSubmit={handleSubmit} 
                className="max-w-5xl mx-auto flex items-end gap-3 px-2"
            >
                <div 
                    ref={pillRef} 
                    className="flex-1 flex items-center bg-white/[0.03] border border-white/5 rounded-full px-4 min-h-[44px]"
                >
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => { 
                            setText(e.target.value); 
                            if (e.target.value.length > text.length) playTypingTick(); 
                        }}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white text-sm py-3 resize-none scrollbar-none"
                        onKeyDown={handleKeyDown}
                    />
                    <VoiceRecorder 
                        onRecordingComplete={onSendVoiceNote} 
                        onRecordingStateChange={setIsVoiceRecording} 
                        portalTarget={pillRef.current} 
                    />
                </div>
                {text.trim() && (
                    <button 
                        type="submit" 
                        disabled={isSending} 
                        className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white transition-all shadow-lg shadow-primary/20 hover:scale-110 active:scale-95"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                )}
            </form>
        </div>
    );
}
