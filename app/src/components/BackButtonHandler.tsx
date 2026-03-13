import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

const BackButtonHandler = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const locationRef = useRef(location);

    // Keep ref updated with latest location
    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    useEffect(() => {
        let listenerHandle: any;

        const setupListener = async () => {
            listenerHandle = await CapacitorApp.addListener('backButton', () => {
                const currentPath = locationRef.current.pathname;

                // Define routes that should exit the app
                const exitRoutes = ['/', '/login'];

                if (exitRoutes.includes(currentPath)) {
                    CapacitorApp.exitApp();
                } else {
                    // Go back in history for all other routes
                    navigate(-1);
                }
            });
        };

        setupListener();

        // Cleanup listener on unmount
        return () => {
            if (listenerHandle) {
                listenerHandle.remove();
            }
        };
    }, [navigate]);

    return null; // This component doesn't render anything
};

export default BackButtonHandler;
