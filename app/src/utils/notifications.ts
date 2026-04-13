/**
 * Premium Notification Audio Utility
 * Synthesizes a high-end "iPhone-like" chime using Web Audio API
 * 
 * KEY DESIGN: We await audioContext.resume() before scheduling any notes,
 * because the context clock doesn't advance while suspended — so any notes
 * scheduled before resume() resolves are silently dropped by the browser.
 */

let audioContext: AudioContext | null = null;

const getContext = (): AudioContext => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

/**
 * Must be called SYNCHRONOUSLY inside a click/touch event handler to satisfy
 * browser autoplay policy. Creates and warms up the shared AudioContext.
 */
export const resumeAudioContext = () => {
    try {
        const ctx = getContext();
        if (ctx.state === 'suspended') {
            ctx.resume(); // fire-and-forget — just warming it up during a gesture
        }
    } catch (e) {
        console.warn('AudioContext resume failed:', e);
    }
};

const scheduleSound = (ctx: AudioContext, type: 'success' | 'error' | 'bell') => {
    const now = ctx.currentTime;

    if (type === 'success') {
        const playNote = (freq: number, startTime: number, duration: number, volume: number) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            g.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };
        playNote(880.00,   now,       0.35, 0.15); // A5
        playNote(1108.73,  now + 0.1, 0.35, 0.12); // C#6
        playNote(1318.51,  now + 0.2, 0.5,  0.10); // E6

    } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);

    } else {
        // 'bell' — Soft Glassy Ping
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.12, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
    }
};

export const playNotificationSound = async (type: 'success' | 'error' | 'bell' = 'success') => {
    try {
        const ctx = getContext();

        // ✅ CRITICAL: await resume() so the context clock is actually running
        // before we schedule any notes. Without this, notes are dropped silently.
        if (ctx.state !== 'running') {
            await ctx.resume();
        }

        scheduleSound(ctx, type);
    } catch (error) {
        console.warn('Audio playback failed:', error);
    }
};
