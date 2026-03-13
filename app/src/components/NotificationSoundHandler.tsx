import { useEffect, useRef } from 'react';
import { useToaster } from 'react-hot-toast';
import { playNotificationSound } from '../utils/notifications';
import { useTheme } from '../context/ThemeContext';

/**
 * Global component that listens to react-hot-toast events
 * and plays sounds based on toast type changes.
 */
const NotificationSoundHandler = () => {
    const { toasts } = useToaster();
    const { settings } = useTheme();
    const playedToasts = useRef(new Set<string>());

    useEffect(() => {
        if (settings.notify_sounds === false) return;

        toasts.forEach(toast => {
            if (toast.visible && !playedToasts.current.has(toast.id)) {
                playedToasts.current.add(toast.id);

                if (toast.type === 'success') {
                    playNotificationSound('success');
                } else if (toast.type === 'error') {
                    playNotificationSound('error');
                } else {
                    playNotificationSound('bell');
                }
            }
        });

        // Cleanup stale IDs to keep memory clean
        const currentIds = new Set(toasts.map(t => t.id));
        playedToasts.current.forEach(id => {
            if (!currentIds.has(id)) {
                playedToasts.current.delete(id);
            }
        });
    }, [toasts]);

    return null; // Side-effect only component
};

export default NotificationSoundHandler;
