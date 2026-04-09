import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * usePresence hook
 * Automatically updates the user's last_active_at timestamp in the profiles table
 * every 60 seconds while the application is mounted and active.
 */
export function usePresence() {
    useEffect(() => {
        let interval: any;

        const updatePresence = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    console.log('Presence: No user logged in');
                    return;
                }

                console.log('Presence: Updating for user', user.id);
                // Update last_active_at in the profiles table
                const { error } = await supabase
                    .from('profiles')
                    .update({ last_active_at: new Date().toISOString() })
                    .eq('id', user.id);
                
                if (error) {
                    console.error('Presence: Update error', error);
                } else {
                    console.log('Presence: Update successful');
                }
            } catch (err) {
                console.error('Failed to update presence:', err);
            }
        };

        // Run immediately on mount
        updatePresence();

        // Then run every 60 seconds
        interval = setInterval(updatePresence, 60000);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);
}
