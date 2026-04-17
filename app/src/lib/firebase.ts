import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// 🔥 Firebase Config - Skippy Toes Q8
const firebaseConfig = {
  apiKey: "AIzaSyAI0B5eqfwRzQWG24gEs1t0w0RTdPt30Ss",
  authDomain: "skippy-toes-q8.firebaseapp.com",
  projectId: "skippy-toes-q8",
  storageBucket: "skippy-toes-q8.firebasestorage.app",
  messagingSenderId: "872245266489",
  appId: "1:872245266489:web:e64ff4b09d1c13adf4e5e8"
};

// FCM VAPID Key
export const FCM_VAPID_KEY = 'BL6RzD-N8SQO0fcKKKJ6wOde3cDPAG1zhQze4fE0c8GpOA5KJBqAhe19jN9zOYQAENFqTAkzOr59t9uTNSv1KiY';

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Initialize FCM Messaging
export const messaging = getMessaging(firebaseApp);

export { getToken, onMessage };
