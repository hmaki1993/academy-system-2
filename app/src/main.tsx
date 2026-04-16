import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 🚀 EXPERT V22: Stable Registration
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('🛡️ SW registered (Expert V22 Stable):', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}
