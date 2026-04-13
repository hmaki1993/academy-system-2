import React, { createContext, useContext } from 'react';
import { usePresence } from '../hooks/usePresence.tsx';
import { useTheme } from '../context/ThemeContext';

interface PresenceContextType {
    onlineUsers: any[];
    onlineCount: number;
    onlineStudents: any[];
    connectionStatus: string;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userProfile, settings } = useTheme();
    
    const presence = usePresence({
        currentUserId: userProfile?.id,
        userRole: userProfile?.role,
        notifySounds: settings?.notify_sounds !== false
    });

    return (
        <PresenceContext.Provider value={presence}>
            {children}
        </PresenceContext.Provider>
    );
};

export const usePresenceContext = () => {
    const context = useContext(PresenceContext);
    if (context === undefined) {
        throw new Error('usePresenceContext must be used within a PresenceProvider');
    }
    return context;
};
