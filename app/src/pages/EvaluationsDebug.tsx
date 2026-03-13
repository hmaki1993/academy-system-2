import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ClipboardCheck,
    History,
    FileText,
    LayoutDashboard,
    Search,
    Plus,
    Filter,
    Users,
    TrendingUp,
    CheckCircle2,
    Calendar,
    ArrowRight,
    Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

// Commenting out components to debug crash
// import BatchAssessmentModal from '../components/BatchAssessmentModal';
// import AssessmentHistoryModal from '../components/AssessmentHistoryModal';
// import BatchAssessmentDetailsModal from '../components/BatchAssessmentDetailsModal';
// import MonthlyReportModal from '../components/MonthlyReportModal';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function Evaluations() {
    const { t } = useTranslation();

    return (
        <div className="p-10 text-white">
            <h1 className="text-4xl font-black mb-4">DEBUG MODE</h1>
            <p>If you see this, the base Evaluations page is working.</p>
        </div>
    );
}
