import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';

import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from './components/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy load pages for performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const StudentDetails = lazy(() => import('./pages/StudentDetails'));
const Coaches = lazy(() => import('./pages/Coaches'));
const CoachDetails = lazy(() => import('./pages/CoachDetails'));
const Finance = lazy(() => import('./pages/Finance'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Settings = lazy(() => import('./pages/Settings'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Login = lazy(() => import('./pages/Login'));

const Register = lazy(() => import('./pages/Register'));
const PublicRegistration = lazy(() => import('./pages/PublicRegistration'));
const StaffRegister = lazy(() => import('./pages/StaffRegister'));
const AdminCameras = lazy(() => import('./pages/AdminCameras'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const PersonalDashboard = lazy(() => import('./pages/PersonalDashboard'));
const StudentAttendance = lazy(() => import('./pages/StudentAttendance'));
const StaffAttendance = lazy(() => import('./pages/StaffAttendance'));
const PTAttendance = lazy(() => import('./pages/PTAttendance'));
const Evaluations = lazy(() => import('./pages/Evaluations'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Communications = lazy(() => import('./pages/Communications'));
const SmartTraining = lazy(() => import('./pages/SmartTraining'));

// Consultations
const ConsultationsAdmin = lazy(() => import('./pages/ConsultationsAdmin'));
const BookConsultation = lazy(() => import('./pages/BookConsultation'));

// Fame Academy Features
const VideoLibrary = lazy(() => import('./features/video-library/VideoLibrary'));
const PTAvailabilityAdmin = lazy(() => import('./features/zoom-pt/PTAvailabilityAdmin'));
const PTStudentBookings = lazy(() => import('./features/zoom-pt/PTStudentBookings'));

// Jump Rope Independent Layout & App
const JumpRopeLayout = lazy(() => import('./layouts/JumpRopeLayout'));
const JumpRopeLanding = lazy(() => import('./features/jump-rope/JumpRopeLanding'));
const JumpRopeHub = lazy(() => import('./features/jump-rope/JumpRopeHub'));
const JumpRopeTraining = lazy(() => import('./features/jump-rope/JumpRopeTraining'));
const JumpRopeLeaderboard = lazy(() => import('./features/jump-rope/JumpRopeLeaderboard'));
const JumpRopeHistory = lazy(() => import('./features/jump-rope/JumpRopeHistory'));
const JumpRopeSettings = lazy(() => import('./features/jump-rope/JumpRopeSettings'));
const JumpRopeAdmin = lazy(() => import('./features/jump-rope/JumpRopeAdmin'));
const StrategyHub = lazy(() => import('./pages/StrategyHub'));

import { initializeTheme } from './utils/theme';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CallProvider } from './context/CallContext';
import GlobalCallOverlay from './components/GlobalCallOverlay';
import NotificationSoundHandler from './components/NotificationSoundHandler';
import NotificationFixerOverlay from './components/NotificationFixerOverlay';

import BackButtonHandler from './components/BackButtonHandler';
import { PresenceProvider } from './context/PresenceContext';

// Premium Loading Fallback
const PageLoader = ({ name }: { name?: string }) => {
  const [displayName, setDisplayName] = useState(name);

  useEffect(() => {
    // Priority: 
    // 1. Explicit name (if not default)
    // 2. localStorage
    // 3. Fallback to default

    const saved = localStorage.getItem('gym_settings');
    let localName = '';
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.academy_name) localName = parsed.academy_name;
      } catch (e) { }
    }

    if (name && name !== 'Academy System') {
      setDisplayName(name);
    } else if (localName) {
      setDisplayName(localName);
    } else {
      setDisplayName(name || 'Academy System');
    }
  }, [name]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-24 h-24 mb-10">
        <div className="absolute inset-0 border-4 border-primary/10 rounded-[2rem] animate-pulse"></div>
        <div className="absolute inset-0 border-4 border-primary rounded-[2rem] border-t-transparent animate-spin duration-1000"></div>
        <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-xl animate-pulse"></div>
      </div>

      <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
        <div className="flex flex-col items-center gap-2 font-[var(--font-outfit)] uppercase leading-none mb-4">
            <span className="text-[32px] sm:text-[52px] font-black tracking-[0.2em] text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] italic">SKIPPY</span>
            <div className="flex items-center gap-4 mt-2">
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                <span className="text-[12px] sm:text-[14px] font-black tracking-[0.6em] text-primary">TOES Q8</span>
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>
        </div>
        <div className="overflow-hidden w-48 h-[1px] bg-white/5 relative mt-6">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
        </div>
        <p className="text-[9px] sm:text-[10px] font-black text-white/10 uppercase tracking-[0.8em] mt-8 animate-pulse italic">Intelligence Loading</p>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

function AppContent() {
  console.log('App: Rendering component');
  const { i18n } = useTranslation();
  const { settings, userProfile } = useTheme();

  useEffect(() => {
    if (i18n) {
      document.dir = i18n.dir();
      document.documentElement.lang = i18n.language;
    }
  }, [i18n, i18n?.language]);

  // ☢️ CACHE BREAKER: SW Update Detection
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available and will be used when all tabs are closed
                // But we want to FORCE it now for the Nuclear fix.
                console.log('☢️ CacheBreaker: New version detected. Force reloading...');
                toast.success("Strategic Update Received! Syncing...", { icon: '🚀' });
                setTimeout(() => window.location.reload(), 1500);
              }
            });
          }
        });
      });
    }
  }, []);

  return (
    <CallProvider currentUserId={userProfile?.id}>
      <Router>
        <GlobalCallOverlay />
        <NotificationSoundHandler />
        <NotificationFixerOverlay />
        <BackButtonHandler />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            className: 'premium-toast-vibrant',
            style: {
              color: '#fff',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '700',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: 'fit-content',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Suspense fallback={<PageLoader name={settings?.academy_name} />}>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/registration" element={<PublicRegistration />} />
            <Route path="/staff-register" element={<StaffRegister />} />
            <Route path="/book-consultation" element={<BookConsultation />} />

            {/* Jump Rope Standalone application route — own branded Suspense */}
            <Route path="/jump-rope/welcome" element={
              <Suspense fallback={
                <div className="min-h-[100dvh] bg-[#050510] flex flex-col items-center justify-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
                    <div className="absolute inset-0 border-2 border-blue-500 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <p className="text-blue-500/50 font-black tracking-[0.4em] text-[10px] uppercase">Jump Rope Pro</p>
                </div>
              }>
                <JumpRopeLanding />
              </Suspense>
            } />

            <Route path="/jump-rope" element={
              <Suspense fallback={
                <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
                    <div className="absolute inset-0 border-2 border-primary rounded-full border-t-transparent animate-spin" />
                  </div>
                  <p className="text-white/20 font-black tracking-[0.4em] text-[10px] uppercase">Jump Rope Pro</p>
                </div>
              }>
                <JumpRopeLayout />
              </Suspense>
            }>
              <Route index element={<JumpRopeHub />} />
              <Route path="training" element={<JumpRopeTraining />} />
              <Route path="leaderboard" element={<JumpRopeLeaderboard />} />
              <Route path="history" element={<JumpRopeHistory />} />
              <Route path="settings" element={<JumpRopeSettings />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="students" element={<Students />} />
                <Route path="students/:id" element={<StudentDetails />} />
                <Route path="coaches" element={<Coaches />} />
                <Route path="coaches/:id" element={<CoachDetails />} />
                <Route path="finance" element={<Finance />} />
                <Route path="calculator" element={<Calculator />} />

                <Route path="schedule" element={<Schedule />} />
                <Route path="settings" element={<Settings />} />
                <Route path="my-work" element={<PersonalDashboard />} />
                <Route path="admin/cameras" element={<AdminCameras />} />

                {/* Attendance Pages */}
                <Route path="attendance/students" element={<StudentAttendance />} />
                <Route path="attendance/staff" element={<StaffAttendance />} />
                <Route path="attendance/pt" element={<PTAttendance />} />
                <Route path="evaluations" element={<Evaluations />} />
                <Route path="communications" element={<Communications />} />
                <Route path="consultations" element={<ConsultationsAdmin />} />
                <Route path="smart-training" element={<SmartTraining />} />
                <Route path="strategy-hub" element={<StrategyHub />} />
                <Route path="book-consultation" element={<BookConsultation />} />
                
                {/* Fame Academy - New Features */}
                <Route path="video-library" element={<VideoLibrary />} />
                <Route path="pt-booking" element={<PTStudentBookings />} />
                <Route path="pt-availability" element={<PTAvailabilityAdmin />} />
                <Route path="pt-my-sessions" element={<PTStudentBookings />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </CallProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <ThemeProvider>
          <PresenceProvider>
            <AppContent />
          </PresenceProvider>
        </ThemeProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  )
}

export default App;
