// A simple Web Audio API synthesizer for app sound effects
// These imitate common chat app sounds (like WhatsApp)

let audioCtx: AudioContext | null = null;

const initAudio = () => {
    if (!audioCtx) {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

// Play a short double-beep for starting voice record
export const playRecordStartSound = () => {
    try {
        const ctx = initAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        // WhatsApp style short high double blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(800, now + 0.1);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
        gain.gain.setValueAtTime(0.5, now + 0.08);
        gain.gain.linearRampToValueAtTime(0, now + 0.1); // gap
        gain.gain.setValueAtTime(0.5, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {
        console.error("Audio error", e);
    }
};

// Play a satisfying pop/bloop for sending a message
export const playMessageSentSound = () => {
    try {
        const ctx = initAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        // A soft, low-to-high "plop"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.2);
    } catch (e) {
        console.error("Audio error", e);
    }
};

// Very subtle, quiet click for typing
export const playTypingTick = () => {
    try {
        const ctx = initAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Need a very short, high frequency tap (resembling a key press noise but softer)
        osc.type = 'triangle';
        const now = ctx.currentTime;

        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.02);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.015, now + 0.005); // Very quiet
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03);
    } catch (e) {
        // Ignore errors for rapid typing to avoid console spam
    }
};
