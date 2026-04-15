import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </ErrorBoundary>
    </StrictMode>,
)

// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 🚀 EXPERT V6: Using versioned URL to force browser back-end cleanup
        navigator.serviceWorker.register('/sw.js?v=expert-v6').then(registration => {
            console.log('🛡️ SW registered with V6 profile:', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}
