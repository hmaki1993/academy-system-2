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
        <div className="p-4 bg-transparent backdrop-blur-3xl relative z-10">
            {replyTo && (
                <div className="mb-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between mx-2 max-w-5xl md:mx-auto animate-premium-up shadow-glass">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full bg-primary shadow-[0_0_10px_rgba(255,107,107,0.5)]" />
                        <div className="flex flex-col">
                            <span className="text-white/30 text-[10px] uppercase tracking-widest font-black">Replying to</span>
                            <p className="text-white/80 text-xs font-semibold truncate max-w-[200px] sm:max-w-md">
                                {replyTo.sender?.full_name}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onCancelReply} 
                        className="p-2 text-white/40 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <form 
                onSubmit={handleSubmit} 
                className="max-w-5xl mx-auto flex items-center gap-3 px-2 group"
            >
                <div 
                    ref={pillRef} 
                    className={`flex-1 flex items-center bg-white/[0.04] border border-white/5 rounded-[1.5rem] px-4 min-h-[50px] transition-all duration-300 shadow-glass group-focus-within:border-primary/20 group-focus-within:bg-white/[0.06] group-focus-within:shadow-[0_0_30px_rgba(255,107,107,0.08)]`}
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
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white text-[15px] py-3.5 resize-none scrollbar-none placeholder:text-white/20 placeholder:font-medium leading-relaxed"
                        onKeyDown={handleKeyDown}
                    />
                    
                    <div className="flex items-center gap-2 pl-2">
                        <VoiceRecorder 
                            onRecordingComplete={onSendVoiceNote} 
                            onRecordingStateChange={setIsVoiceRecording} 
                            portalTarget={pillRef.current} 
                        />
                    </div>
                </div>

                {text.trim() && (
                    <button 
                        type="submit" 
                        disabled={isSending} 
                        className="w-[50px] h-[50px] rounded-[1.5rem] bg-primary flex items-center justify-center text-white transition-all shadow-glow-primary hover:scale-105 active:scale-95 animate-premium-in group-focus-within:shadow-[0_0_20px_rgba(255,107,107,0.4)]"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 ml-0.5" />
                        )}
                    </button>
                )}
            </form>
        </div>
    );
}
