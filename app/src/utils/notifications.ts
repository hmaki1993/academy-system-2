/**
 * Premium Notification Audio Utility
 * Synthesizes a high-end "iPhone-like" chime using Web Audio API
 */

let audioContext: AudioContext | null = null;

export const playNotificationSound = (type: 'success' | 'error' | 'bell' = 'success') => {
    try {
        // Initialize AudioContext on first interaction
        if (!audioContext) {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const now = audioContext.currentTime;

        if (type === 'success') {
            // Premium iPhone-like "Tri-tone" Chime (D6, A5, F#5 or similar)
            const playNote = (freq: number, startTime: number, duration: number, volume: number) => {
                const osc = audioContext!.createOscillator();
                const g = audioContext!.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                // Super fast attack for that "clicky" clean smartphone feel
                g.gain.setValueAtTime(0, startTime);
                g.gain.linearRampToValueAtTime(volume, startTime + 0.01);
                g.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                osc.connect(g);
                g.connect(audioContext!.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            // Classic Tri-tone Frequencies
            playNote(880.00, now, 0.35, 0.15); // A5
            playNote(1108.73, now + 0.1, 0.35, 0.12); // C#6
            playNote(1318.51, now + 0.2, 0.5, 0.1);   // E6

        } else if (type === 'error') {
            // Subtle Warning
            const osc = audioContext.createOscillator();
            const g = audioContext.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(330, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);

            g.gain.setValueAtTime(0.2, now);
            g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            osc.connect(g);
            g.connect(audioContext.destination);
            osc.start(now);
            osc.stop(now + 0.2);

        } else {
            // Soft Glassy Ping
            const osc = audioContext.createOscillator();
            const g = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now); // B5

            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.1, now + 0.03);
            g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            osc.connect(g);
            g.connect(audioContext.destination);
            osc.start(now);
            osc.stop(now + 0.4);
        }
    } catch (error) {
        console.warn('Audio playback failed:', error);
    }
};
