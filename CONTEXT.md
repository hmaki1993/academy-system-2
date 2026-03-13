# 🏋️ Gymnastic System 2 - CONTEXT FILE
> هذا الملف مهم جداً - اقرأه أولاً قبل أي شيء

## 📁 Project Location
```
g:\my work\MyRestoredProjects\gymnastic-system-2\
```

## 🚀 How to Start the App
```bash
# Run this bat file to start the dev server:
g:\my work\MyRestoredProjects\gymnastic-system-2\start_healy_app.bat

# OR manually:
cd g:\my work\MyRestoredProjects\gymnastic-system-2\app
npm run dev

# App runs on: http://localhost:3000
```

## 🏗️ Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **Mobile:** Capacitor (Android/iOS)
- **Language:** Arabic + English (RTL support)

## 🌐 Supabase Config (from .env)
```
VITE_SUPABASE_URL=https://akbpfyjszuuwyraoalyf.supabase.co
```

## 📂 Main Source Structure
```
app/
├── src/
│   ├── App.tsx          # Main app with routing
│   ├── pages/           # All pages/screens
│   ├── components/      # Reusable components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API/Supabase calls
│   ├── context/         # React context (auth, etc.)
│   ├── layouts/         # Page layouts
│   └── i18n.ts          # Arabic/English translations
├── .env                 # Environment variables
├── package.json
└── vite.config.ts
```

## 👥 User Roles in the System
1. **Admin** - Full access to everything
2. **Coach (مدرب)** - View their students, mark attendance
3. **Reception (استقبال)** - Register students, payments
4. **PT (مدرب خاص)** - Personal training sessions

## 🔑 Key Features
- Student management (إدارة الطلاب)
- Attendance tracking (حضور وغياب)
- Payments & subscriptions (الدفع والاشتراكات)
- Coach management (إدارة المدربين)
- PT sessions (جلسات التدريب الشخصي)
- Finance reports (تقارير مالية)
- Gym settings & branding (إعدادات الجيم)
- Notifications system (الإشعارات)
- Groups management (إدارة المجموعات)

## ⚠️ Important Notes
- The app uses Arabic as primary language (RTL)
- Many SQL fix files in /app - these were used to fix DB issues, mostly done
- The main working branch is the current one
- Mobile app (Android/iOS) built with Capacitor

## 🛠️ Common Commands
```bash
npm run dev          # Start dev server
npm run build       # Build for production
npx cap run android  # Run on Android
```

## 📞 Quick Help
If something breaks, check:
1. Supabase connection (check .env file)
2. Run the latest SQL fix file if DB issue
3. Check browser console for errors
